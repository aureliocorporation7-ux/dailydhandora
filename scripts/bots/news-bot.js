const axios = require('axios');
const cheerio = require('cheerio');
const aiWriter = require('../services/ai-writer');
const imageGen = require('../services/image-gen');
const newsCardGen = require('../services/news-card-gen');
const dbService = require('../services/db-service');
const { getCategoryFallback } = require('../../lib/stockImages');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Helper: Checks if a date string refers to today.
 */
function isToday(dateStr) {
    if (!dateStr) return false;
    try {
        const articleDate = new Date(dateStr);
        const today = new Date();
        return articleDate.getDate() === today.getDate() &&
               articleDate.getMonth() === today.getMonth() &&
               articleDate.getFullYear() === today.getFullYear();
    } catch (e) {
        return false;
    }
}

/**
 * 🛡️ FINAL SAFETY LAYER: SANITIZER
 * Removes any accidental mentions of rival news agencies from AI output.
 */
function sanitizeContent(text) {
    if (!text) return "";
    
    // List of forbidden words (Case insensitive mostly via Regex)
    const blacklist = [
        /Dainik Bhaskar/gi,
        /Rajasthan Patrika/gi,
        /Patrika/gi,
        /Bhaskar/gi,
        /दैनिक भास्कर/g,
        /राजस्थान पत्रिका/g,
        /पत्रिका/g,
        /भास्कर/g,
        /Source:/gi,
        /Agency:/gi,
        /According to reports/gi,
        /रिपोर्ट्स के अनुसार/g
    ];

    let cleanText = text;
    blacklist.forEach(regex => {
        cleanText = cleanText.replace(regex, ""); // Remove silently
    });

    // Clean up any double spaces or awkward punctuation left behind
    cleanText = cleanText.replace(/\s\s+/g, ' ').replace(/ \./g, '.').trim();
    
    return cleanText;
}

// ========================================== 
// 1. DAINIK BHASKAR SCRAPER (PRIMARY)
// ========================================== 
const BHASKAR_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
    'Referer': 'https://www.google.com/'
};

async function scrapeBhaskarArticle(url) {
    console.log(`     🕸️ [Bhaskar] Scraping Content: ${url}`);
    try {
        const { data } = await axios.get(url, {
            headers: BHASKAR_HEADERS,
            timeout: 15000
        });
        const $ = cheerio.load(data);

        // REMOVED STRICT DATE CHECK: Relying on DB duplicate check instead.
        // This ensures we don't miss late-night news fetched the next morning.
        /*
        let pubDate = $('meta[property="article:published_time"]').attr('content');
        if (pubDate && !isToday(pubDate)) {
            console.log(`     📅 [Bhaskar] Skipping: Old news from ${pubDate}`);
            return null;
        }
        */

        const headline = $('h1').first().text().trim();
        let bodyText = '';
        let maxPTags = 0;
        let contentContainer = null;

        $('div').each((i, div) => {
            const pCount = $(div).find('p').length;
            if (pCount > maxPTags && pCount < 50) { 
                maxPTags = pCount;
                contentContainer = div;
            }
        });

        if (contentContainer) {
            $(contentContainer).find('p').each((i, p) => {
                const text = $(p).text().trim();
                if (text && !text.includes('App Download') && !text.includes('whatsapp') && !text.includes('dainikbhaskar')) {
                    bodyText += text + '\n\n';
                }
            });
        } else {
            $('article p').each((i, p) => {
                bodyText += $(p).text().trim() + '\n\n';
            });
        }

        if (bodyText.length > 100) {
            return { headline, body: bodyText };
        }
        return null;
    } catch (e) {
        console.log(`     ❌ [Bhaskar] Scraping failed: ${e.message}`);
        return null;
    }
}

