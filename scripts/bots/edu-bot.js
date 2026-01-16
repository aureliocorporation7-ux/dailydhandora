const axios = require('axios');
const cheerio = require('cheerio');
const aiWriter = require('../services/ai-writer');
const imageGen = require('../services/image-gen');
const newsCardGen = require('../services/news-card-gen');
const dbService = require('../services/db-service');
const topicCache = require('../services/topic-cache');
const { getCategoryFallback } = require('../../lib/stockImages');
const { isFresh, getISTDate } = require('../../lib/dateUtils');

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

    // 2. TARGETS - Local + State level (all goes to शिक्षा विभाग category)
    const targets = [
        { name: "Nagaur District", url: "https://www.bhaskar.com/local/rajasthan/nagaur" },
        { name: "Merta", url: "https://www.bhaskar.com/local/rajasthan/nagaur/merta" },
        { name: "Rajasthan State", url: "https://www.bhaskar.com/rajasthan" }  // Pay Commission, DA news
    ];

    // 🚫 FORBIDDEN KEYWORDS (Blacklist) - REJECT if ANY of these found
    const forbiddenKeywords = [
        // Crime/Police - Hard Block
        'गिरफ्तार', 'गिरफ्तारी', 'arrest', 'arrested', 'हत्या', 'murder', 'killed',
        'लूट', 'robbery', 'दुष्कर्म', 'rape', 'थाना', 'thana', 'fir दर्ज',
        'acb', 'aco', 'एसीबी', 'भ्रष्टाचार निरोधक', 'anti corruption', 'रिश्वत', 'bribe',
        'चोरी', 'theft', 'डकैती', 'dacoity', 'अपहरण', 'kidnap', 'मारपीट', 'assault',
        'पुलिस ने पकड़ा', 'police nabbed', 'गैंगस्टर', 'gangster', 'माफिया', 'mafia',
        'सुसाइड', 'suicide', 'आत्महत्या', 'हादसा', 'accident', 'दुर्घटना',
        'शव', 'body found', 'लाश', 'corpse', 'postmortem', 'पोस्टमार्टम',

        // Irrelevant Departments - Block
        'नगर निगम', 'nagar nigam', 'नगर पालिका', 'municipality', 'नगरपालिका',
        'होमगार्ड', 'homeguard', 'home guard', 'होम गार्ड',
        'बैंक', 'bank fraud', 'बैंक धोखाधड़ी',
        'पुलिस थाना', 'police station', 'sp office', 'ig office', 'dsp',
        'जेल', 'jail', 'कारागृह', 'prison', 'न्यायालय', 'court',
        'वन विभाग', 'forest department', 'पीडब्ल्यूडी', 'pwd',
        'बिजली विभाग', 'electricity', 'जल विभाग', 'phed',

        // Sports/Entertainment (Not Education)
        'ipl', 'cricket', 'क्रिकेट', 'football', 'फुटबॉल', 'bollywood', 'बॉलीवुड',
        'film', 'movie', 'actress', 'actor', 'celebrity'
    ];

    // 🚫 BLACKLISTED LOCATIONS - Only allow if also has "Shiksha Mantri", "Nideshalaya" etc.
    const blacklistedLocations = [
        'alwar', 'अलवर', 'kota', 'कोटा', 'udaipur', 'उदयपुर', 'bharatpur', 'भरतपुर',
        'sikar', 'सीकर', 'churu', 'चूरू', 'jhunjhunu', 'झुंझुनूं',
        'sriganganagar', 'श्रीगंगानगर', 'hanumangarh', 'हनुमानगढ़',
        'banswara', 'बांसवाड़ा', 'dungarpur', 'डूंगरपुर', 'pratapgarh', 'प्रतापगढ़'
    ];

    // 🚫 GEOGRAPHIC NEGATIVE FILTER - Reject non-Rajasthan states (TASK 2.1)
    const geoBlacklistStates = [
        'punjab', 'पंजाब', 'bihar', 'बिहार', 'uttar pradesh', 'उत्तर प्रदेश', 'up ',
        'delhi', 'दिल्ली', 'haryana', 'हरियाणा', 'madhya pradesh', 'मध्य प्रदेश', 'mp ',
        'gujarat', 'गुजरात', 'maharashtra', 'महाराष्ट्र'
    ];

    // 🏷️ CATEGORY SPLIT KEYWORDS - Move to "Recruitment & Results" (TASK 2.2)
    const recruitmentKeywords = [
        'result', 'रिजल्ट', 'परिणाम', 'admit card', 'एडमिट कार्ड', 'प्रवेश पत्र',
        'answer key', 'उत्तर कुंजी', 'आंसर की', 'vacancy', 'वैकेंसी', 'रिक्ति',
        'bharti', 'भर्ती', 'recruitment', 'नियुक्ति', 'jobs', 'नौकरी',
        'cut off', 'कट ऑफ', 'merit list', 'मेरिट लिस्ट'
    ];

    // ✅ EDUCATION WHITELIST - Overrides blacklisted location (if news is truly edu-related)
    const eduWhitelistTerms = [
        'शिक्षा मंत्री', 'shiksha mantri', 'education minister',
        'बीकानेर निदेशालय', 'bikaner nideshalaya', 'nideshalaya',
        'जयपुर सचिवालय', 'jaipur sachivalaya', 'sachivalaya',
        'राज्य स्तरीय शिक्षा', 'state level education'
    ];

    // 📚 EDUCATION KEYWORDS (Comprehensive) - Cleaned up, no more police/crime triggers
    const eduKeywords = [
        // शाला दर्पण & Education Dept (CORE)
        'shala darpan', 'शाला दर्पण', 'shiksha', 'शिक्षा', 'school', 'स्कूल',
        'teacher', 'शिक्षक', 'bikaner nideshalaya', 'बीकानेर निदेशालय', 'doep', 'शिक्षा विभाग',
        'vidyalaya', 'विद्यालय', 'madrsa', 'मदरसा', 'aanganwadi', 'आंगनवाड़ी',
        'headmaster', 'प्रधानाध्यापक', 'principal', 'प्रिंसिपल',
        '3rd grade', 'थर्ड ग्रेड', '2nd grade', 'सेकंड ग्रेड', 'grade teacher',

        // Exams & Results
        'rpsc', 'rsmssb', 'reet', 'रीट', 'परीक्षा', 'result', 'परिणाम',
        'admit card', 'प्रवेश पत्र', 'answer key', 'उत्तर कुंजी',
        'cut off', 'कट ऑफ', 'merit list', 'मेरिट लिस्ट',
        'board exam', 'बोर्ड परीक्षा', 'rbse', 'cbse',
        'scholarship', 'छात्रवृत्ति', 'स्कॉलरशिप',

        // Recruitment & Jobs (ONLY Education Related)
        'shikshak bharti', 'शिक्षक भर्ती', 'teacher recruitment',
        'patwari', 'पटवारी', 'gram sevak', 'ग्राम सेवक', 'ldc bharti',
        'government job', 'सरकारी नौकरी', 'vacancy', 'रिक्ति',

        // 💰 Pay Commission & Salary
        'pay commission', 'पे कमीशन', 'वेतन आयोग', '8th pay', '8वां वेतन',
        'महंगाई भत्ता', 'dearness allowance', 'da hike', 'hra',
        'salary hike', 'सैलरी', 'वेतन वृद्धि', 'pension', 'पेंशन',
        'fitment factor', 'फिटमेंट फैक्टर', 'arrear', 'एरियर',

        // Government Employee Related (Must be with other edu context)
        'sarkari karmchari', 'सरकारी कर्मचारी', 'employee union',
        'transfer list', 'स्थानांतरण', 'posting order'
    ];

    const rajasthanKeywords = [
        'rajasthan', 'nagaur', 'bikaner', 'jaipur', 'jodhpur', 'ajmer',
        'राजस्थान', 'नागौर', 'बीकानेर', 'जयपुर', 'जोधपुर', 'अजमेर',
        // Nagaur Tehsils & Towns
        'degana', 'jayal', 'merta', 'didwana', 'ladnun', 'makrana', 'parbatsar', 'kuchaman', 'nawa', 'mundwa', 'khinvsar',
        'डेगाना', ' जायल', 'मेड़ता', 'डीडवाना', 'लाडनूं', 'मकराना', 'परबतसर', 'कुचामन', 'नावा', 'मूंडवा', 'खींवसर'
    ];

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
                    // 🛑 DATE FRESHNESS CHECK (Shared Logic)
                    if (article.publishedTime && !isFresh(article.publishedTime)) {
                        console.log(`     📅 [Edu Bot] Skipping OLD news from ${article.publishedTime}`);
                        continue;
                    }

                    // Double check content (Include URL in check for location safety)
                    const contentCheck = (article.headline + " " + article.body + " " + link).toLowerCase();

                    // 🚫 STEP 1: FORBIDDEN KEYWORDS CHECK (Instant Reject)
                    const hasForbiddenKeyword = forbiddenKeywords.some(k => contentCheck.includes(k));
                    if (hasForbiddenKeyword) {
                        const matched = forbiddenKeywords.find(k => contentCheck.includes(k));
                        console.log(`     🚫 [Edu Bot] BLACKLIST REJECT: Found "${matched}" - Skipping crime/irrelevant news.`);
                        continue;
                    }

                    // 🚫 STEP 2: BLACKLISTED LOCATION CHECK (Allow only if edu whitelist term present)
                    const hasBlacklistedLocation = blacklistedLocations.some(loc => contentCheck.includes(loc));
                    if (hasBlacklistedLocation) {
                        const hasEduWhitelist = eduWhitelistTerms.some(term => contentCheck.includes(term));
                        if (!hasEduWhitelist) {
                            const matchedLoc = blacklistedLocations.find(loc => contentCheck.includes(loc));
                            console.log(`     🚫 [Edu Bot] LOCATION REJECT: "${matchedLoc}" found without Shiksha Mantri/Nideshalaya context.`);
                            continue;
                        }
                    }

                    // ✅ STEP 3: RAJASTHAN FOCUS CHECK
                    const isRajasthan = rajasthanKeywords.some(k => contentCheck.includes(k));

                    // 🚫 STEP 3.5: GEOGRAPHIC NEGATIVE FILTER (TASK 2.1)
                    // Reject if mentions other states WITHOUT mentioning Rajasthan
                    const hasOtherState = geoBlacklistStates.some(state => contentCheck.includes(state));
                    if (hasOtherState && !isRajasthan) {
                        const matchedState = geoBlacklistStates.find(s => contentCheck.includes(s));
                        console.log(`     🚫 [Edu Bot] GEO-REJECT: Found "${matchedState}" without Rajasthan context.`);
                        continue;
                    }

                    // 🔍 STEP 3.6: TOPIC CACHE CHECK (Duplicate Prevention - TASK 3)
                    const { isDuplicate, originalSource } = await topicCache.checkRecentTopic(article.headline, 'edu-bot', 4);
                    if (isDuplicate) {
                        console.log(`     ⏭️ [Edu Bot] DUPLICATE: Already posted by ${originalSource}. Skipping.`);
                        continue;
                    }

                    // 🏷️ STEP 3.7: CATEGORY SPLIT LOGIC (TASK 2.2)
                    const isRecruitmentNews = recruitmentKeywords.some(k => contentCheck.includes(k));
                    const targetCategory = isRecruitmentNews ? 'भर्ती व रिजल्ट' : 'शिक्षा विभाग';
                    if (isRecruitmentNews) {
                        console.log(`     🏷️ [Edu Bot] Category SPLIT: Moving to "भर्ती व रिजल्ट" (Recruitment)`);
                    }

                    if (isRajasthan) {
                        const success = await processEduData(article.headline, article.body, link, settings, targetCategory);
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
 * @param {string} targetCategory - Dynamic category (Education or Recruitment)
 */
async function processEduData(rawHeadline, rawBody, sourceUrl, settings, targetCategory = 'शिक्षा विभाग') {
    console.log(`\n  🎓 [Edu Bot] Processing for category: ${targetCategory}...`);

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
    4. If 'Nagaur' is mentioned with a Tehsil (e.g., Merta/Jayal), use "हमारे **[Tehsil]** संवाददाता" in the body.
    5. **Sign-Off:** Start with Tehsil Match (Degana, Merta, etc.). Fallback to "हमारे नागौर संवाददाता". NEVER use village names.

    6. **CATEGORY**: Classify into EXACTLY one:
       - "भर्ती व रिजल्ट" : If about Hiring, Exam, Result, Answer Key, Vacancy, REET, RPSC.
       - "शिक्षा विभाग" : If about Transfer, Salary, Holiday, School Timing, Promotion, DA.
    
    OUTPUT JSON FORMAT:
    {
      "headline": "Rajasthan Education Update: [Punchy Title]", 
      "content": "HTML body with <ul><li> for key points. Use <h3> for subheads.",
      "tags": ["Rajasthan Education", "Shala Darpan", "Teachers"],
      "category": "शिक्षा विभाग"
    }
    `;

    const aiData = await aiWriter.writeArticle(prompt);
    if (!aiData || !aiData.headline) {
        console.log("     ❌ [Edu Bot] AI Processing failed.");
        return false;
    }

    // 🏷️ AI CATEGORY VERIFICATION (Dual-Layer)
    // Layer 1: AI Category (Primary)
    // Layer 2: Code/Target Category (Fallback/Verification)

    function normalizeCategory(cat) {
        if (!cat) return null;
        const lower = cat.toLowerCase();
        if (lower.includes('भर्ती') || lower.includes('रिजल्ट') || lower.includes('exam') || lower.includes('vacancy') || lower.includes('recruitment'))
            return 'भर्ती व रिजल्ट';
        if (lower.includes('शिक्षा') || lower.includes('विभाग') || lower.includes('education') || lower.includes('teacher') || lower.includes('school'))
            return 'शिक्षा विभाग';
        return null;
    }

    const aiCategory = normalizeCategory(aiData.category);
    let verifiedCategory = targetCategory; // Default to code-suggested

    if (aiCategory) {
        verifiedCategory = aiCategory;
        if (aiCategory !== targetCategory) {
            console.log(`     🔄 [Edu Bot] Category Correction: ${targetCategory} (Code) → ${verifiedCategory} (AI)`);
        } else {
            console.log(`     ✅ [Edu Bot] Category Verified: ${verifiedCategory}`);
        }
    } else {
        console.log(`     🏷️ [Edu Bot] Category (Fallback): ${verifiedCategory}`);
    }

    // 📝 LOG TO TOPIC CACHE (TASK 3 - Cross-bot duplicate prevention)
    await topicCache.logTopic(aiData.headline, 'edu-bot');

    // 🔄 SMART IMAGE FALLBACK SYSTEM
    // For Education: Skip AI Gen, prioritize Card (WhatsApp essential)
    const imageResult = await imageGen.getImageWithFallback(
        verifiedCategory,
        aiData.headline,
        null,  // No AI image for edu - cards are preferred
        { enableImageGen: false, enableAI: false } // Force stock/card flow
    );

    const imageUrl = imageResult.url;
    const imageType = imageResult.type;
    const shareCardUrl = imageResult.type === 'card' ? imageUrl : null;

    // If not already a card, try to generate one for WhatsApp
    // Edu Card logic remains same
    let finalShareCardUrl = shareCardUrl;
    if (!shareCardUrl) {
        try {
            console.log(`     🎨 [Edu Bot] Generating Edu Card (WhatsApp MUST)...`);
            const cardBuffer = await newsCardGen.generateEduCard(aiData.headline, aiData.date || todayYMD);
            if (cardBuffer) {
                finalShareCardUrl = await imageGen.uploadToImgBB(cardBuffer);
                if (finalShareCardUrl) {
                    console.log("     ✅ [Edu Bot] Edu Card Created & Uploaded!");
                }
            }
        } catch (e) {
            console.error(`     ⚠️ [Edu Bot] Card Gen Failed: ${e.message}`);
        }
    } else {
        finalShareCardUrl = shareCardUrl;
        console.log("     ℹ️ [Edu Bot] Card already generated via fallback system");
    }

    // 3. SAVE (Using verified category)
    const articleData = {
        headline: aiData.headline,
        content: aiData.content,
        tags: [...(aiData.tags || []), 'Education', 'Shiksha Vibhag'],
        category: verifiedCategory, // VERIFIED CATEGORY

        sourceUrl: sourceUrl,
        imageUrl: finalShareCardUrl || imageUrl, // Prefer card as main image
        imageType: finalShareCardUrl ? 'card' : imageType, // NEW: Store image type
        shareCardUrl: finalShareCardUrl || imageUrl,
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