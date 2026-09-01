const axios = require('axios');
const dbService = require('../services/db-service');
const aiWriter = require('../services/ai-writer');
const { getCategoryFallback } = require('../../lib/stockImages');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanJSON(text) {
    return text.replace(/```json\s*/g, '').replace(/```/g, '');
}

async function run() {
    console.log("\n🏛️ [Scheme Bot] Starting Execution...");

    // 1. GATEKEEPER
    const settings = await dbService.getBotSettings();
    console.log(`  ⚙️ [Admin] Bot Mode: ${settings.botMode.toUpperCase()} | AI: ${settings.enableAI ? 'ON' : 'OFF'}`);

    if (!settings.isBotActive) {
        console.log("  🛑 [Scheme Bot] Disabled by Admin. Exiting.");
        return;
    }

    // 🛡️ FIXED: MyScheme API expects plain text in 'q', not JSON filter arrays
    const apiUrl = `https://api.myscheme.gov.in/search/v6/schemes?lang=hi&q=&from=0&size=50&filters[0][identifier]=beneficiaryState&filters[0][value]=Rajasthan`;

    try {
        console.log(`  🚀 [Scheme Bot] Fetching Top 50 Schemes...`);
        const response = await axios.get(apiUrl, {
            headers: {
                'x-api-key': process.env.MYSCHEME_API_KEY || 'tYTy5eEhlu9rFjyxuCr7ra7ACp4dv1RH8gWuHTDc',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.myscheme.gov.in/',
                'Origin': 'https://www.myscheme.gov.in'
            },
            timeout: 30000
        });

        const items = response.data?.data?.hits?.items || response.data?.data?.schemes || [];
        if (items.length === 0) {
            console.log("  ⚠️ [Scheme Bot] No schemes returned. Exiting.");
            return;
        }

        console.log(`  🔍 [Scheme Bot] Found ${items.length} schemes. Processing...`);

        let savedCount = 0;
        let skippedCount = 0;

        for (const item of items) {
            const f = item.fields;
            const slug = f.slug;
            const officialLink = `https://www.myscheme.gov.in/schemes/${slug}`;
            const rawTitle = f.schemeName || "Unknown Scheme";
            const rawDesc = f.briefDescription || "Details not available.";

            console.log(`\n  👉 [Scheme Bot] Checking: "${rawTitle}"`);

            // 2. Duplicate Check
            const existing = await dbService.checkDuplicate('articles', 'sourceUrl', officialLink);
            if (existing) {
                console.log("     ⚠️ [Scheme Bot] Already exists. Skipping.");
                skippedCount++;
                continue;
            }

            // 3. Smart Categorization (Dual-Layer: AI + Code)
            const VALID_SCHEME_CATEGORIES = ['सरकारी योजना', 'भर्ती व रिजल्ट'];

            // Code-level keyword detection (immediate)
            const recruitKeywords = ['Scholarship', 'Chatravriti', 'Scooty', 'Coaching', 'Berojgari', 'Anuprati', 'छात्रवृत्ति', 'स्कूटी', 'कोचिंग', 'बेरोजगारी', 'अनुप्रति', 'Vacancy', 'भर्ती', 'Exam', 'रोजगार'];
            const codeCategory = recruitKeywords.some(kw => rawTitle.toLowerCase().includes(kw.toLowerCase()))
                ? 'भर्ती व रिजल्ट'
                : 'सरकारी योजना';

            // 4. Hybrid Content
            let finalContent = "";
            let finalHeadline = rawTitle;
            let aiCategory = null;

            console.log(`     🤖 [Scheme Bot] AI Status: ${settings.enableAI ? 'ON' : 'OFF'}`);

            if (settings.enableAI) {
                console.log("     🧠 [Scheme Bot] Requesting AI Rewrite...");
                const prompt = `
                SOURCE DATA:
                Title: ${rawTitle}
                Description: ${rawDesc}

                TASK:
                Format the provided "Description" into clean, readable HTML AND classify into category.
                
                FORMAT RULES:
                - Use <ul><li> for lists if applicable.
                - Use <p> for paragraphs.
                - Keep it simple and direct.
                
                CATEGORY: Pick EXACTLY one:
                | Category | Use When |
                |----------|----------|
                | "सरकारी योजना" | Welfare schemes, Subsidies, Benefits, Pension |
                | "भर्ती व रिजल्ट" | Scholarships, Job-related, Coaching, Berojgari, Scooty |
                
                CRITICAL RULES:
                - DO NOT add any new information.
                - DO NOT hallucinate facts not present in the source.
                - ONLY format what is given.
                
                OUTPUT FORMAT (JSON):
                {
                  "headline": "Same as source title",
                  "content": "<p>Formatted HTML...</p>",
                  "category": "सरकारी योजना"
                }
                `;

                const aiData = await aiWriter.writeArticle(prompt);

                if (aiData && aiData.content) {
                    console.log("     ✅ [Scheme Bot] AI Rewrite Successful.");
                    finalContent = aiData.content;

                    // Validate AI category
                    if (aiData.category && VALID_SCHEME_CATEGORIES.includes(aiData.category)) {
                        aiCategory = aiData.category;
                    }
                } else {
                    console.log("     ⚠️ [Scheme Bot] AI Failed. Using Raw Fallback.");
                    finalContent = `<p>${rawDesc}</p>`;
                }
            } else {
                console.log("     ℹ️ [Scheme Bot] Using Raw Description (AI Disabled).");
                finalContent = `<p>${rawDesc}</p>`;
            }

            // Final Category: AI > Code
            const category = aiCategory || codeCategory;
            if (aiCategory && aiCategory === codeCategory) {
                console.log(`     ✅ [Scheme Bot] Category VERIFIED: ${category}`);
            } else if (aiCategory) {
                console.log(`     🔄 [Scheme Bot] Category: ${category} (AI) | Code: ${codeCategory}`);
            } else {
                console.log(`     🏷️ [Scheme Bot] Category (fallback): ${category}`);
            }


            // 5. Append CTA
            const ctaHtml = `<br><div style="margin-top: 20px;">
                <a href="${officialLink}" target="_blank" style="display: inline-block; background: #e53e3e; color: white; padding: 10px 20px; font-weight: bold; text-decoration: none; border-radius: 5px; font-family: sans-serif;">👉 अभी आवेदन करें / पूरी जानकारी देखें ↗</a>
            </div>`;
            finalContent += ctaHtml;

            // 6. Save
            const schemeData = {
                headline: finalHeadline,
                content: finalContent,
                tags: [...(f.tags || []), category, 'Rajasthan'],
                category: category,
                sourceUrl: officialLink,
                imageUrl: getCategoryFallback(category),
                status: settings.articleStatus,
                author: 'SchemeBot'
            };

            const docId = `scheme-${slug}`;
            console.log(`     💾 [Scheme Bot] Saving to Firestore...`);
            await dbService.saveDocument('articles', schemeData, docId);

            console.log(`     🎉 [Scheme Bot] SUCCESS! Saved: "${finalHeadline}"`);
            savedCount++;

            // 7. Delay (20s Cooldown)
            if (savedCount + skippedCount < items.length) {
                console.log(`     ⏳ [Scheme Bot] Cooling down for 20s...`);
                await sleep(20000);
            }
        }

        console.log(`\n🎉 [Scheme Bot] Cycle Finished. New: ${savedCount}, Skipped: ${skippedCount}`);

    } catch (e) {
        const detail = e.response?.data ? JSON.stringify(e.response.data).substring(0, 500) : e.message;
        console.error(`  ❌ [Scheme Bot] Critical Error: ${detail}`);
    }
}

module.exports = { run };
