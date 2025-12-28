// scripts/run-bot.js
if (process.env.CI) {
  require('dotenv').config({ path: '.env' });
} else {
  require('dotenv').config({ path: '.env.local', override: true });
}

const { db, admin } = require('../lib/firebase');
const { getCategoryFallback } = require('../lib/stockImages');
const Parser = require('rss-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');
const axios = require('axios');
const { HfInference } = require('@huggingface/inference');
const FormData = require('form-data');
const fs = require('fs');

// Initialize Clients
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const groq = new Groq({ apiKey: process.env.GOD_API_KEY });
const hf = new HfInference(process.env.HUGGINGTOCK);
const IMGBB_KEY = process.env.IMGBB;

const RSS_FEEDS = [
  'https://news.google.com/rss/search?q=Nagaur+Mandi+Bhav+Merta+when:24h&hl=hi&gl=IN&ceid=IN:hi', // 🌾 Nagaur/Merta Mandi (Fresh Only)
  'https://news.google.com/rss/search?q=Nagaur+Local+News+Rajasthan+when:24h&hl=hi&gl=IN&ceid=IN:hi', // 📍 Nagaur Local (Fresh Only)
  'https://news.google.com/rss/search?q=Rajasthan+Sarkari+Yojana+Update+when:24h&hl=hi&gl=IN&ceid=IN:hi', // 🏛️ Rajasthan Schemes (Fresh Only)
  'https://news.google.com/rss/search?q=Rajasthan+Sarkari+Naukri+Recruitment+when:24h&hl=hi&gl=IN&ceid=IN:hi', // 🎓 Rajasthan Jobs (Fresh Only)
  'https://news.google.com/rss/search?q=Rajasthan+Weather+Alert+Farming+when:24h&hl=hi&gl=IN&ceid=IN:hi' // 🌦️ Weather (Fresh Only)
];

