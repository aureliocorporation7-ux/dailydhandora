const axios = require('axios');
const cheerio = require('cheerio');
const aiWriter = require('../services/ai-writer');
const imageGen = require('../services/image-gen');
const newsCardGen = require('../services/news-card-gen');
const dbService = require('../services/db-service');
const topicCache = require('../services/topic-cache');
const { getCategoryFallback } = require('../../lib/stockImages');
const { getReadableDate } = require('../../lib/dateUtils');
const { getPrompt, fillTemplate } = require('../services/prompt-service');

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
    const todayIST = getReadableDate();
    const todayYMD = now.toISOString().split('T')[0];

    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    const yesterdayIST = yest.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'long', day: 'numeric' });

    // We pass Today as the anchor, but the prompt handles the window.
    console.log(`     📅 Smart Date Window: ${yesterdayIST} to ${todayIST}`);

    // 1. AI WRITER & EXTRACTION
    // 🧠 DYNAMIC PROMPT (Hybrid)
    const DEFAULT_MANDI_PROMPT = `
    ROLE: Mandi Analyst.
    CONTEXT: Today: {{today}}, Yesterday: {{yesterday}}.
    SOURCE: {{headline}} / {{content}}
    TASK: Extract Rates.
    VALIDITY: Only Today/Yesterday.
    OUTPUT: JSON { "rates": [], "date": "..." }
    `;

    const rawPrompt = await getPrompt('PROMPT_USER_MANDI', DEFAULT_MANDI_PROMPT);
    const prompt = fillTemplate(rawPrompt, {
        today: todayIST,
        yesterday: yesterdayIST,
        headline: rawHeadline,
        content: rawBody.substring(0, 3000),
        todayYMD: todayYMD
    });

    const aiData = await aiWriter.writeArticle(prompt);
    if (!aiData || !aiData.headline) {
        console.log("     ❌ [Mandi Bot] AI Rejected (Data too old or invalid).");
        return { rejected: true, reason: 'AI_FAILED' };
    }

    // ========================================
    // 🛡️ RATE VALIDATION LAYER v2.0
    // ========================================

    // CHECK 1: Must have rates array
    if (!aiData.rates || !Array.isArray(aiData.rates) || aiData.rates.length === 0) {
        console.log("     🚫 [Mandi Bot] REJECTED: No actual crop rates found in AI response.");
        console.log("     ↩️ This content should be processed as general news instead.");
        return { rejected: true, reason: 'NO_RATES' };
    }

    // CHECK 2: At least one rate must have valid values (not N/A)
    const validRates = aiData.rates.filter(r => {
        const min = String(r.min || '').toLowerCase();
        const max = String(r.max || '').toLowerCase();
        // Valid if at least one value is a number or not N/A
        return (min !== 'n/a' && min !== '' && min !== '0') ||
            (max !== 'n/a' && max !== '' && max !== '0');
    });

    if (validRates.length === 0) {
        console.log("     🚫 [Mandi Bot] REJECTED: All rates are N/A or invalid.");
        console.log(`     📊 Received ${aiData.rates.length} rates, but all were N/A.`);
        return { rejected: true, reason: 'ALL_NA' };
    }

    console.log(`     ✅ [Mandi Bot] Rate Validation PASSED: ${validRates.length}/${aiData.rates.length} valid rates.`);

    const detectedDate = aiData.date || todayYMD;

    // 2. GENERATE CARD (If rates found)
    let shareCardUrl = null;
    let imageUrl = null;

    if (validRates.length > 0) {
        console.log(`     🎨 [Mandi Bot] Generating Rate Card for ${validRates.length} crops...`);
        try {
            const cardBuffer = await newsCardGen.generateMandiCard(validRates, detectedDate);
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

    // 📝 GOD-LEVEL: Log to Topic Cache (Cross-bot duplicate prevention)
    await topicCache.logTopic(aiData.headline, 'mandi-bot');

    console.log(`     ✅ [Mandi Bot] Saved External Mandi Update: ${aiData.headline}`);
    return true;
}

module.exports = { run, processRawMandiData };
