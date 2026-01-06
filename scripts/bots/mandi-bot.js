const axios = require('axios');
const cheerio = require('cheerio');
const aiWriter = require('../services/ai-writer');
const imageGen = require('../services/image-gen');
const newsCardGen = require('../services/news-card-gen');
const dbService = require('../services/db-service');
const { getCategoryFallback } = require('../../lib/stockImages');

const BHASKAR_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
    'Referer': 'https://www.google.com/'
};

async function scrapeBhaskarArticle(url) {
    // PASSIVE MODE: Helper kept for potential manual use, but not used in loop.
    return null;
}

async function run() {
    console.log("\n🌾 [Mandi Bot] Mode: PASSIVE (Interceptor Standby)");
    console.log("     ℹ️ Waiting for News Bot to feed Mandi updates...");
    
    // Heartbeat update only
    const settings = await dbService.getBotSettings();
    if (settings.isBotActive) {
        console.log("     ✅ Bot is Active & Ready.");
    }
}

/**
 * 🔄 SHARED: Process unstructured Mandi text (fed by News Bot)
 * extracts rates, generates card, and saves.
 */
async function processRawMandiData(rawHeadline, rawBody, sourceUrl, settings, enforcedDate = null) {
    console.log(`\n  🌾 [Mandi Bot] Processing data from: ${sourceUrl}`);

    // Context Configuration
    const now = new Date();
    const todayIST = now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'long', day: 'numeric' });
    const todayYMD = now.toISOString().split('T')[0];

    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    const yesterdayIST = yest.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'long', day: 'numeric' });
    
    // We pass Today as the anchor, but the prompt handles the window.
    console.log(`     📅 Smart Date Window: ${yesterdayIST} to ${todayIST}`);

    // 1. AI WRITER & EXTRACTION
    const prompt = `
    ROLE: You are the Mandi Market Analyst for 'DailyDhandora'.
    
    CRITICAL CONTEXT:
    Today is: ${todayIST}
    Yesterday was: ${yesterdayIST}
    
    SOURCE MATERIAL:
    Headline: ${rawHeadline}
    Content: ${rawBody.substring(0, 3000)}
    
    TASK:
    1. Extract Mandi Rates (Bhav).
    2. VALIDITY CHECK (Smart Window):
       - Accept rates if they are for TODAY OR YESTERDAY.
       - If the text EXPLICITLY mentions a date OLDER than ${yesterdayIST} (more than 48h ago), RETURN NULL.
       - If NO specific date is mentioned, ASSUME they are fresh/latest and valid.
    3. Extract the effective date of the rates. If unknown, use Today's date (${todayYMD}).
    
    OUTPUT JSON FORMAT (Return NULL if older than 48h):
    {
      "headline": "Nagaur/Merta Mandi Bhav Update (DD-MM-YYYY)", 
      "content": "HTML body with <ul><li> for rates.",
      "rates": [ 
         { "crop": "Jeera", "min": "5000", "max": "6000" }
      ],
      "tags": ["Mandi Bhav", "Nagaur"],
      "date": "YYYY-MM-DD" 
    }
    `;

    const aiData = await aiWriter.writeArticle(prompt);
    if (!aiData || !aiData.headline) {
        console.log("     ❌ [Mandi Bot] AI Rejected (Data too old or invalid).");
        return false;
    }

    const detectedDate = aiData.date || todayYMD;

    // 2. GENERATE CARD (If rates found)
    let shareCardUrl = null;
    let imageUrl = null;

    if (aiData.rates && aiData.rates.length > 0) {
        console.log(`     🎨 [Mandi Bot] Generating Rate Card for ${aiData.rates.length} crops...`);
        try {
            const cardBuffer = await newsCardGen.generateMandiCard(aiData.rates, detectedDate);
            if (cardBuffer) {
                shareCardUrl = await imageGen.uploadToImgBB(cardBuffer);
                imageUrl = shareCardUrl; // Use card as main image too
            }
        } catch (e) {
            console.error(`     ⚠️ [Mandi Bot] Rate Card Gen Failed: ${e.message}`);
        }
    }

    // Fallback Image
    if (!imageUrl) {
        if (settings.enableImageGen && settings.enableAI) {
            imageUrl = await imageGen.generateImage(`Busy indian grain market, sacks of crops, farmers trading, realistic, 4k`);
        } else {
            imageUrl = getCategoryFallback('Mandi Bhav');
        }
    }

    // 3. SAVE
    const articleData = {
        headline: aiData.headline,
        content: aiData.content,
        tags: [...(aiData.tags || []), 'Mandi Bhav', `Rates: ${detectedDate}`],
        category: 'मंडी भाव',
        sourceUrl: sourceUrl,
        imageUrl: imageUrl,
        shareCardUrl: shareCardUrl || imageUrl,
        status: settings.articleStatus,
        author: 'MandiBot (via News)'
    };

    const isDuplicate = await dbService.checkDuplicate('articles', 'headline', aiData.headline);
    if (isDuplicate) {
        console.log("     ⚠️ [Mandi Bot] Duplicate headline. Skipping save.");
        return false;
    }

    await dbService.saveDocument('articles', articleData);
    console.log(`     ✅ [Mandi Bot] Saved External Mandi Update: ${aiData.headline}`);
    return true;
}

module.exports = { run, processRawMandiData };
