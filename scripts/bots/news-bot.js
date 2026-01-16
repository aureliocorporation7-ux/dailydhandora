const axios = require('axios');
const cheerio = require('cheerio');
const mandiBot = require('./mandi-bot');
const aiWriter = require('../services/ai-writer');
const imageGen = require('../services/image-gen');
const newsCardGen = require('../services/news-card-gen');
const dbService = require('../services/db-service');
const { generateAndStoreAudio } = require('../services/audio-gen');
const { getCategoryFallback } = require('../../lib/stockImages');
const { isFresh } = require('../../lib/dateUtils');
const { getPrompt, fillTemplate } = require('../services/prompt-service');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ========================================== 
// 0. CORE: FAULT-TOLERANT SCRAPING HELPER
// ========================================== 
async function scrapeWithFallback(url, primaryScraperFn) {
    // --- PLAN A: Primary Scraper (Cheerio) ---
    try {
        const result = await primaryScraperFn(url);
        if (result && result.body && result.body.length > 200) {
            return result; // ✅ Plan A Success
        }
        console.log(`     ⚠️ [Scraper] Plan A failed/short for: ${url}. Initiating Fallback...`);
    } catch (e) {
        console.log(`     ⚠️ [Scraper] Plan A Error: ${e.message}. Initiating Fallback...`);
    }

    // --- PLAN B: Jina Reader API (The Savior) ---
    try {
        console.log(`     🛡️ [Scraper] Invoking Plan B (Jina AI)...`);
        const { data } = await axios.get(`https://r.jina.ai/${url}`, {
            headers: { 'Accept': 'application/json' },
            timeout: 20000
        });

        if (data && data.data && data.data.content) {
            console.log(`     ✅ [Scraper] Plan B Success (Jina)!`);
            return {
                headline: data.data.title || "News Update",
                body: data.data.content
            };
        }
    } catch (e) {
        console.log(`     ❌ [Scraper] Plan B Failed: ${e.message}`);
    }

    console.log(`     ❌ [Scraper] CRITICAL: All methods failed for ${url}`);
    return null;
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
    return scrapeWithFallback(url, async (targetUrl) => {
        console.log(`     🕸️ [Bhaskar] Plan A (Cheerio): ${targetUrl}`);
        const { data } = await axios.get(targetUrl, {
            headers: BHASKAR_HEADERS,
            timeout: 15000
        });
        const $ = cheerio.load(data);

        // ✅ STRICT DATE CHECK ENABLED (Today + Yesterday allowed)
        let pubDate = $('meta[property="article:published_time"]').attr('content') ||
            $('meta[name="publish-date"]').attr('content');
        if (pubDate && !isFresh(pubDate)) {
            console.log(`     📅 [Bhaskar] Skipping: Old news from ${pubDate}`);
            throw new Error("Old News"); // Throw to stop fallback if news is just old
        }

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

        return { headline, body: bodyText };
    });
}

