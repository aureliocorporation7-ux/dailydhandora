const axios = require('axios');
const aiWriter = require('../services/ai-writer');
const imageGen = require('../services/image-gen');
const newsCardGen = require('../services/news-card-gen');
const dbService = require('../services/db-service');
const { getCategoryFallback } = require('../../lib/stockImages');

async function run() {
    console.log("\n🌾 [Mandi Bot] Starting Execution...");

    // 1. GATEKEEPER
    const settings = await dbService.getBotSettings();
    console.log(`  ⏰ Mandi Bot triggered. Admin Status: ${settings.isBotActive ? 'Active' : 'Disabled'}`);
    console.log(`  ⚙️ [Admin] Mode: ${settings.botMode} | AI: ${settings.enableAI} | IMG: ${settings.enableImageGen}`);

    if (!settings.isBotActive) {
        console.log("  🛑 [Mandi Bot] Disabled by Admin. Exiting.");
        return;
    }

    const url = "https://rajkisan.rajasthan.gov.in/Rajkisanweb/GetAllDataList";
    const apmcs = ["MERTA CITY", "NAGOUR"];
    let combinedText = "";
    let apiDate = null;
    let hasData = false;

    const ratesForCard = [];

    // 2. FETCH DATA FIRST
    for (const apmc of apmcs) {
        try {
            console.log(`  ⏳ [Mandi Bot] Hitting API for ${apmc}...`);
            const response = await axios.post(url, { Apmc: apmc, Commodity: "0", Category: "0" }, {
                headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' }
            });
            const data = response.data;
            if (!data || data.length === 0) {
                console.log(`     ⚠️ [Mandi Bot] No data for ${apmc}.`);
                continue;
            }

            const latestDateStr = data[0].latestTransactionDate;
            if (!latestDateStr) continue;

            if (!apiDate) apiDate = latestDateStr;

            console.log(`     ✅ [Mandi Bot] Data found for ${apmc} (${latestDateStr}).`);
            combinedText += `📍 ${apmc} मंडी भाव (दिनांक: ${latestDateStr}):\n`;
            
            data.forEach(item => {
                if (item.latestTransactionDate === latestDateStr) {
                    const fasal = item.commodityName || "Unknown";
                    const min = item.minPrice || "0";
                    const max = item.maxPrice || "0";
                    const avg = item.modalPrice || "0";
                    combinedText += `- ${fasal}: ₹${min} - ₹${max} (Avg: ₹${avg})\n`;

                    // Collect for Card (Prioritize Jeera, Guar, Moong if possible, or just push top ones)
                    // Simple logic: Push all unique crops, we slice in the generator
                    if (!ratesForCard.find(r => r.crop === fasal)) {
                         ratesForCard.push({ crop: fasal, min: min, max: max });
                    }
                }
            });
            combinedText += "\n";
            hasData = true;
        } catch (e) { 
            console.error(`     ❌ [Mandi Bot] API Error: ${e.message}`); 
        }
    }

    if (!hasData || !apiDate) {
        console.log("  ⚠️ [Mandi Bot] No data found today. Exiting.");
        return;
    }

    // 3. DUPLICATE CHECK
    const safeDate = apiDate.replace(/[^a-zA-Z0-9-]/g, '-'); 
    const uniqueUrl = `https://dailydhandora.com/mandi-update/${safeDate}`;
    
    const isDuplicate = await dbService.checkDuplicate('articles', 'sourceUrl', uniqueUrl);
    if (isDuplicate) {
        console.log(`  ⚠️ [Mandi Bot] Update for ${apiDate} already exists. Skipping.`);
        return;
    }

    console.log("  🧠 [Mandi Bot] Sending data to AI Writer...");

    // 4. AI WRITER
    let aiData;
    if (settings.enableAI) {
        const prompt = `
        Here is the raw Mandi Bhav data for Nagaur and Merta City:
        ${combinedText}

        Please write a news update for farmers in Hindi.
        Headline MUST include the date: "${apiDate}".
        Headline Example: "Nagaur & Merta Mandi Bhav Update (${apiDate})"
        Use a table or list for the rates.
        Category: "Mandi Bhav"
        `;
        aiData = await aiWriter.writeArticle(prompt);
    } else {
         console.log("  ⚠️ [Mandi Bot] AI Disabled. Using raw dump.");
         aiData = {
             headline: `Mandi Bhav Update (${apiDate})`,
             content: `<pre>${combinedText}</pre>`,
             tags: ['Mandi Bhav'],
             category: 'मंडी भाव'
         };
    }

    if (!aiData) return;

    // 5. IMAGE GEN
    let imageUrl = null;
    if (settings.enableImageGen && aiData.image_prompt) {
        console.log("  🎨 [Mandi Bot] Generating Image...");
        imageUrl = await imageGen.generateImage(aiData.image_prompt);
    }
    
    if (!imageUrl) {
        imageUrl = getCategoryFallback('Mandi Bhav');
    }

    // 🎴 GENERATE MANDI CARD
    let shareCardUrl = null;
    try {
        if (ratesForCard.length > 0) {
            console.log("     🎨 [Mandi Bot] Generating Rate Card...");
            const cardBuffer = await newsCardGen.generateMandiCard(ratesForCard, apiDate);
            if (cardBuffer) {
                shareCardUrl = await imageGen.uploadToImgBB(cardBuffer);
                if (shareCardUrl) console.log("     ✅ [Mandi Bot] Rate Card Created & Uploaded!");
            }
        }
    } catch (e) {
        console.error(`     ⚠️ [Mandi Bot] Card Gen Failed: ${e.message}`);
    }

    // 6. SAVE
    const articleData = {
        headline: aiData.headline,
        content: aiData.content
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/^\* (.*$)/gim, '<li>$1</li>'),
        tags: [...(aiData.tags || []), 'Mandi Bhav', 'Nagaur', 'Merta', `Date: ${apiDate}`],
        category: 'मंडी भाव',
        sourceUrl: uniqueUrl,
        imageUrl: imageUrl,
        shareCardUrl: shareCardUrl || imageUrl, // Fallback
        status: settings.articleStatus,
        author: 'MandiBot'
    };

    console.log(`  💾 [Mandi Bot] Saving to Firestore...`);
    await dbService.saveDocument('articles', articleData);
    console.log(`  🎉 [Mandi Bot] SUCCESS! Saved: "${aiData.headline}"`);
}

module.exports = { run };
