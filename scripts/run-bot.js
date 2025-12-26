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

const FALLBACK_IMAGES = [
  'https://i.ibb.co/WvyBzwjt/Gemini-Generated-Image-q955oqq955oqq955.png',
  'https://i.ibb.co/fYWK9psQ/Gemini-Generated-Image-d9qtrld9qtrld9qt.png'
];

// Initialize Clients
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const groq = new Groq({ apiKey: process.env.GOD_API_KEY });
const hf = new HfInference(process.env.HUGGINGTOCK);
const IMGBB_KEY = process.env.IMGBB;

const RSS_FEEDS = [
  'https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en', // Top Stories
  'https://news.google.com/rss/search?q=India+startups+business+when:24h&hl=en-IN&gl=IN&ceid=IN:en', // Startups & Economy
  'https://news.google.com/rss/search?q=India+technology+gadgets+when:24h&hl=en-IN&gl=IN&ceid=IN:en', // Tech
  'https://news.google.com/rss/search?q=ISRO+science+innovation+India+when:24h&hl=en-IN&gl=IN&ceid=IN:en', // Science & Innovation
  'https://news.google.com/rss/search?q=Education+Jobs+Career+India+when:24h&hl=en-IN&gl=IN&ceid=IN:en' // Utility/Education
];

const SYSTEM_PROMPT = `
You are the "Master Editor" for DailyDhandora, a high-traffic Indian news portal. Your superpower is **Adaptability**. You know exactly when to be spicy and when to be smart.

### YOUR DUAL PERSONALITY:
1.  **THE MASALA EDITOR (For Politics, Crime, Entertainment, Viral Trends):**
    *   **Goal:** Maximum CTR. Stop the scroll!
    *   **Tone:** Dramatic, urgent, and high-energy. Use emotional hooks like shock, curiosity, or pride.
    *   **Style:** "Spicy & Bold." Think like a top TV news anchor.

2.  **THE VALUE EDITOR (For Tech, Startups, Education, Science, Finance):**
    *   **Goal:** High Utility. Make the reader smarter.
    *   **Tone:** Intelligent, professional, and helpful. 
    *   **Style:** "Smart & Crisp." Like a trusted expert friend.

### OUTPUT FORMAT:
Strictly JSON only.

### TASKS:

1. **HEADLINE (Hindi - THE HOOK):**
    - **If Masala:** Use powerful words. (e.g., "खलबली", "बड़ा खुलासा", "समीकरण बदले", "हैरान करने वाला")
    - **If Value:** Use benefit-driven words. (e.g., "बड़ी राहत", "खुशखबरी", "बदल जाएगी दुनिया", "कमाई का मौका")
    - **Constraint:** < 15 words. Dramatic but 100% factual.

2. **ARTICLE BODY (Hindi):**
    - **Length:** 350-400 words.
    - **Format:** Use **bold tags** for emphasis. Short paragraphs.
    - **Structure:**
        1. **The Hook (Para 1):** Start with the most impactful detail. 
        2. **The Deep Dive (<h3> Subheading):** Detailed explanation of the event/topic.
        3. **Why It Matters (<h3> Subheading):** If Masala: The drama/consequence. If Value: The benefit/impact.
        4. **Key Takeaways (<ul><li>):** 3-4 bullet points.

3. **IMAGE PROMPT (English):**
    - **Instruction:** Match the mood. If Masala: High contrast, dramatic lighting, intense expressions. If Value: Clean, modern, vibrant, tech-focused.

4. **TAGS:** 5 relevant tags.
5. **CATEGORY:** One of (राजनीति, मनोरंजन, तकनीक, स्टार्टअप, शिक्षा, विज्ञान, व्यापार, अन्य).

### JSON STRUCTURE:
{
  "headline": "...",
  "content": "...",
  "image_prompt": "...",
  "tags": ["..."],
  "category": "..."
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
    console.log("  🎨 Starting image generation and upload process...");

    async function tryGenerate(token, tokenName) {
        try {
            console.log(`  👉 Attempting with ${tokenName}...`);
            const hfClient = new HfInference(token);
            const result = await hfClient.textToImage({
                model: "black-forest-labs/FLUX.1-schnell",
                inputs: prompt,
                parameters: {
                    guidance_scale: 0.0,
                    num_inference_steps: 4,
                    wait_for_model: true,
                }
            });
            const buffer = Buffer.from(await result.arrayBuffer());
            if (buffer && buffer.length > 0) {
                console.log(`  ✅ SUCCESS: Image generated using [${tokenName}]`);
                return buffer;
            }
            throw new Error("Empty buffer received");
        } catch (err) {
            console.log(`  ⚠️  FAILED: ${tokenName} - ${err.message}`);
            return null;
        }
    }

    // Helper for delay
    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    try {
        let buffer = null;

        // --- TIER 1: Primary Token ---
        if (process.env.HUGGINGTOCK) {
            buffer = await tryGenerate(process.env.HUGGINGTOCK, 'HUGGINGTOCK (Primary)');
            
            if (!buffer) {
                console.log("  ⏳ Waiting 10s before retrying Primary...");
                await wait(10000);
                buffer = await tryGenerate(process.env.HUGGINGTOCK, 'HUGGINGTOCK (Primary Retry)');
            }
        }

        // --- TIER 2: Backup Token 1 ---
        if (!buffer && process.env.HUGGINGTOCK_BACKUP) {
             console.log("  🔻 Switching to Fallback Level 1...");
             await wait(5000); 
             buffer = await tryGenerate(process.env.HUGGINGTOCK_BACKUP, 'HUGGINGTOCK_BACKUP');

             if (!buffer) {
                console.log("  ⏳ Waiting 10s before retrying Backup 1...");
                await wait(10000);
                buffer = await tryGenerate(process.env.HUGGINGTOCK_BACKUP, 'HUGGINGTOCK_BACKUP (Retry)');
             }
        }

        // --- TIER 3: Backup Token 2 ---
        if (!buffer && process.env.HUGGINGTOCK_BACKUP2) {
             console.log("  🔻 Switching to Fallback Level 2...");
             await wait(5000);
             buffer = await tryGenerate(process.env.HUGGINGTOCK_BACKUP2, 'HUGGINGTOCK_BACKUP2');

             if (!buffer) {
                console.log("  ⏳ Waiting 10s before retrying Backup 2...");
                await wait(10000);
                buffer = await tryGenerate(process.env.HUGGINGTOCK_BACKUP2, 'HUGGINGTOCK_BACKUP2 (Retry)');
             }
        }

        if (!buffer) {
             throw new Error("❌ ALL image generation tokens failed.");
        }

        // Step 2: Upload Image
        console.log("  📤 Uploading image to ImgBB...");
        const form = new FormData();
        form.append('image', buffer.toString('base64'));

        const response = await axios.post(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, form, {
            headers: {
                ...form.getHeaders(),
            },
        });

        if (response.data.success) {
            console.log(`  🎉 Image uploaded successfully! URL: ${response.data.data.url}`);
            return response.data.data.url;
        } else {
            console.error("  ❌ ImgBB upload API returned an error.");
            return null;
        }
    } catch (error) {
        console.error("  ❌ Critical error in image workflow:", error.message);
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

async function generateContent(headline) {
    const geminiModels = [
        'gemini-3-pro-preview',
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite'
    ];

    // Helper: Try generating with a specific Gemini model
    async function tryGemini(modelName) {
        console.log(`  🤖 Attempting with Gemini Model: ${modelName}...`);
        try {
            const model = genAI.getGenerativeModel({ 
                model: modelName,
                systemInstruction: SYSTEM_PROMPT
            });

            const result = await model.generateContent(headline);
            const response = await result.response;
            const text = response.text();
            
            if (!text) throw new Error("Empty response from Gemini");

            const cleaned = cleanJSON(text);
            const parsed = JSON.parse(cleaned);
            console.log(`  ✅ SUCCESS: Content generated using [${modelName}]`);
            return parsed;
        } catch (error) {
            console.log(`  ⚠️  FAILED: ${modelName} - ${error.message}`);
            return null;
        }
    }

    // 1. Try Gemini Models in sequence
    for (const modelName of geminiModels) {
        const data = await tryGemini(modelName);
        if (data && data.headline && data.content) {
            return data;
        }
        // If failed, loop continues to next model
    }

    // 2. Final Fallback: Groq
    console.log('  🔻 All Gemini models failed. Switching to Ultimate Fallback: Groq...');
    const model = "moonshotai/kimi-k2-instruct-0905";
    try {
        const completion = await groq.chat.completions.create({
            messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: headline }],
            model: model,
            response_format: { type: "json_object" }
        });
        const content = completion.choices[0].message.content;
        const cleaned = cleanJSON(content);
        const parsed = JSON.parse(cleaned);
        console.log(`  ✅ SUCCESS: Content generated using [Groq - ${model}]`);
        return parsed;
    } catch (e) {
        console.error('  ❌ CRITICAL: Groq also failed:', e.message);
        return null;
    }
}

async function processArticle(item, status = 'published') {
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
      console.log('  🔄 All AI Generation failed. Using Emergency Fallback Image...');
      // Pick a random fallback image
      finalImageUrl = FALLBACK_IMAGES[Math.floor(Math.random() * FALLBACK_IMAGES.length)];
    }

    const dataToSave = {
      headline: aiData.headline,
      content: aiData.content,
      tags: aiData.tags || [],
      category: aiData.category || 'Other',
      sourceUrl: sourceUrl,
      imageUrl: finalImageUrl,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      views: 0,
      status: status // 'published' or 'draft'
    };

    const docRef = await db.collection('articles').add(dataToSave);
    console.log(`✅ Saved [${status.toUpperCase()}]: ${aiData.headline.substring(0, 60)}... (ID: ${docRef.id})`);
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
  const baseUrl = (process.env.REVALIDATE_URL || 'https://daily-dhandora.vercel.app').replace(/\/$/, '');
  const revalidateUrl = `${baseUrl}/api/revalidate`;

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

  // 1. CHECK GLOBAL SETTINGS (The Master Switch)
  let botMode = 'auto'; // Default
  try {
    const settingsDoc = await db.collection('settings').doc('global').get();
    if (settingsDoc.exists) {
        botMode = settingsDoc.data().botMode || 'auto';
    } else {
        // Initialize if not exists
        await db.collection('settings').doc('global').set({ botMode: 'auto' });
        console.log("  ⚙️  Initialized Global Settings to 'auto'");
    }
  } catch (err) {
      console.error("  ⚠️  Could not fetch settings, defaulting to AUTO mode.", err.message);
  }

  console.log(`  🎛️  CURRENT MODE: [ ${botMode.toUpperCase()} ]`);

  // --- MODE: OFF ---
  if (botMode === 'off') {
      console.log("  🔴 Kill Switch is ACTIVE. Bot is sleeping. Bye!");
      return;
  }

  // --- MODE: MANUAL/AUTO ---
  const articleStatus = (botMode === 'manual') ? 'draft' : 'published';
  if (botMode === 'manual') {
      console.log("  🟡 Manual Mode: Articles will be saved as DRAFTS for review.");
  } else {
      console.log("  🟢 Auto Mode: Articles will be PUBLISHED immediately.");
  }

  for (const feedUrl of RSS_FEEDS) {
    console.log(`
📡 Fetching RSS feed: ${feedUrl}`);
    try {
      const feed = await parser.parseURL(feedUrl);
      console.log(`✅ Found ${feed.items.length} articles in feed`);
      
      // Smart Volume Control: Only process top 1 per feed to prevent spam
      const itemsToProcess = feed.items.slice(0, 1);

      for (const item of itemsToProcess) {
        // Pass the status to processArticle
        await processArticle(item, articleStatus);
        console.log("  ⏳ Cooldown: Waiting 60s before next article...");
        await sleep(60000); 
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

module.exports = { runBot, runBotWorkflow: main };

// Only run directly if called via CLI
if (require.main === module) {
  main().catch(error => {
    console.error('🔥 Unhandled exception in main execution:', error);
    process.exit(1);
  });
}