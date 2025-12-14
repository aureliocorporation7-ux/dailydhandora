// scripts/cleanup-images.js
require('dotenv').config({ path: '.env.local' });

const { db } = require('../lib/firebase');
const axios = require('axios');

const PIXABAY_KEY = process.env.PIXABAY_API_KEY || '47648127-c33c7c87d0f32d9bb2ad51d43';
let updatedCount = 0;
let checkedCount = 0;

async function getImageFromPixabay(keyword) {
  if (!keyword) return null;
  try {
    const url = `https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${encodeURIComponent(keyword)}&image_type=photo&per_page=5&safesearch=true&orientation=horizontal`;
    const response = await axios.get(url);
    if (response.data.hits && response.data.hits.length > 0) {
      const randomImage = response.data.hits[Math.floor(Math.random() * response.data.hits.length)];
      return randomImage.largeImageURL || randomImage.webformatURL;
    }
    return null;
  } catch (error) {
    console.error(`  ❌ Pixabay API error for keyword "${keyword}":`, error.message);
    return null;
  }
}

async function getReplacementImage(article) {
  const keywords = [
    ...(article.tags || []),
    article.category,
    'news' // final fallback
  ].filter(Boolean); // remove any null/undefined values

  for (const keyword of new Set(keywords)) {
    const imageUrl = await getImageFromPixabay(keyword);
    if (imageUrl) {
      console.log(`  🎨 Found replacement image for article ${article.id} with keyword: ${keyword}`);
      return imageUrl;
    }
  }
  return null; // No image found
}

async function cleanupImages() {
  console.log('🧹 Starting image cleanup process...');
  const articlesRef = db.collection('articles');
  const snapshot = await articlesRef.get();

  if (snapshot.empty) {
    console.log('No articles found.');
    return;
  }

  const articlesToUpdate = [];
  snapshot.forEach(doc => {
    checkedCount++;
    const article = doc.data();
    if (article.imageUrl && article.imageUrl.includes('pollinations.ai')) {
      articlesToUpdate.push({ id: doc.id, ...article });
    }
  });

  if (articlesToUpdate.length === 0) {
    console.log(`✅ All ${checkedCount} articles checked. No outdated 'pollinations.ai' images found.`);
    return;
  }

  console.log(`Found ${articlesToUpdate.length} articles with outdated images. Starting replacement process...`);

  for (const article of articlesToUpdate) {
    console.log(`
Processing article: ${article.headline.substring(0, 50)}... (ID: ${article.id})`);
    const replacementUrl = await getReplacementImage(article);

    if (replacementUrl) {
      try {
        await articlesRef.doc(article.id).update({ imageUrl: replacementUrl });
        console.log(`  ✅ Successfully updated image for article ${article.id}`);
        updatedCount++;
      } catch (error) {
        console.error(`  ❌ Failed to update article ${article.id}:`, error.message);
      }
    } else {
      console.log(`  ⚠️  Could not find a replacement image for article ${article.id}. Skipping.`);
    }
    // Add a small delay to avoid hitting API rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`

✨ Cleanup finished!`);
  console.log(`📊 Stats:`);
  console.log(`   - Checked: ${checkedCount} articles`);
  console.log(`   - Found outdated: ${articlesToUpdate.length} articles`);
  console.log(`   - Successfully updated: ${updatedCount} articles`);
}

cleanupImages().catch(error => {
  console.error('🔥 A critical error occurred during the cleanup process:', error);
  process.exit(1);
});
