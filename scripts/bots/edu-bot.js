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
    try {
        const { data } = await axios.get(url, { headers: BHASKAR_HEADERS, timeout: 10000 });
        const $ = cheerio.load(data);
        const headline = $('h1').first().text().trim();
        let bodyText = '';
        
        // 1. DATE EXTRACTION
        const publishedTime = $('meta[property="article:published_time"]').attr('content') || 
                              $('meta[name="publish-date"]').attr('content');

        // Bhaskar specific content extraction
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
                if (text && !text.includes('App Download') && !text.includes('whatsapp')) {
                    bodyText += text + '\n\n';
                }
            });
        } else {
            $('article p').each((i, p) => {
                bodyText += $(p).text().trim() + '\n\n';
            });
        }
        
        return { headline, body: bodyText, publishedTime };
    } catch (e) {
        console.error(`     ❌ [Edu Bot] Scrape Error: ${e.message}`);
        return null;
    }
}

async function run() {
    console.log("\n🎓 [Edu Bot] Starting Rajasthan Education Hunter...");

    // 1. GATEKEEPER
    const settings = await dbService.getBotSettings();
    if (!settings.isBotActive) {
        console.log("  🛑 [Edu Bot] Disabled by Admin. Exiting.");
        return;
    }

    // 2. TARGETS
    // We target Nagaur feed because it often contains state-level edu news too (Bikaner/Jaipur orders often appear in local feeds).
    const targets = [
        { name: "Nagaur District", url: "https://www.bhaskar.com/local/rajasthan/nagaur" }
    ];

    const eduKeywords = [
        'shala darpan', 'शाला दर्पण', 
        'rpsc', 'rsmssb', 
        'reet', 'रीट', 
        'shiksha', 'शिक्षा', 
        'teacher', 'शिक्षक', 
        'school', 'स्कूल', 
        'exam', 'परीक्षा', 
        'result', 'परिणाम', 
        'bikaner nideshalaya', 'बीकानेर निदेशालय',
        'doep', 'शिक्षा विभाग'
    ];

    const rajasthanKeywords = ['rajasthan', 'nagaur', 'bikaner', 'jaipur', 'राजस्थान', 'नागौर', 'बीकानेर', 'जयपुर'];

    let processedCount = 0;

    for (const target of targets) {
        console.log(`  🔭 [Edu Bot] Scouting ${target.name}...`);
        try {
            const { data } = await axios.get(`${target.url}?t=${Date.now()}`, { headers: BHASKAR_HEADERS });
            const $ = cheerio.load(data);
            
            const potentialLinks = [];

            $('a').each((i, el) => {
                const link = $(el).attr('href');
                const title = $(el).text().toLowerCase();
                
                if (link && link.includes('/news/') && !link.includes('/rss/')) {
                    // 1. Check for Education Keywords
                    const hasEduKeyword = eduKeywords.some(k => title.includes(k));
                    
                    // 2. Security Check: Must be Rajasthan relevant
                    // (The URL is already local/rajasthan, so implicitly yes, but good to be safe)
                    
                    if (hasEduKeyword) {
                        const fullLink = link.startsWith('http') ? link : `https://www.bhaskar.com${link}`;
                        if (!potentialLinks.includes(fullLink)) {
                            potentialLinks.push(fullLink);
                        }
                    }
                }
            });

            console.log(`     found ${potentialLinks.length} potential edu articles.`);

            // Process discovered links
            for (const link of potentialLinks) {
                const isDuplicate = await dbService.checkDuplicate('articles', 'sourceUrl', link);
                if (isDuplicate) continue;

                console.log(`     🎯 [Edu Bot] Target Acquired: ${link}`);
                const article = await scrapeBhaskarArticle(link);
                
                if (article && article.body.length > 100) {
                     // 🛑 DATE FRESHNESS CHECK (48h Window)
                     if (article.publishedTime) {
                         const pubDate = new Date(article.publishedTime);
                         const now = new Date();
                         const diffHours = (now - pubDate) / (1000 * 60 * 60);
                         if (diffHours > 48) {
                             console.log(`     📅 [Edu Bot] Skipping OLD news (${diffHours.toFixed(1)}h old).`);
                             continue;
                         }
                     }

                     // Double check content
                     const contentCheck = (article.headline + " " + article.body).toLowerCase();
                     const isRajasthan = rajasthanKeywords.some(k => contentCheck.includes(k));
                     
                     if (isRajasthan) {
                         const success = await processEduData(article.headline, article.body, link, settings);
                         if (success) processedCount++;
                     } else {
                         console.log("     ⚠️ [Edu Bot] Rejected: Content not explicitly Rajasthan focused.");
                     }
                }
                
                if (processedCount >= 2) break; 
            }
        } catch (e) {
            console.error(`     ❌ [Edu Bot] Scouting failed for ${target.name}: ${e.message}`);
        }
        if (processedCount >= 2) break; 
    }

    if (processedCount === 0) {
        console.log("  😴 [Edu Bot] No fresh Education news found.");
    } else {
        console.log(`  🎉 [Edu Bot] Hunter cycle finished. Processed ${processedCount} updates.`);
    }
}

