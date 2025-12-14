// scripts/run-bot.js
if (process.env.CI) {
  require('dotenv').config({ path: '.env' });
} else {
  require('dotenv').config({ path: '.env.local', override: true });
}

const { db, admin } = require('../lib/firebase');
const Parser = require('rss-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');
const axios = require('axios');
const { HfInference } = require('@huggingface/inference');
const FormData = require('form-data');
const fs = require('fs');

const LOCAL_PLACEHOLDER_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

// Initialize Clients
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const groq = new Groq({ apiKey: process.env.GOD_API_KEY });
const hf = new HfInference(process.env.HUGGINGTOCK);
const IMGBB_KEY = process.env.IMGBB;

const RSS_FEEDS = [
  'https://news.google.com/rss/search?q=when:24h+allinurl:timesofindia.com&ceid=IN:en&hl=en-IN',
  'https://news.google.com/rss/topics/CAAqJQgKIh9DQkFTRVFvSUwyMHZNRFZ4ZERBU0JXVnVMVWRDS0FBUAE?ceid=IN:en&hl=en-IN'
];

const SYSTEM_PROMPT = `
You are a Viral News Editor for a top-tier Indian news portal, known for your ability to write compelling headlines and engaging stories that people love to read and share.
Your primary goal is to maximize reader engagement (CTR) by creating a sense of curiosity and urgency, without resorting to repetitive or generic clickbait.

### OUTPUT FORMAT:
Strictly JSON only.

### TASKS:

1. **HEADLINE (Hindi - THE ART OF THE CLICK):**
   - **Goal:** Create a unique, powerful headline that stops the scroll. It should feel urgent and important.
   - **Technique:** Use curiosity, surprise, or a strong emotional hook. Think like a master copywriter.
   - **Creative Patterns (use variety, don't repeat the same style):**
     - Question-based: "[Person] ने उठाया बड़ा कदम, क्या है इसके पीछे की वजह?"
     - Consequence-focused: "[Event] के बाद बदल गए समीकरण, अब क्या होगा आगे?"
     - Reveal-style: "खुलासा: [Topic] पर सामने आई वो रिपोर्ट, जिसे सब जानना चाहते हैं।"
     - Direct & Punchy: "[News] को लेकर सरकार का बड़ा ऐलान, आम आदमी पर होगा सीधा असर।"
   - **Constraint:** < 15 words. Must be dramatic but 100% factual.
   - **NEGATIVE CONSTRAINT:** Avoid using "बड़ा झटका" or "मचा हड़कंप" in every headline. Use them only when truly appropriate for major breaking news.

2. **ARTICLE BODY (Hindi - ENGAGEMENT FOCUSED):**
   - **Length:** 400-500 words(Crisp & Spicy).
   - **Tone:** Conversational, informative, and urgent. (Like an expert friend explaining something important).
   - **Formatting:**
     - Use **bold tags** (<strong>text</strong>) for key names, places, and numbers.
     - Short paragraphs (2-3 lines max) for easy mobile reading.
   - **Structure:**
     1. **The Hook (Para 1):** Start with the most impactful detail. Answer "What's the most surprising part of this news?" in the first line.
     2. **The Inside Story (<h3> Subheading):** Explain the core event. What, why, and how it happened.
     3. **Why It Matters (<h3> Subheading):** Explain the impact on the reader or the country.
     4. **Key Highlights (<ul><li>):** Summarize the 3 most important takeaways in bullet points.
   - **Constraint:** Every sentence should add value. No filler content.

3. **IMAGE PROMPT (English):**
   - **Subject:** Capture the core emotion or action of the story. Focus on expressions, environment, and mood.
   - **Style:** "Cinematic, photorealistic, 8k, high contrast, dramatic lighting, press photography style".
   - **Instruction:** If a person is central, start with "Dramatic close-up portrait of...". If it's an event, start with "Cinematic action shot of...".

4. **TAGS:** 5 relevant and trending tags (Hindi or English).
5. **CATEGORY:** A single, relevant category (e.g., राजनीति, खेल, तकनीक).

### JSON STRUCTURE EXAMPLE:
{
  "headline": "क्या सच में बदल जाएगा [Something]? सरकार ने लिया बड़ा फैसला!",
  "content": "<p><strong>[City/Context]</strong>: एक ऐसी खबर सामने आई है जिसने सभी का ध्यान खींच लिया है।...</p><h3>क्या है पूरा मामला?</h3><p>सूत्रों के अनुसार, <strong>[Name]</strong> ने...</p><h3>इसका क्या असर होगा?</h3><p>जानकारों का मानना है कि...</p><ul><li>मुख्य बिंदु 1</li><li>मुख्य बिंदु 2</li><li>मुख्य बिंदु 3</li></ul>",
  "image_prompt": "Dramatic close-up portrait of a concerned politician looking at official documents, cinematic lighting, 8k, photorealistic.",
  "tags": ["#tag1", "#tag2", "#tag3"],
  "category": "राजनीति"
}
`;

const parser = new Parser();
let processedCount = 0;
let errorCount = 0;

function cleanJSON(text) {
  // Remove markdown code blocks
  let cleaned = text.replace(/```json\s*/g, '').replace(/```/g, '');

  // Find JSON object
  const jsonMatch = cleaned.match(/{[\s\S]*}/);
  if (!jsonMatch) {
    throw new Error('No JSON object found in response');
  }
  return jsonMatch[0];
}