async function fetchBhaskarNews(settings) {
    // 🌐 MULTI-SOURCE: Scrape from Nagaur + Merta for comprehensive coverage
    const sources = [
        { url: `https://www.bhaskar.com/local/rajasthan/nagaur?t=${Date.now()}`, name: 'Nagaur', pattern: '/local/rajasthan/nagaur/news/' },
        { url: `https://www.bhaskar.com/local/rajasthan/nagaur/merta?t=${Date.now()}`, name: 'Merta', pattern: '/local/rajasthan/nagaur/merta/news/' }
    ];

    console.log(`  ⏳ [News Bot] 1. Checking PRIMARY: Dainik Bhaskar (Nagaur + Merta)`);

    let articles = [];

    // Fetch from all sources
    for (const source of sources) {
        try {
            const { data } = await axios.get(source.url, {
                headers: {
                    ...BHASKAR_HEADERS,
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                },
                timeout: 15000
            });
            const $ = cheerio.load(data);

            let sourceCount = 0;
            $('a').each((i, el) => {
                const link = $(el).attr('href');
                // Accept links from both Nagaur and Merta news sections
                if (link && (link.includes('/local/rajasthan/nagaur/news/') || link.includes('/local/rajasthan/nagaur/merta/news/')) && !link.includes('/rss/')) {
                    const fullLink = link.startsWith('http') ? link : `https://www.bhaskar.com${link}`;
                    if (!articles.find(a => a.link === fullLink)) {
                        articles.push({ link: fullLink, source: source.name });
                        sourceCount++;
                    }
                }
            });
            console.log(`     ✅ [${source.name}] Found ${sourceCount} articles`);
        } catch (e) {
            console.error(`     ❌ [${source.name}] Failed: ${e.message}`);
            // Continue to next source instead of returning 0
        }
    }

    if (articles.length === 0) {
        console.log(`     ⚠️ No articles found from any source`);
        return 0;
    }

    console.log(`     📰 Total unique articles: ${articles.length}`);

    articles.sort((a, b) => {
        const getId = (url) => {
            const match = url.match(/-(\d+)\.html/);
            return match ? parseInt(match[1], 10) : 0;
        };
        return getId(b.link) - getId(a.link);
    });

    const targetArticles = articles.slice(0, 15); // Increased from 5 to 15 to find Mandi news
    let processedCount = 0;

    for (const item of targetArticles) {
        const isDuplicate = await dbService.checkDuplicate('articles', 'sourceUrl', item.link);
        if (isDuplicate) continue;

        const scrapedData = await scrapeBhaskarArticle(item.link);
        if (!scrapedData) continue;

        // 🌾 INTERCEPT: Check if this is actually Mandi Bhav news
        const checkText = (scrapedData.headline + " " + scrapedData.body).toLowerCase();

        // ========================================
        // 🛡️ STRICT MANDI DETECTION SYSTEM v2.0
        // ========================================

        // 1. PRICE PATTERN CHECK - Must have actual price data
        // Pattern: numbers (3-6 digits) followed by rupee terms
        const pricePattern = /(\d{3,6})\s*(रुपये|रुपए|रु\.?|₹|rs\.?|rupees?)/i;
        const unitPattern = /(प्रति\s*क्विंटल|per\s*quintal|क्विंटल|quintal|\/क्विं)/i;
        const hasPriceData = pricePattern.test(checkText) && unitPattern.test(checkText);

        // 2. STRICT MANDI-SPECIFIC TERMS (not just crop names)
        const strictMandiTerms = [
            'मंडी भाव', 'मंडी रेट', 'मंडी में भाव', 'फसल भाव', 'फसल दर',
            'बोली लगी', 'खरीदी हुई', 'आवक रही', 'कृषि उपज मंडी',
            'mandi bhav', 'mandi rate', 'krishi upaj mandi'
        ];
        const hasMandiContext = strictMandiTerms.some(t => checkText.includes(t));

        // 3. BLACKLIST - These words NEVER appear in Mandi news
        const mandiBlacklist = [
            // Sports
            'कबड्डी', 'kabaddi', 'क्रिकेट', 'cricket', 'खेल', 'sport', 'प्रतियोगिता', 'competition',
            'टूर्नामेंट', 'tournament', 'मैच', 'match', 'खिलाड़ी', 'player', 'टीम', 'team',
            'स्वर्ण', 'gold medal', 'रजत', 'silver', 'कांस्य', 'bronze', 'पदक', 'medal',
            // Crime/Police
            'गिरफ्तार', 'arrest', 'हत्या', 'murder', 'पुलिस', 'police', 'थाना', 'fir',
            'चोरी', 'theft', 'लूट', 'robbery', 'दुर्घटना', 'accident',
            // Politics
            'चुनाव', 'election', 'वोट', 'vote', 'नेता', 'विधायक', 'mla', 'mp', 'सांसद',
            // Entertainment
            'बॉलीवुड', 'bollywood', 'फिल्म', 'film', 'अभिनेता', 'actor'
        ];
        const hasBlacklistedWord = mandiBlacklist.some(w => checkText.includes(w));

        // 4. DECISION LOGIC:
        // Route to Mandi ONLY if: (Has Price Data OR Has Strict Mandi Terms) AND NO Blacklisted Words
        const shouldRouteToMandi = (hasPriceData || hasMandiContext) && !hasBlacklistedWord;

        if (shouldRouteToMandi) {
            console.log(`\n  🌾 [News Bot] DETECTED MANDI NEWS (Strict Check Passed)`);
            console.log(`     📊 Price Pattern: ${hasPriceData}, Mandi Terms: ${hasMandiContext}, Blacklist: ${hasBlacklistedWord}`);

            // Generate Enforced Date (Today's Date in IST)
            const todayIST = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'long', day: 'numeric' });

            const mandiResult = await mandiBot.processRawMandiData(scrapedData.headline, scrapedData.body, item.link, settings, todayIST);

            // 🛡️ REJECTION HANDLER: If Mandi Bot rejects, process as general news
            if (mandiResult && mandiResult.rejected) {
                console.log(`     ↩️ [News Bot] Mandi REJECTED (${mandiResult.reason}). Processing as General News...`);
                const success = await processAndSave(scrapedData.headline, scrapedData.body, item.link, 'Dainik Bhaskar', settings);
                if (success) processedCount++;
            } else if (mandiResult === true) {
                processedCount++;
            }
            continue; // Skip normal news processing either way
        } else if (hasBlacklistedWord) {
            // Log why it was blocked from Mandi
            const matched = mandiBlacklist.find(w => checkText.includes(w));
            console.log(`     🚫 [News Bot] Mandi BLOCKED: Found blacklisted term "${matched}"`);
        }

        console.log(`\n  ✨ [Bhaskar] NEW LATEST NEWS: ${scrapedData.headline}`);
        const success = await processAndSave(scrapedData.headline, scrapedData.body, item.link, 'Dainik Bhaskar', settings);
        if (success) processedCount++;

        if (processedCount >= 6) break; // Increased limit to allow more news + mandi
        await sleep(5000); // Polite delay
    }

    return processedCount;
}


