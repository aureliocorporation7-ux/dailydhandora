// Load environment variables
if (process.env.CI) {
  require('dotenv').config({ path: '.env' });
} else {
  require('dotenv').config({ path: '.env.local' });
}


require('dotenv').config({ path: '.env.local' });
const Parser = require('rss-parser');
const { FieldValue } = require('firebase-admin/firestore');
const firebase = require('../lib/firebase');
const gemini = require('../lib/gemini');

/**
 * Fetches image from Pixabay API based on keyword
 * @param {string} keyword - Search keyword (e.g., "cricket", "politics")
 * @returns {Promise<string|null>} - Image URL or null
 */
async function getImageFromPixabay(keyword) {
  try {
    const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY || '47648127-c33c7c87d0f32d9bb2ad51d43';
    const url = `https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(keyword)}&image_type=photo&per_page=3&safesearch=true&orientation=horizontal`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`  ⚠️  Pixabay API error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    if (data.hits && data.hits.length > 0) {
      console.log(`  🎨 Image: Pixabay (${keyword})`);
      // Pick a random image from the results to ensure variety
      const randomImage = data.hits[Math.floor(Math.random() * data.hits.length)];
      // Use larger image for better quality (1280px instead of 640px)
      return randomImage.largeImageURL || randomImage.webformatURL;
    }
    
    console.log(`  ⚠️  No Pixabay images found for: ${keyword}`);
    return null;
  } catch (error) {
    console.error(`  ❌ Pixabay error:`, error.message);
    return null;
  }
}

/**
 * Try multiple related keywords if primary fails
 */
async function getImageWithFallbacks(keyword, category) {
  // Try primary keyword first
  let imageUrl = await getImageFromPixabay(keyword);
  if (imageUrl) {
    console.log(`  🎨 Image: Pixabay (${keyword})`);
    return imageUrl;
  }
  
  // Fallback keyword map
  const fallbacks = {
    'Politics': ['government', 'parliament', 'politics'],
    'Technology': ['technology', 'smartphone', 'computer'],
    'Sports': ['sports', 'cricket', 'stadium'],
    'Entertainment': ['cinema', 'bollywood', 'movie'],
    'Business': ['business', 'stock-market', 'finance']
  };
  
  const keywords = fallbacks[category] || ['news', 'india'];
  
  for (const fallbackKeyword of keywords) {
    if (fallbackKeyword === keyword) continue; // Skip already tried
    imageUrl = await getImageFromPixabay(fallbackKeyword);
    if (imageUrl) {
      console.log(`  🎨 Image: Pixabay (${fallbackKeyword} - fallback)`);
      return imageUrl;
    }
  }
  
  console.log(`  ⚠️  Pixabay: No images found, using placeholder`);
  return null;
}

/**
 * Validate image URL is accessible
 */
async function validateImageUrl(url) {
  if (!url) return false;
  
  try {
    const response = await fetch(url, { method: 'HEAD', timeout: 5000 });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Extracts image URL from RSS feed item
 * Supports multiple RSS image formats and Google News specific patterns
 * @param {Object} item - RSS parser item object
 * @returns {string|null} - Image URL or null if not found
 */
const RSS_FEEDS = [
  'https://news.google.com/rss/search?q=when:24h+allinurl:timesofindia.com&ceid=IN:en&hl=en-IN',
  'https://news.google.com/rss/topics/CAAqJQgKIh9DQkFTRVFvSUwyMHZNRFZ4ZERBU0JXVnVMVWRDS0FBUAE?ceid=IN:en&hl=en-IN'
];

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'media:content'],
      ['media:thumbnail', 'media:thumbnail'],
    ]
  }
});

let processedCount = 0;
let errorCount = 0;

async function runBot() {
  console.log('🤖 Starting DailyDhandora News Bot at:', new Date().toISOString());

  try {

    for (const feedUrl of RSS_FEEDS) {
      console.log(`
📡 Fetching RSS feed: ${feedUrl}`);
      
      try {
        const feed = await parser.parseURL(feedUrl);
        console.log(`✅ Found ${feed.items.length} articles in feed`);

        const itemsToProcess = feed.items.slice(0, 5); // Process only top 5 for now

        for (const item of itemsToProcess) {
          await processArticle(item);
          await sleep(2000); // Wait 2 seconds between articles
        }
      } catch (feedError) {
        console.error(`❌ Error processing feed ${feedUrl}:`, feedError.message);
        errorCount++;
        continue;
      }
    }

    console.log('\n✅ Bot execution completed!');
    console.log(`📊 Stats: ${processedCount} processed, ${errorCount} errors`);
  } catch (error) {
    console.error('🔥 Fatal error:', error);
    process.exit(1);
  }
}

async function checkDuplicate(headline, sourceUrl) {
  console.log('  🔎 Checking for duplicates...');
  const articlesRef = firebase.db.collection('articles');
  
  // Check 1: Match by source URL (most reliable)
  const urlSnapshot = await articlesRef.where('sourceUrl', '==', sourceUrl).limit(1).get();
  if (!urlSnapshot.empty) {
    return true;
  }

  // Check 2: Match by exact headline
  const headlineSnapshot = await articlesRef.where('title', '==', headline).limit(1).get();
  if (!headlineSnapshot.empty) {
    return true;
  }

  return false;
}

async function processArticle(item) {
  const headline = item.title;
  const sourceUrl = item.link;
  const sourceTitle = headline;

  const preview = headline.length > 60 ? `${headline.substring(0, 60)}...` : headline;
  console.log(`
📰 Processing: "${preview}"`);

  try {
    const isDuplicate = await checkDuplicate(headline, sourceUrl);
    if (isDuplicate) {
      console.log('  ⏩ Skipped: Duplicate detected in Firestore.');
      return;
    }

    console.log('  🤖 Generating AI content...');
    // Single attempt with smart model selection (no manual retries)
    const articleData = await gemini.generateArticle(headline, sourceUrl);

    // Safety: Extract keyword from category if AI didn't provide
    if (!articleData.imageKeyword) {
      const categoryKeywords = {
        'Politics': 'government',
        'Technology': 'technology',
        'Sports': 'sports',
        'Entertainment': 'cinema',
        'Business': 'business',
      };
      articleData.imageKeyword = categoryKeywords[articleData.category] || 'news';
    }

    // IMAGE FALLBACK STRATEGY
    let finalImageUrl = null;
    if (articleData.imageKeyword) {
      finalImageUrl = await getImageWithFallbacks(
        articleData.imageKeyword, 
        articleData.category
      );
    }

    // Validate image URL before saving
    if (finalImageUrl) {
      const isValid = await validateImageUrl(finalImageUrl);
      if (!isValid) {
        console.log(`  ⚠️  Image URL invalid, using category fallback`);
        const categoryImages = {
          'Politics': 'https://placehold.co/800x600/262626/f5f5f5?text=Politics',
          'Technology': 'https://placehold.co/800x600/262626/f5f5f5?text=Technology',
          'Sports': 'https://placehold.co/800x600/262626/f5f5f5?text=Sports',
          'Entertainment': 'https://placehold.co/800x600/262626/f5f5f5?text=Entertainment',
          'Business': 'https://placehold.co/800x600/262626/f5f5f5?text=Business',
        };
        finalImageUrl = categoryImages[articleData.category] || 'https://placehold.co/800x600/262626/f5f5f5?text=News';
      }
    }

    // Fallback to placeholder images if still no image
    if (!finalImageUrl) {
      const categoryImages = {
        'Politics': 'https://placehold.co/800x600/262626/f5f5f5?text=Politics',
        'Technology': 'https://placehold.co/800x600/262626/f5f5f5?text=Technology',
        'Sports': 'https://placehold.co/800x600/262626/f5f5f5?text=Sports',
        'Entertainment': 'https://placehold.co/800x600/262626/f5f5f5?text=Entertainment',
        'Business': 'https://placehold.co/800x600/262626/f5f5f5?text=Business',
      };
      finalImageUrl = categoryImages[articleData.category] || 'https://placehold.co/800x600/262626/f5f5f5?text=News';
      console.log(`  🎨 Image: Category fallback (${articleData.category})`);
    }

    // Save to Firestore
    const dataToSave = {
      title: articleData.title,
      slug: articleData.slug,
      summary: articleData.summary,
      content: articleData.content,
      tags: articleData.tags || [],
      category: articleData.category,
      sourceUrl: sourceUrl,
      sourceTitle: sourceTitle,
      imageUrl: finalImageUrl,
      imageKeyword: articleData.imageKeyword || null,
      createdAt: FieldValue.serverTimestamp(),
      views: 0
    };

    const db = firebase.db; // Correctly reference the exported db object
    const docRef = await db.collection('articles').add(dataToSave);
    console.log(`✅ Saved: ${articleData.title.substring(0, 60)}...`);
    console.log(`   ID: ${docRef.id}`);
    processedCount++;
  } catch (error) {
    console.error(`  ❌ Failed: ${error.message}`);
    errorCount++;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

runBot().catch(console.error);

module.exports = { getImageWithFallbacks };