const SYSTEM_PROMPT = `
You are the "Master Editor" for DailyDhandora, specializing in **Nagaur & Rajasthan Rural Utility & News**. Your goal is to be the #1 trusted source for Nagaur's farmers, students, and villagers.

**CRITICAL INSTRUCTION: You MUST provide the output strictly in JSON format.**

### YOUR LOCAL PERSONA:

1.  **THE NAGAUR & RAJASTHAN EXPERT:** 🌾
    *   **Goal:** Provide accurate crop rates (especially for Nagaur Mandi - Moong, Jeera, Mustard) and local news.
    *   **Tone:** Helpful, local, and grounded. Use terms like "नागौर के किसान भाई", "मंडी आवक", "तेजी-मंदी".
    *   **Style:** Clear tables or lists for rates. Mention Nagaur specifically whenever relevant.

2.  **THE RAJASTHAN CAREER GUIDE:** 🎓
    *   **Goal:** Update on REET, Rajasthan Police, CET, and other state exams.
    *   **Tone:** Encouraging and informative.

3.  **THE SCHEME HELPER:** 🏛️
    *   **Goal:** Explain Rajasthan State Govt schemes (e.g., Chiranjeevi, Annapurna, Free Mobile).

### OUTPUT FORMAT:
**Strictly JSON only.** Do not output any markdown code blocks like \`\`\`json. Just the raw JSON object.

### TASKS:

1. **HEADLINE (Hindi):**
    - MUST include the location or benefit. (e.g., "नागौर मंडी भाव: आज मूंग के दामों में भारी तेजी", "REET भर्ती परीक्षा को लेकर बड़ी खबर", "नागौर जिले के लिए नई योजना")
    - < 15 words.

2. **ARTICLE BODY (Hindi):**
    - **Length:** 350-450 words.
    - **MANDATORY FORMATTING:** USE HTML ONLY: <p>, <h3>, <strong>, <ul>, <li>.
    
    **FOR MANDI RATES:**
    - Use <h3>आज के प्रमुख भाव</h3>
    - Use a bulleted list <ul><li> for different crops and their rates.

    **FOR SCHEMES/JOBS:**
    - Use <h3>पात्रता (Eligibility)</h3>, <h3>आवेदन प्रक्रिया (Process)</h3>, <h3>जरूरी दस्तावेज (Documents)</h3>.

3. **IMAGE PROMPT (English):**
    - **Goal:** Supreme quality, Photorealistic, Cinematic.
    - **Structure:** Start with the Subject, then Lighting/Mood, then Technical specs.
    - **Keywords to Include:** "highly detailed face, symmetrical features, sharp focus, 8k resolution, cinematic lighting, golden hour, Rajasthan rural atmosphere".
    - **Context:** If it's a person: "Professional portrait of [Subject], looking confident, perfect eyes, natural skin texture". If it's a place: "Wide angle shot of [Place], dramatic sky".
    - **Constraint:** No text in image. No distorted faces.

4. **TAGS:** Include tags like 'Rajasthan News', 'Mandi Bhav', 'Sarkari Yojana'.
5. **CATEGORY:** One of (सरकारी योजना, नौकरियां, राजस्थान, मंडी भाव, शिक्षा, अन्य).
   *   **NOTE:** Map 'Schemes' to **'सरकारी योजना'**, 'Jobs' to **'नौकरियां'**, and all Mandi rates/Business to **'मंडी भाव'**.

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
            let errorMsg = error.message;
            
            // Clean up Rate Limit errors
            if (errorMsg.includes('429') || errorMsg.includes('Quota') || errorMsg.includes('quota')) {
                console.log(`  ⚠️  FAILED: ${modelName} - Rate Limit Exceeded (429). Switching to next...`);
            } else {
                // Keep other errors concise
                console.log(`  ⚠️  FAILED: ${modelName} - ${errorMsg.split('\n')[0].substring(0, 100)}...`);
            }
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

async function processArticle(item, status = 'published', imageGenEnabled = true) {
  const headline = item.title;
  const sourceUrl = item.link;
  const pubDate = new Date(item.pubDate);
  const now = new Date();
  const timeDiffHours = (now - pubDate) / (1000 * 60 * 60);

  // --- STRICT 24-HOUR FILTER 🛡️ ---
  if (timeDiffHours > 24) {
      console.log(`  ⏳ Skipped: Old news (${Math.floor(timeDiffHours)} hours ago). Strict 24h limit.`);
      return;
  }

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

    // --- SAFETY NET: Convert Markdown to HTML if AI messed up ---
    let formattedContent = aiData.content
        .replace(/^### (.*$)/gim, '<h3>$1</h3>') // Convert ### to <h3>
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Convert ** to <strong>
        .replace(/__(.*?)__/g, '<strong>$1</strong>') // Convert __ to <strong>
        .replace(/^\* (.*$)/gim, '<li>$1</li>') // Convert * item to <li>
        .replace(/^- (.*$)/gim, '<li>$1</li>'); // Convert - item to <li>

    // Wrap consecutive <li> tags in <ul> (Basic fix)
    formattedContent = formattedContent.replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>')
        .replace(/<\/ul>\s*<ul>/gim, ''); // Merge adjacent lists


    let finalImageUrl = null;

    // Check Global Switch for Image Gen
    if (imageGenEnabled && aiData.image_prompt) {
        finalImageUrl = await generateAndUploadImage(aiData.image_prompt);
    } else if (!imageGenEnabled) {
        console.log("  🛑 Image Gen DISABLED in settings. Skipping AI generation.");
    }

    if (!finalImageUrl) {
      console.log('  🔄 Using Fallback Image (Scenario: AI Failed OR Disabled)...');
      // Use smart fallback based on category
      finalImageUrl = getCategoryFallback(aiData.category);
    }

    const dataToSave = {
      headline: aiData.headline,
      content: formattedContent,
      tags: aiData.tags || [],
      category: aiData.category || 'Other',
      sourceUrl: sourceUrl,
      imageUrl: finalImageUrl,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      views: 0,
      status: status, // 'published' or 'draft'
      author: 'Abhishek' // Added for AdSense Trust
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
  let imageGenEnabled = true; // Default

  try {
    const settingsDoc = await db.collection('settings').doc('global').get();
    if (settingsDoc.exists) {
        const data = settingsDoc.data();
        botMode = data.botMode || 'auto';
        imageGenEnabled = data.imageGenEnabled !== false; // Default true
    } else {
        // Initialize if not exists
        await db.collection('settings').doc('global').set({ botMode: 'auto', imageGenEnabled: true });
        console.log("  ⚙️  Initialized Global Settings");
    }
  } catch (err) {
      console.error("  ⚠️  Could not fetch settings, defaulting to AUTO mode.", err.message);
  }

  console.log(`  🎛️  CURRENT MODE: [ ${botMode.toUpperCase()} ] | 🖼️  IMAGE GEN: [ ${imageGenEnabled ? 'ON' : 'OFF'} ]`);

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
    // RE-CHECK SETTINGS INSIDE THE LOOP FOR REAL-TIME CONTROL
    try {
      const settingsDoc = await db.collection('settings').doc('global').get();
      if (settingsDoc.exists) {
          const data = settingsDoc.data();
          botMode = data.botMode || 'auto';
          imageGenEnabled = data.imageGenEnabled !== false;
      }
    } catch (err) {
        console.error("  ⚠️  Settings re-check failed, continuing with last known state.");
    }

    if (botMode === 'off') {
        console.log("  🔴 Kill Switch detected (OFF). Stopping bot immediately.");
        break; 
    }

    console.log(`
📡 Fetching RSS feed: ${feedUrl}`);
    try {
      const feed = await parser.parseURL(feedUrl);
      console.log(`✅ Found ${feed.items.length} articles in feed`);
      
      // Smart Volume Control: Only process top 1 per feed to prevent spam
      const itemsToProcess = feed.items.slice(0, 1);

      for (const item of itemsToProcess) {
        // Pass the status and imageGen flag to processArticle
        await processArticle(item, articleStatus, imageGenEnabled);
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