async function generateAndUploadImage(prompt) {
    console.log("  🎨 Generating image with Hugging Face...");
    try {
        const result = await hf.textToImage({
            model: "black-forest-labs/FLUX.1-schnell",
            inputs: prompt,
            parameters: {
                guidance_scale: 0.0,
                num_inference_steps: 4,
            },
            provider: "fal",
        });

        const buffer = Buffer.from(await result.arrayBuffer());
        
        console.log("  📤 Uploading image to ImgBB...");
        const form = new FormData();
        form.append('image', buffer.toString('base64'));

        const response = await axios.post(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, form, {
            headers: form.getHeaders(),
        });

        if (response.data.success) {
            console.log("  ✅ Image uploaded successfully to ImgBB.");
            return response.data.data.url;
        } else {
            console.error("  ❌ ImgBB upload failed:", response.data);
            return null;
        }
    } catch (error) {
        console.error("  ❌ Error generating or uploading image:", error.message);
        return null;
    }
}

async function checkDuplicate(headline, sourceUrl) {
  console.log('  🔎 Checking for duplicates...');
  const articlesRef = db.collection('articles');
  
  const urlSnapshot = await articlesRef.where('sourceUrl', '==', sourceUrl).limit(1).get();
  if (!urlSnapshot.empty) return true;

  const headlineSnapshot = await articlesRef.where('headline', '==', headline).limit(1).get();
  if (!headlineSnapshot.empty) return true;

  return false;
}

async function generateContent(articleText) {
  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: articleText }],
      model: "moonshotai/kimi-k2-instruct-0905",
      response_format: { type: "json_object" }
    });
    const content = completion.choices[0].message.content;
    const cleaned = cleanJSON(content);
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('  ❌ Groq API error:', e.message);
    return null;
  }
}

async function processArticle(item) {
  const headline = item.title;
  const sourceUrl = item.link;
  const preview = headline.length > 60 ? `${headline.substring(0, 60)}...` : headline;
  console.log(`
📰 Processing: "${preview}"`);

  try {
    const isDuplicate = await checkDuplicate(headline, sourceUrl);
    if (isDuplicate) {
      console.log('  ⏩ Skipped: Duplicate detected in Firestore.');
      return;
    }

    console.log('  🤖 Generating AI content with Groq...');
    const aiData = await generateContent(headline);
    if (!aiData || !aiData.headline || !aiData.content) {
      console.log('  ⏩ Skipped: AI content generation failed or returned invalid data.');
      errorCount++;
      return;
    }

    let finalImageUrl = null;

    if (aiData.image_prompt) {
        finalImageUrl = await generateAndUploadImage(aiData.image_prompt);
    }

    if (!finalImageUrl) {
      console.log('  🔄 Falling back to local placeholder image...');
      finalImageUrl = LOCAL_PLACEHOLDER_IMAGE;
    }

    const dataToSave = {
      headline: aiData.headline,
      content: aiData.content,
      tags: aiData.tags || [],
      category: aiData.category || 'Other',
      sourceUrl: sourceUrl,
      imageUrl: finalImageUrl,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      views: 0
    };

    const docRef = await db.collection('articles').add(dataToSave);
    console.log(`✅ Saved: ${aiData.headline.substring(0, 60)}... (ID: ${docRef.id})`);
    processedCount++;
  } catch (error) {
    console.error(`  ❌ Failed to process article "${headline}":`, error.message);
    errorCount++;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function triggerRevalidation() {
  const revalidateUrl = process.env.REVALIDATE_URL || 'https://daily-dhandora.vercel.app/api/revalidate';
  if (!revalidateUrl) {
    console.log(`
⚠️ REVALIDATE_URL not set. Skipping cache revalidation.`);
    return;
  }
  console.log(`
🔄 Triggering cache revalidation at: ${revalidateUrl}`);
  
  try {
    const response = await fetch(revalidateUrl, { method: 'GET' });
    if (!response.ok) {
      throw new Error(`Request failed with status code ${response.status}`);
    }
    const data = await response.json();
    console.log('✅ Cache revalidation request sent successfully!', data);
  } catch (error) {
    console.error('❌ Critical error during revalidation request:', error.message);
  }
}

async function runBot() {
  console.log('🤖 Starting DailyDhandora News Bot at:', new Date().toISOString());

  for (const feedUrl of RSS_FEEDS) {
    console.log(`
📡 Fetching RSS feed: ${feedUrl}`);
    try {
      const feed = await parser.parseURL(feedUrl);
      console.log(`✅ Found ${feed.items.length} articles in feed`);
      const itemsToProcess = feed.items.slice(0, 5);

      for (const item of itemsToProcess) {
        await processArticle(item);
        await sleep(20000); // 20-second delay
      }
    } catch (feedError) {
      console.error(`❌ Error processing feed ${feedUrl}:`, feedError.message);
      errorCount++;
    }
  }

  console.log(`
✅ Bot execution completed!`);
  console.log(`📊 Stats: ${processedCount} processed, ${errorCount} errors`);
}

async function main() {
  try {
    await runBot();
  } catch (error) {
    console.error('🔥 A critical error occurred in the bot:', error);
  } finally {
    await sleep(120000); // 120-second delay before revalidation
    await triggerRevalidation();
    console.log(`
👋 Bot script finished.`);
  }
}

main().catch(error => {
  console.error('🔥 Unhandled exception in main execution:', error);
  process.exit(1);
});