/**
 * 🎓 Process Education News
 */
async function processEduData(rawHeadline, rawBody, sourceUrl, settings) {
    console.log(`\n  🎓 [Edu Bot] Processing Education Order...`);

    const now = new Date();
    const todayYMD = now.toISOString().split('T')[0];
    const todayIST = now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'long', day: 'numeric' });

    // 1. AI WRITER
    const prompt = `
    ROLE: You are the 'Senior Education Analyst' for Rajasthan (DailyDhandora). 
    
    CONTEXT:
    Current Date: ${todayIST}
    Target Audience: Teachers, Students, Parents in Nagaur/Rajasthan. 
    
    SOURCE MATERIAL:
    Headline: ${rawHeadline}
    Content: ${rawBody.substring(0, 3000)}
    
    TASK:
    1. Decode this news/order into a clear, viral update.
    2. Focus on: "What does this mean for me?" (e.g., School holiday? Exam date? Transfer list?).
    3. Use official terms: 'Bikaner Nideshalaya', 'Jaipur Sachivalaya', 'RPSC Ajmer'.
    4. If 'Nagaur' is specifically mentioned, mark it as **🚨 URGENT FOR NAGAUR**.
    
    OUTPUT JSON FORMAT:
    {
      "headline": "Rajasthan Education Update: [Punchy Title]", 
      "content": "HTML body with <ul><li> for key points. Use <h3> for subheads.",
      "tags": ["Rajasthan Education", "Shala Darpan", "Teachers"],
      "isUrgent": false,
      "date": "${todayYMD}" 
    }
    `;

    const aiData = await aiWriter.writeArticle(prompt);
    if (!aiData || !aiData.headline) {
        console.log("     ❌ [Edu Bot] AI Processing failed.");
        return false;
    }

    // 2. GENERATE EDU CARD
    let shareCardUrl = null;
    let imageUrl = null;

    console.log(`     🎨 [Edu Bot] Generating Edu Card...`);
    try {
        const cardBuffer = await newsCardGen.generateEduCard(aiData.headline, aiData.date || todayYMD);
        if (cardBuffer) {
            shareCardUrl = await imageGen.uploadToImgBB(cardBuffer);
            imageUrl = shareCardUrl;
        }
    } catch (e) {
        console.error(`     ⚠️ [Edu Bot] Card Gen Failed: ${e.message}`);
    }

    // Fallback Image
    if (!imageUrl) {
        imageUrl = getCategoryFallback('सरकारी योजना'); // Closest fallback
    }

    // 3. SAVE
    const articleData = {
        headline: aiData.headline,
        content: aiData.content,
        tags: [...(aiData.tags || []), 'Education', 'Shiksha Vibhag'],
        category: 'शिक्षा विभाग', 
        sourceUrl: sourceUrl,
        imageUrl: imageUrl,
        shareCardUrl: shareCardUrl || imageUrl,
        status: settings.articleStatus,
        author: 'EduBot (Rajasthan)'
    };

    const isDuplicate = await dbService.checkDuplicate('articles', 'headline', aiData.headline);
    if (isDuplicate) {
        console.log("     ⚠️ [Edu Bot] Duplicate headline. Skipping save.");
        return false;
    }

    await dbService.saveDocument('articles', articleData);
    console.log(`     ✅ [Edu Bot] Saved Update: ${aiData.headline}`);
    return true;
}

module.exports = { run };