// ========================================== 
// 2. PATRIKA SCRAPER (FALLBACK)
// ========================================== 
async function scrapePatrikaArticle(url) {
    return scrapeWithFallback(url, async (targetUrl) => {
        console.log(`     🕸️ [Patrika] Plan A (Cheerio): ${targetUrl}`);
        const { data } = await axios.get(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 10000
        });
        const $ = cheerio.load(data);

        // --- STRICT DATE CHECK (Today Only) ---
        let pubDate = $('meta[property="article:published_time"]').attr('content') ||
            $('meta[name="publish-date"]').attr('content');

        if (!pubDate) {
            const ldJson = $('script[type="application/ld+json"]').html();
            if (ldJson) {
                const match = ldJson.match(/"datePublished":\s*"(.*?)"/);
                if (match) pubDate = match[1];
            }
        }

        if (pubDate && !isFresh(pubDate)) {
            console.log(`     📅 [Patrika] Skipping: Old news from ${pubDate}`);
            throw new Error("Old News");
        }

        $('script, style, nav, footer, header, .advertisement, .ads, .sidebar, .comments, .related-posts').remove();

        let body = "";
        $('p').each((i, el) => {
            const text = $(el).text().trim();
            if (text.length > 50) body += text + "\n\n";
        });

        const headline = $('h1').first().text().trim() || "Nagaur News";
        return { headline, body };
    });
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
    // 🧠 DYNAMIC PROMPT (Hybrid: DB > Code) with AI Category Verification
    const DEFAULT_USER_PROMPT = `
    ROLE: Senior Editor for DailyDhandora (Nagaur's trusted news portal).
    
    SOURCE:
    Headline: {{headline}}
    Raw Text: {{body}}
    Source: {{sourceName}}
    
    TASK: Write Hindi news report AND classify into correct category.
    
    GUIDELINES:
    1. **Headline**: Click-worthy, <15 words, Hindi.
    2. **Content**: 300-500 words, HTML (<p>, <ul>, <li>, <h3>).
    3. **Rules**: No rival mentions (Bhaskar/Patrika). Use "हमारे [Tehsil] संवाददाता".
    
    4. **Category**: Pick EXACTLY one from this table:
    
    | Category | Use When (Examples) |
    |----------|---------------------|
    | "मंडी भाव" | Crop rates, Mandi prices (Sarso, Moong, Chana, Gehu prices) |
    | "नागौर न्यूज़" | Local news, Accidents, Events, Crime, Weather, Politics |
    | "शिक्षा विभाग" | Teachers: Transfer, Salary, DA, Promotion, Seniority |
    | "सरकारी योजना" | Government schemes, Subsidies, Benefits, Welfare |
    | "भर्ती व रिजल्ट" | Jobs: Vacancy, Result, Admit Card, Exam, Recruitment |
    
    ⚠️ IMPORTANT: Use EXACT Hindi category name from table. No variations!
    
    OUTPUT FORMAT (JSON only):
    {
      "headline": "Hindi headline here",
      "content": "<p>...</p>",
      "tags": ["Nagaur", "Rajasthan"],
      "category": "मंडी भाव"
    }
    `;


    const rawPrompt = await getPrompt('PROMPT_USER_NEWS', DEFAULT_USER_PROMPT);
    const promptContent = fillTemplate(rawPrompt, {
        headline: rawHeadline,
        body: rawBody.substring(0, 3000),
        sourceName: sourceName
    });

    const aiData = await aiWriter.writeArticle(promptContent);
    if (!aiData || !aiData.headline) {
        console.log("     ❌ [News Bot] AI Writing failed.");
        return false;
    }

    // 🛡️ SANITIZE AI OUTPUT (Remove Blacklisted Words)
    const cleanHeadline = sanitizeContent(aiData.headline);
    const cleanContent = sanitizeContent(aiData.content);

    // 🏷️ AI CATEGORY VERIFICATION (Dual-Layer)
    const VALID_CATEGORIES = ['मंडी भाव', 'नागौर न्यूज़', 'शिक्षा विभाग', 'सरकारी योजना', 'भर्ती व रिजल्ट'];

    function normalizeCategory(cat) {
        if (!cat) return null;
        const lower = cat.toLowerCase();

        // Mandi variations
        if (lower.includes('मंडी') || lower.includes('mandi') || lower.includes('भाव') || lower.includes('rate') || lower.includes('crop'))
            return 'मंडी भाव';
        // Recruitment variations
        if (lower.includes('भर्ती') || lower.includes('रिजल्ट') || lower.includes('exam') || lower.includes('vacancy') || lower.includes('result'))
            return 'भर्ती व रिजल्ट';
        // Education variations
        if (lower.includes('शिक्षा') || lower.includes('विभाग') || lower.includes('education') || lower.includes('teacher'))
            return 'शिक्षा विभाग';
        // Scheme variations
        if (lower.includes('योजना') || lower.includes('scheme') || lower.includes('subsidy') || lower.includes('welfare'))
            return 'सरकारी योजना';
        // Local news
        if (lower.includes('नागौर') || lower.includes('nagaur') || lower.includes('local') || lower.includes('news'))
            return 'नागौर न्यूज़';

        if (VALID_CATEGORIES.includes(cat)) return cat;
        return null;
    }

    // Code-level keyword detection (fallback)
    const contentCheck = `${rawHeadline} ${rawBody}`.toLowerCase();
    const mandiKeywords = ['मंडी', 'mandi', 'भाव', 'rate', 'क्विंटल', 'quintal', 'सरसों', 'मूंग', 'गेहूं', 'चना', 'sarso', 'moong', 'crop price'];
    const recruitKeywords = ['भर्ती', 'vacancy', 'result', 'परीक्षा', 'exam', 'admit card', 'answer key', 'reet', 'rpsc'];
    const eduKeywords = ['transfer', 'तबादला', 'salary', 'वेतन', 'seniority', 'वरिष्ठता', 'promotion', 'पदोन्नति'];
    const schemeKeywords = ['योजना', 'scheme', 'subsidy', 'benefit', 'welfare', 'आवेदन'];

    let codeCategory = 'नागौर न्यूज़'; // Default
    if (mandiKeywords.some(kw => contentCheck.includes(kw))) codeCategory = 'मंडी भाव';
    else if (recruitKeywords.some(kw => contentCheck.includes(kw))) codeCategory = 'भर्ती व रिजल्ट';
    else if (eduKeywords.some(kw => contentCheck.includes(kw))) codeCategory = 'शिक्षा विभाग';
    else if (schemeKeywords.some(kw => contentCheck.includes(kw))) codeCategory = 'सरकारी योजना';

    // AI Category (primary) with normalization
    const aiCategory = normalizeCategory(aiData.category);

    // Final Category: AI > Code
    let verifiedCategory;
    if (aiCategory) {
        verifiedCategory = aiCategory;
        if (aiCategory === codeCategory) {
            console.log(`     ✅ [News Bot] Category VERIFIED: ${verifiedCategory}`);
        } else {
            console.log(`     🔄 [News Bot] Category: ${verifiedCategory} (AI) | Code: ${codeCategory}`);
        }
    } else {
        verifiedCategory = codeCategory;
        console.log(`     🏷️ [News Bot] Category (fallback): ${verifiedCategory}`);
    }


    // 🔄 SMART IMAGE FALLBACK SYSTEM
    // Priority: AI Generated → Stock Image → Card (for WhatsApp essentials)
    const imageResult = await imageGen.getImageWithFallback(
        verifiedCategory, // Use verified category for image selection
        cleanHeadline,
        aiData.image_prompt,
        settings
    );
    const imageUrl = imageResult.url;
    const imageType = imageResult.type; // 'ai_generated' | 'stock' | 'card' | 'fallback'

    // 🎴 GENERATE WHATSAPP SHARE CARD (Viral Feature)
    // Only generate separate card if image is clean (not already a card)
    let shareCardUrl = null;
    if (imageType !== 'card') {
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
    } else {
        // If image IS a card, use it as shareCard too
        shareCardUrl = imageUrl;
        console.log("     ℹ️ [News Bot] Image is already a card, using as shareCardUrl");
    }

    const articleData = {
        headline: cleanHeadline,
        content: cleanContent
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/^\* (.*$)/gim, '<li>$1</li>'),
        tags: [...(aiData.tags || []), 'Nagaur', 'Rajasthan News'],
        category: verifiedCategory, // VERIFIED by AI + Code
        sourceUrl: sourceUrl,
        imageUrl: imageUrl,
        imageType: imageType, // NEW: Store image type for UI logic
        shareCardUrl: shareCardUrl || imageUrl, // Fallback to normal image if card fails
        status: settings.articleStatus,
        author: `NewsBot (${sourceName})`
    };

    const savedId = await dbService.saveDocument('articles', articleData);
    if (savedId) {
        console.log(`     ✅ [News Bot] SAVED: ${cleanHeadline} (ID: ${savedId})`);

        // 🎙️ GENERATE AUDIO (ElevenLabs + Cloudinary)
        // Now using the "Build-Safe" implementation with shared Firebase connection
        try {
            if (settings.enableAI && settings.enableAudioGen) { // Check Master Toggle
                await generateAndStoreAudio(cleanContent, savedId);
            } else {
                console.log(`     🔇 [Audio] Skipped: Audio Gen is DISABLED in Settings.`);
            }
        } catch (audioErr) {
            console.error(`     ⚠️ [Audio] Gen Failed: ${audioErr.message}`);
        }

        return true;
    }
    return false;
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

// Standalone execution - Run if called directly
if (require.main === module) {
    run().then(() => {
        console.log('📰 [News Bot] Standalone execution complete.');
        process.exit(0);
    }).catch(err => {
        console.error('❌ [News Bot] Error:', err.message);
        process.exit(1);
    });
}