async function fetchBhaskarNews(settings) {
    // Anti-Caching: Add timestamp to force fresh fetch
    const listUrl = `https://www.bhaskar.com/local/rajasthan/nagaur?t=${Date.now()}`;
    console.log(`  ⏳ [News Bot] 1. Checking PRIMARY: Dainik Bhaskar (Fresh Fetch)`);

    let articles = [];
    try {
        const { data } = await axios.get(listUrl, {
            headers: {
                ...BHASKAR_HEADERS,
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
        const $ = cheerio.load(data);

        $('a').each((i, el) => {
            const link = $(el).attr('href');
            if (link && link.includes('/local/rajasthan/nagaur/news/') && !link.includes('/rss/')) {
                const fullLink = link.startsWith('http') ? link : `https://www.bhaskar.com${link}`;
                if (!articles.find(a => a.link === fullLink)) {
                    articles.push({ link: fullLink });
                }
            }
        });
    } catch (e) {
        console.error(`  ❌ [Bhaskar] Failed to fetch list: ${e.message}`);
        return 0;
    }

    if (articles.length === 0) return 0;

    articles.sort((a, b) => {
        const getId = (url) => {
            const match = url.match(/-(\d+)\.html/);
            return match ? parseInt(match[1], 10) : 0;
        };
        return getId(b.link) - getId(a.link);
    });

    const targetArticles = articles.slice(0, 5);
    let processedCount = 0;

    for (const item of targetArticles) {
        const isDuplicate = await dbService.checkDuplicate('articles', 'sourceUrl', item.link);
        if (isDuplicate) continue;

        const scrapedData = await scrapeBhaskarArticle(item.link);
        if (!scrapedData) continue;

        console.log(`\n  ✨ [Bhaskar] NEW LATEST NEWS: ${scrapedData.headline}`);
        const success = await processAndSave(scrapedData.headline, scrapedData.body, item.link, 'Dainik Bhaskar', settings);
        if (success) processedCount++;

        if (processedCount >= 3) break; 
        await sleep(5000); // Polite delay
    }

    return processedCount;
}


// ========================================== 
// 2. PATRIKA SCRAPER (FALLBACK)
// ========================================== 
async function scrapePatrikaArticle(url) {
    console.log(`     🕸️ [Patrika] Scraping: ${url}`);
    try {
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 10000
        });
        const $ = cheerio.load(data);

        // --- STRICT DATE CHECK (Today Only) ---
        // Patrika uses JSON-LD or meta tags
        let pubDate = $('meta[property="article:published_time"]').attr('content') || 
                      $('meta[name="publish-date"]').attr('content');
        
        // Also check JSON-LD if meta fails
        if (!pubDate) {
            const ldJson = $('script[type="application/ld+json"]').html();
            if (ldJson) {
                const match = ldJson.match(/"datePublished":\s*"(.*?)"/);
                if (match) pubDate = match[1];
            }
        }

        if (pubDate && !isToday(pubDate)) {
            console.log(`     📅 [Patrika] Skipping: Old news from ${pubDate}`);
            return null;
        }
        
        $('script, style, nav, footer, header, .advertisement, .ads, .sidebar, .comments, .related-posts').remove();
        
        let body = "";
        $('p').each((i, el) => {
            const text = $(el).text().trim();
            if (text.length > 50) body += text + "\n\n";
        });
        
        const headline = $('h1').first().text().trim() || "Nagaur News";

        if (body.length > 100) return { headline, body };
        return null;
    } catch (e) {
        console.log(`     ❌ [Patrika] Scraping failed: ${e.message}`);
        return null;
    }
}

async function fetchPatrikaNews(settings) {
    const listUrl = "https://www.patrika.com/nagaur-news";
    console.log(`  ⚠️ [News Bot] 2. Checking FALLBACK: Patrika (${listUrl})`);

    let articles = [];
    try {
        const { data } = await axios.get(listUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const $ = cheerio.load(data);

        $('a').each((i, el) => {
            const href = $(el).attr('href');
            if (href && href.startsWith('/nagaur-news/') && href.split('-').length > 3) {
                const fullLink = "https://www.patrika.com" + href;
                if (!articles.find(a => a.link === fullLink)) {
                    articles.push({ link: fullLink });
                }
            }
        });
    } catch (e) {
        console.error(`  ❌ [Patrika] Failed to fetch list: ${e.message}`);
        return 0;
    }

    // Patrika doesn't have IDs in URL for sorting easily, assuming top is latest
    const targetArticles = articles.slice(0, 5);
    let processedCount = 0;

    for (const item of targetArticles) {
        const isDuplicate = await dbService.checkDuplicate('articles', 'sourceUrl', item.link);
        if (isDuplicate) continue;

        const scrapedData = await scrapePatrikaArticle(item.link);
        if (!scrapedData) continue; // Will be null if old news or scraping failed

        console.log(`\n  ✨ [Patrika] FRESH FALLBACK NEWS: "${scrapedData.headline}"`);
        const success = await processAndSave(scrapedData.headline, scrapedData.body, item.link, 'Patrika', settings);
        if (success) processedCount++;
        
        if (processedCount >= 3) break;
        await sleep(5000);
    }

    return processedCount;
}


// ========================================== 
// 3. COMMON PROCESSING (AI + DB)
// ========================================== 
async function processAndSave(rawHeadline, rawBody, sourceUrl, sourceName, settings) {
    // Supreme Level Prompt
    const promptContent = `
    ROLE: You are the Senior Editor for 'DailyDhandora', Nagaur's most trusted digital news portal.
    
    SOURCE MATERIAL:
    Headline: ${rawHeadline}
    Raw Text: ${rawBody.substring(0, 3000)}
    Original Source: ${sourceName}
    
    YOUR TASK:
    Write a high-quality news report in Hindi based ONLY on the source material.
    
    GUIDELINES:
    1. **Headline:** Create a punchy, click-worthy Hindi headline (max 15 words). Include the specific location (e.g., Merta, Ladnun).
    2. **Lead Paragraph:** Start with the most important update (Who, What, Where, When).
    3. **Details:** Use bullet points (<ul><li>) for key facts or timeline.
    4. **Tone:** Professional, Objective, Journalistic. No flowery language or "AI fluff".
    5. **Accuracy:** DO NOT invent facts. If date/time is missing, don't guess.
    6. **ORIGINALITY RULE (CRITICAL):** NEVER mention the source name "${sourceName}", "Dainik Bhaskar", "Patrika" or scraping text. Write as if YOU (DailyDhandora) are the original reporter.
    
    OUTPUT FORMAT:
    Return a JSON object with:
    - "headline": (Your Hindi Headline)
    - "content": (HTML formatted body: <p>, <h3>, <ul>, <li>)
    - "tags": (Array of relevant tags like 'Nagaur News', 'Crime', 'Politics')
    - "image_prompt": (A detailed English prompt for an image generator based on the news context)
    `;

    const aiData = await aiWriter.writeArticle(promptContent);
    if (!aiData || !aiData.headline) {
        console.log("     ❌ [News Bot] AI Writing failed.");
        return false;
    }

    // 🛡️ SANITIZE AI OUTPUT (Remove Blacklisted Words)
    const cleanHeadline = sanitizeContent(aiData.headline);
    const cleanContent = sanitizeContent(aiData.content);

    let imageUrl = null;
    if (settings.enableImageGen && settings.enableAI && aiData.image_prompt) {
        imageUrl = await imageGen.generateImage(aiData.image_prompt);
    }
    
    if (!imageUrl) {
        imageUrl = getCategoryFallback('नागौर न्यूज़');
    }

    // 🎴 GENERATE WHATSAPP SHARE CARD (Viral Feature)
    let shareCardUrl = null;
    try {
        console.log("     🎨 [News Bot] Generating Viral News Card...");
        const cardBuffer = await newsCardGen.generateNewsCard(imageUrl, cleanHeadline);
        if (cardBuffer) {
            shareCardUrl = await imageGen.uploadToImgBB(cardBuffer);
            if (shareCardUrl) console.log("     ✅ [News Bot] News Card Created & Uploaded!");
        }
    } catch (e) {
        console.error(`     ⚠️ [News Bot] Card Gen Failed: ${e.message}`);
    }

    const articleData = {
        headline: cleanHeadline,
        content: cleanContent
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/^\* (.*$)/gim, '<li>$1</li>'),
        tags: [...(aiData.tags || []), 'Nagaur', 'Rajasthan News'],
        category: 'नागौर न्यूज़',
        sourceUrl: sourceUrl,
        imageUrl: imageUrl,
        shareCardUrl: shareCardUrl || imageUrl, // Fallback to normal image if card fails
        status: settings.articleStatus,
        author: `NewsBot (${sourceName})`
    };

    await dbService.saveDocument('articles', articleData);
    console.log(`     ✅ [News Bot] SAVED: ${cleanHeadline}`);
    return true;
}


// ========================================== 
// 4. MAIN RUNNER
// ========================================== 
async function run() {
    console.log("\n📰 [News Bot] Starting Execution...");

    const settings = await dbService.getBotSettings();
    if (!settings.isBotActive || !settings.enableAI) {
        console.log("  🛑 [News Bot] Disabled or AI OFF. Exiting.");
        return;
    }

    // STEP 1: Try Primary (Dainik Bhaskar)
    const bhaskarCount = await fetchBhaskarNews(settings);

    // STEP 2: Fallback (Patrika) if Bhaskar found nothing new
    if (bhaskarCount === 0) {
        console.log("  ⚠️ [News Bot] No new news from Primary source. Checking Fallback...");
        const patrikaCount = await fetchPatrikaNews(settings);
        if (patrikaCount === 0) {
            console.log("  😴 [News Bot] No new news found today on either source.");
        }
    } else {
        console.log(`  🎉 [News Bot] Success! Processed ${bhaskarCount} articles from Bhaskar.`);
    }
    
    console.log(`\n🎉 [News Bot] Cycle Finished.`);
}

module.exports = { run };