const axios = require('axios');
const cheerio = require('cheerio');
const aiWriter = require('../services/ai-writer');
const imageGen = require('../services/image-gen');
const dbService = require('../services/db-service');
const { getCategoryFallback } = require('../../lib/stockImages');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeUrl(url) {
    console.log(`     🕸️ [News Bot] Scraping: ${url}`);
    try {
        const { data } = await axios.get(url, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            timeout: 10000
        });
        const $ = cheerio.load(data);
        $('script, style, nav, footer, header, .advertisement, .ads, .sidebar, .comments, .related-posts').remove();
        
        let body = "";
        $('p').each((i, el) => {
            const text = $(el).text().trim();
            // Filter short junk lines
            if (text.length > 50) body += text + "\n\n";
        });
        
        if (body.length > 100) {
            console.log(`     ✅ [News Bot] Scraped ${body.length} chars.`);
            return body;
        } else {
            console.log(`     ⚠️ [News Bot] Scraped content too short.`);
            return null;
        }
    } catch (e) {
        console.log(`     ❌ [News Bot] Scraping failed: ${e.message}`);
        return null;
    }
}

async function run() {
    console.log("\n📰 [News Bot] Starting Execution (Direct Source: Patrika Nagaur) ...");

    // 1. GATEKEEPER
    const settings = await dbService.getBotSettings();
    console.log(`  ⚙️ [Admin] Bot Mode: ${settings.botMode.toUpperCase()} | AI: ${settings.enableAI ? 'ON' : 'OFF'} | IMG: ${settings.enableImageGen ? 'ON' : 'OFF'}`);

    if (!settings.isBotActive) {
        console.log("  🛑 [News Bot] Disabled by Admin. Exiting.");
        return;
    }

    if (!settings.enableAI) {
        console.log("  🛑 [News Bot] AI is disabled. Cannot process news. Exiting.");
        return;
    }

    // 2. FETCH LIST (Patrika Nagaur)
    const listUrl = "https://www.patrika.com/nagaur-news";
    console.log(`  ⏳ [News Bot] Fetching Article List from: ${listUrl}`);

    let articles = [];
    try {
        const { data } = await axios.get(listUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const $ = cheerio.load(data);

        $('a').each((i, el) => {
            const href = $(el).attr('href');
            const title = $(el).text().trim();
            
            // Filter: Must be in /nagaur-news/ and look like an article slug
            if (href && href.startsWith('/nagaur-news/') && href.split('-').length > 3) {
                const fullLink = "https://www.patrika.com" + href;
                // Avoid duplicates in the current list
                if (!articles.find(a => a.link === fullLink)) {
                    articles.push({
                        link: fullLink,
                        title: title || "Nagaur News Update",
                        source: 'Patrika'
                    });
                }
            }
        });
    } catch (e) {
        console.error(`  ❌ [News Bot] Failed to fetch list: ${e.message}`);
        return;
    }

    if (articles.length === 0) {
        console.log("  ⚠️ [News Bot] No articles found on Patrika page.");
        return;
    }

    // Limit to top 5 freshest to ensure we catch enough news
    const targetArticles = articles.slice(0, 5);
    console.log(`  🔍 [News Bot] Found ${articles.length} links. Checking top ${targetArticles.length} for new content...`);

    let processed = 0;
    let skipped = 0;

    for (const item of targetArticles) {
        // console.log(`\n  👉 [Item] Checking: "${item.title}"`);
        
        // 3. Duplicate Check
        const isDuplicate = await dbService.checkDuplicate('articles', 'sourceUrl', item.link);
        if (isDuplicate) {
            // Quietly skip duplicates to keep logs clean, or just a small marker
            // console.log(`     🔄 [Skip] Already in DB.`);
            skipped++;
            continue;
        }

        console.log(`\n  ✨ [News Bot] FRESH NEWS FOUND: "${item.title}"`);
        console.log(`     🔗 Link: ${item.link}`);

        // 4. Scrape Full Content
        const scrapedText = await scrapeUrl(item.link);
        if (!scrapedText) {
            console.log("     ⚠️ [News Bot] Skipping (Empty Content).");
            skipped++;
            continue;
        }

        // 5. AI Writer
        // Supreme Level Prompt for Nagaur News
        const promptContent = `
        ROLE: You are the Senior Editor for 'DailyDhandora', Nagaur's most trusted digital news portal.
        
        SOURCE MATERIAL:
        Headline: ${item.title}
        Raw Text: ${scrapedText.substring(0, 3000)}
        
        YOUR TASK:
        Write a high-quality news report in Hindi based ONLY on the source material.
        
        GUIDELINES:
        1. **Headline:** Create a punchy, click-worthy Hindi headline (max 15 words). Include the specific location (e.g., Merta, Ladnun).
        2. **Lead Paragraph:** Start with the most important update (Who, What, Where, When).
        3. **Details:** Use bullet points (<ul><li>) for key facts or timeline.
        4. **Tone:** Professional, Objective, Journalistic. No flowery language or "AI fluff".
        5. **Accuracy:** DO NOT invent facts. If date/time is missing, don't guess.
        6. **ORIGINALITY RULE (CRITICAL):** NEVER mention the source name "Patrika", "Rajasthan Patrika", or any scraping text like "Read more", "Click here". Write as if YOU (DailyDhandora) are the original reporter on the ground.
        
        OUTPUT FORMAT:
        Return a JSON object with:
        - "headline": (Your Hindi Headline)
        - "content": (HTML formatted body: <p>, <h3>, <ul>, <li>)
        - "tags": (Array of relevant tags like 'Nagaur News', 'Crime', 'Politics')
        - "image_prompt": (A detailed English prompt for an image generator based on the news context)
        `;

        const aiData = await aiWriter.writeArticle(promptContent);
        if (!aiData || !aiData.headline) {
            console.log("     ❌ [News Bot] AI Writing failed. Skipping item.");
            skipped++;
            continue;
        }

        // Force Category to 'Nagaur News' since source is Nagaur
        aiData.category = 'नागौर न्यूज़';

        // 6. Image Gen
        let imageUrl = null;
        if (settings.enableImageGen && settings.enableAI) {
            if (aiData.image_prompt) {
                imageUrl = await imageGen.generateImage(aiData.image_prompt);
            }
        } else {
            console.log("     ⚠️ [News Bot] Image Gen Disabled.");
        }
        
        if (!imageUrl) {
            imageUrl = getCategoryFallback('नागौर न्यूज़');
        }

        // 7. Save
        const articleData = {
            headline: aiData.headline,
            content: aiData.content
                .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/^\* (.*$)/gim, '<li>$1</li>'),
            tags: [...(aiData.tags || []), 'Nagaur', 'Rajasthan News'],
            category: 'नागौर न्यूज़',
            sourceUrl: item.link,
            imageUrl: imageUrl,
            status: settings.articleStatus,
            author: 'NewsBot (Patrika)'
        };

        await dbService.saveDocument('articles', articleData);
        console.log(`     ✅ [News Bot] SAVED: ${aiData.headline}`);
        processed++;

        // 8. Delay (20s Rule)
        if (processed + skipped < targetArticles.length) {
            console.log(`     ⏳ [News Bot] Cooling down for 20s...`);
            await sleep(20000);
        }
    }
    console.log(`\n🎉 [News Bot] Cycle Finished. Processed: ${processed}, Skipped: ${skipped}.`);
}

module.exports = { run };
