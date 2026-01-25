/**
 * 🏛️ API-BOT: Official Rajasthan Education Orders
 * 
 * Purpose: Fetch official government orders directly from the Rajasthan Education
 * Dept API and convert them into full Hindi news articles for DailyDhandora.
 * 
 * Source: https://education.rajasthan.gov.in/webapi/api/OrderPortal/GetList
 * Document Types: Order, Circular, Employees Orders
 */

if (process.env.CI) {
    require('dotenv').config({ path: '.env' });
} else {
    require('dotenv').config({ path: '.env.local', override: true });
}

const axios = require('axios');
const https = require('https');
const aiWriter = require('../services/ai-writer');
const dbService = require('../services/db-service');
const topicCache = require('../services/topic-cache');
const pdfProcessor = require('../services/gemini-pdf-processor'); // 📄 PDF Processor Integration
const { getCategoryFallback } = require('../../lib/stockImages');
const { isFresh } = require('../../lib/dateUtils'); // 📅 FRESHNESS IMPORT

// HTTPS Agent to handle government site SSL issues

const httpsAgent = new https.Agent({
    rejectUnauthorized: true,
    secureOptions: require('constants').SSL_OP_LEGACY_SERVER_CONNECT
});

const API_URL = 'https://education.rajasthan.gov.in/webapi/api/OrderPortal/GetList';

// API Key from user's network inspection
const API_KEY = 'UvpJvSho3uMrjwJeOWpU+MZRydSjdsiJc6MhmSu0PyMvngXe+lYwv/3DTawSJ/zf';

// Department Code for Education
const DEPARTMENT_CODE = 146;

// 🎯 RELEVANCE FILTER: Only pick orders that matter to teachers
// Orders matching these keywords will be prioritized
const RELEVANCE_KEYWORDS = [
    // 1. Shivira / Panchang / Calendar (School Time Table)
    'shivira', 'शिविरा', 'panchang', 'पंचांग', 'calendar', 'कैलेंडर', 'time table', 'समय सारणी',
    'school timing', 'विद्यालय समय', 'academic calendar', 'शैक्षिक कैलेंडर',

    // 2. Holiday / Avkash / Sheetlahar / Vacation (Leave Orders)
    'holiday', 'अवकाश', 'avkash', 'sheetlahar', 'शीतलहर', 'vacation', 'छुट्टी',
    'leave', 'अवकाश', 'collector order', 'कलेक्टर आदेश', 'summer vacation', 'ग्रीष्मकालीन',
    'winter vacation', 'शीतकालीन', 'diwali', 'दीपावली', 'holi', 'होली',

    // 3. Transfer / Tabadla / Sthanantaran (Postings & Transfers)
    'transfer', 'तबादला', 'tabadla', 'sthanantaran', 'स्थानांतरण', 'posting', 'पोस्टिंग',
    'transfer list', 'स्थानांतरण सूची', 'mutual transfer', 'परस्पर स्थानांतरण',

    // 4. Salary / Bonus / DA / Arrear / Vetan / Pay (Financial News)
    'salary', 'vetan', 'वेतन', 'bonus', 'बोनस', 'da', 'महंगाई भत्ता', 'dearness allowance',
    'arrear', 'एरियर', 'pay commission', 'वेतन आयोग', 'hra', 'increment', 'वेतन वृद्धि',
    'fitment', 'फिटमेंट', '7th pay', '8th pay', 'सातवां वेतन', 'आठवां वेतन',

    // 5. Seniority / Varishthata / DPC / Promotion (Career Growth)
    'seniority', 'varishthata', 'वरिष्ठता', 'dpc', 'विभागीय पदोन्नति समिति',
    'promotion', 'पदोन्नति', 'gradation', 'क्रमानुसार', 'seniority list', 'वरिष्ठता सूची',

    // 6. Date Sheet / Time Table / Result / Pariksha / Exam (Board Exams)
    'date sheet', 'डेट शीट', 'result', 'परिणाम', 'pariksha', 'परीक्षा', 'exam',
    'board exam', 'बोर्ड परीक्षा', 'rbse', 'cbse', 'admit card', 'प्रवेश पत्र',
    'answer key', 'उत्तर कुंजी', 'cut off', 'कट ऑफ',

    // 7. Posting / Niyukti / Joining / Counselling (New Jobs)
    'niyukti', 'नियुक्ति', 'joining', 'जोइनिंग', 'counselling', 'काउंसलिंग',
    'bharti', 'भर्ती', 'recruitment', 'vacancy', 'रिक्ति', 'reet', 'रीट',

    // 8. Important Order Types
    'circular', 'परिपत्र', 'notification', 'अधिसूचना', 'guideline', 'दिशानिर्देश'
];

/**
 * Checks if an order is relevant based on keywords.
 * @param {Object} order - The order object from API
 * @returns {boolean} - True if order is relevant
 */
function isRelevantOrder(order) {
    const title = (order.Title || '').toLowerCase();
    const typeName = (order.TypeNameHindi || order.TypeName || '').toLowerCase();
    const subType = (order.SubTypeNameHindi || order.SubTypeName || '').toLowerCase();

    const searchText = `${title} ${typeName} ${subType}`;

    return RELEVANCE_KEYWORDS.some(keyword => searchText.includes(keyword.toLowerCase()));
}

/**
 * Builds the correct payload structure for the Rajasthan Education API.
 * Based on actual network inspection of education.rajasthan.gov.in
 */
function buildPayload(pageSize = 20) {
    return {
        AttachmentList: [],
        IsLatest: -1,
        DeptSectionCode: "0",
        AdmDepartmentCode: 0,
        BeneficiaryCategory: 0,
        Date: "",
        DepartmentCode: DEPARTMENT_CODE,
        DesignationCode: 0,
        DistrictCode: 0,
        EntryFromDate: "",
        EntryToDate: "",
        FromDate: "",
        Id: 0,
        IndexModel: {
            AdvanceSearchModel: {},
            PageSize: pageSize,
            IsPostBack: false,
            OrderByAsc: 0,
            Search: null,
            OrderBy: "Date"
        },
        IndividualBeneficiaryScheme: "",
        IsImagesRequired: false,
        IsNotJankalyan: -1,
        LookupCode: 0,
        OfficeCatCode: "0",
        OfficeCode: 0,
        OrderNo: "",
        SchemeCode: 0,
        Search: "",
        SectorIds: 0,
        Status: 1,
        SubTypeCode: 0,
        Title: "",
        ToDate: "",
        Type: "0"
    };
}

/**
 * Fetches orders from the Rajasthan Education API.
 */
async function fetchOrders() {
    try {
        const payload = buildPayload(30); // Fetch up to 30 latest orders

        console.log(`     📡 [API Bot] Fetching latest orders from Education Portal...`);

        const response = await axios.post(API_URL, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/plain, */*',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
                'Origin': 'https://education.rajasthan.gov.in',
                'Referer': 'https://education.rajasthan.gov.in/',
                'x-api-key': API_KEY
            },
            httpsAgent: httpsAgent, // Handle SSL renegotiation
            timeout: 60000, // 60s timeout for large response (18MB+)
            maxContentLength: 50 * 1024 * 1024 // Allow up to 50MB response
        });

        // Parse the response - The API returns nested structure: data.Data.Data
        const responseData = response.data;

        // Check for successful response
        if (!responseData || !responseData.IsSuccess) {
            console.log(`     ⚠️ [API Bot] API returned error: ${responseData?.Message || 'Unknown'}`);
            return [];
        }

        // The orders are in Data.Data (nested)
        let orders = [];

        if (responseData.Data && responseData.Data.Data && Array.isArray(responseData.Data.Data)) {
            orders = responseData.Data.Data;
        } else if (responseData.Data && Array.isArray(responseData.Data)) {
            orders = responseData.Data;
        }

        if (orders.length > 0) {
            console.log(`     ✅ [API Bot] Retrieved ${orders.length} orders`);
        } else {
            console.log(`     ⚠️ [API Bot] No orders found in response`);
        }

        return orders;
    } catch (e) {
        const msg = e.response?.status
            ? `HTTP ${e.response.status}`
            : e.message.substring(0, 80);
        console.error(`     ❌ [API Bot] Fetch failed: ${msg}`);
        return [];
    }
}

/**
 * Generates a Hindi news article from an order title using AI.
 * Also asks AI to classify the category for cross-verification.
 */
async function generateArticleFromOrder(title, pdfLink, documentType, pdfContent = null) {
    // 🕒 TIME AWARENESS: Get Current Date in IST
    const now = new Date();
    const todayIST = now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'long', day: 'numeric' });

    // Determine context based on availability of PDF content
    const context = pdfContent
        ? `✅ STATUS: SUCCESS - Full PDF Content Available.\nSOURCE DATA:\n${pdfContent.substring(0, 50000)}...`
        : `⚠️ STATUS: FAILED - PDF Content Unavailable.\n⚠️ INSTRUCTION: LIMITED DATA MODE. Write a PROFESSIONAL, ENGAGING article based strictly on the Title: "${title}". Use journalistic flair to explain the significance of this topic. Do not invent specific dates/numbers, but DO explain the context fully.`;

    const prompt = `
ROLE: You are the 'Senior Editor' for DailyDhandora, a hyper-local news portal in Nagaur, Rajasthan.

TASK: Transform this Official Government Order into a high-quality, easy-to-understand Hindi news update.

CONTEXT:
- **Current Date:** ${todayIST} (Use this to be Time Aware. e.g., if order is for tomorrow, say "Kal/Tomorrow").
- **Order Title:** ${title}
- **Document Type:** ${documentType}
- ${context}

OUTPUT GUIDELINES:
1. **Headline**:  Urgent & Verified (e.g., 'बड़ी खबर: शिक्षा विभाग का नया आदेश जारी...').
2. **Content Structure** (HTML):
   - **Lead (Bold)**: One crisp line explaining *exactly* what happened.
   - **Key Details (Bullet Points)**:
     ${pdfContent ?
            `*   **Subject**: Extracted from PDF.
     *   **Order No**: Extracted from PDF.
     *   **Date**: Extracted from PDF.
     *   **Action**: Summarize instructions.` :
            `*   **Subject**: [Elaborate on the Title's topic professionally]
     *   **Context**: [Explain why this topic is important for teachers/students]
     *   **Action**: "Please check the official PDF below for exact details."`}
   - **Closing**: Advise downloading the PDF.
   
3. **Quality Rules**:
   - **Immediate Understanding**: The user should understand the full news in the first 5 seconds.
   - **Time Aware**: Use relative time context (Aaj/Kal).
   - **SAFE MODE (If PDF Failed)**: If STATUS is FAILED, do NOT be dry. Write a flowing, professional news piece about the *topic* mentioned in the title. Make it sound authoritative. Avoid inventing specific numbers/dates, but expand on the "Why" and "Who".

4. **Category**: EXACTLY one of:
   - "भर्ती व रिजल्ट" (Jobs/Exams)
   - "शिक्षा विभाग" (General Education/Teachers)

OUTPUT FORMAT (JSON only):
{
  "headline": "...",
  "content": "<p><b>Lead line...</b></p><ul>...</ul><p>...",
  "tags": ["..."],
  "category": "..." 
}
`;

    return await aiWriter.writeArticle(prompt);

}

/**
 * Processes a single order item.
 */
async function processOrder(order, settings) {
    // Extract title - The API uses 'Title' field
    const title = order.Title || 'Government Order';

    // Extract PDF link from AttachmentList array
    let pdfLink = '';
    if (order.AttachmentList && Array.isArray(order.AttachmentList) && order.AttachmentList.length > 0) {
        pdfLink = order.AttachmentList[0].Path || '';
    }

    // Extract order type (Hindi)
    const orderType = order.TypeNameHindi || order.TypeName || 'आदेश';
    const orderDate = order.Date || null;

    // 📅 FRESHNESS CHECK: Only process today/yesterday orders
    if (orderDate && !isFresh(orderDate)) {
        console.log(`     📅 [API Bot] Skipping: Old order from ${new Date(orderDate).toLocaleDateString('hi-IN')}`);
        return false;
    }

    if (!title || title.length < 10) {
        console.log(`     ⚠️ [API Bot] Skipping: Empty/short title`);
        return false;
    }

    // Use PDF link as unique identifier, fallback to title-based ID
    const sourceUrl = pdfLink || `https://education.rajasthan.gov.in/order/${Buffer.from(title).toString('base64').substring(0, 20)}`;

    // Check for duplicates in database
    const isDuplicate = await dbService.checkDuplicate('articles', 'sourceUrl', sourceUrl);
    if (isDuplicate) {
        console.log(`     ⏭️ [API Bot] Already exists: "${title.substring(0, 40)}..."`);
        return false;
    }

    console.log(`\n  🏛️ [API Bot] NEW ORDER: "${title.substring(0, 60)}..."`);

    // 📄 PDF CONTENT EXTRACTION
    let pdfContent = null;
    if (pdfLink && pdfLink.startsWith('http')) {
        console.log(`     📄 [API Bot] Extracting text from PDF...`);
        try {
            const pdfResult = await pdfProcessor.processPdf(pdfLink);
            if (pdfResult.success && pdfResult.content) {
                pdfContent = pdfResult.content;
                console.log(`     ✅ [API Bot] PDF Extracted: ${pdfContent.length} chars (Model: ${pdfResult.model})`);
            } else {
                console.log(`     ⚠️ [API Bot] PDF Extraction Failed: ${pdfResult.error} - Falling back to title only.`);
            }
        } catch (pdfErr) {
            console.log(`     ⚠️ [API Bot] PDF Processor Error: ${pdfErr.message}`);
        }
    }

    // Generate article using AI (with extracted PDF content if available)
    const aiData = await generateArticleFromOrder(title, pdfLink, orderType, pdfContent);
    if (!aiData || !aiData.headline) {
        console.log(`     ❌ [API Bot] AI generation failed`);
        return false;
    }

    // Log to topic cache for cross-bot duplicate prevention
    await topicCache.logTopic(aiData.headline, 'api-bot');

    // 🏷️ DUAL-LAYER CATEGORY VERIFICATION (Supreme Accuracy)
    // Layer 1: AI Category (Primary - Trusted)
    // Layer 2: Code Keywords (Fallback)

    const VALID_CATEGORIES = ['भर्ती व रिजल्ट', 'शिक्षा विभाग'];

    // Normalize AI category to handle variations
    function normalizeCategory(cat) {
        if (!cat) return null;
        const lower = cat.toLowerCase().trim();

        // Recruitment variations → भर्ती व रिजल्ट
        if (lower.includes('भर्ती') || lower.includes('रिजल्ट') ||
            lower.includes('recruitment') || lower.includes('result') ||
            lower.includes('exam') || lower.includes('vacancy')) {
            return 'भर्ती व रिजल्ट';
        }

        // Education variations → शिक्षा विभाग
        if (lower.includes('शिक्षा') || lower.includes('विभाग') ||
            lower.includes('education') || lower.includes('teacher') ||
            lower.includes('salary') || lower.includes('transfer')) {
            return 'शिक्षा विभाग';
        }

        // Exact match
        if (VALID_CATEGORIES.includes(cat)) return cat;

        return null; // Invalid - will fallback to code
    }

    // Code-level keyword detection (fallback)
    const recruitmentKeywords = [
        'bharti', 'भर्ती', 'recruitment', 'नियुक्ति',
        'exam', 'pariksha', 'परीक्षा',
        'result', 'parinam', 'परिणाम',
        'admit card', 'प्रवेश पत्र', 'एडमिट कार्ड',
        'answer key', 'उत्तर कुंजी', 'आंसर की',
        'vacancy', 'रिक्ति', 'वैकेंसी',
        'counselling', 'काउंसलिंग',
        'reet', 'रीट', 'rpsc', 'rsmssb'
    ];
    const searchText = `${title} ${orderType}`.toLowerCase();
    const codeCategory = recruitmentKeywords.some(kw => searchText.includes(kw.toLowerCase()))
        ? 'भर्ती व रिजल्ट'
        : 'शिक्षा विभाग';

    // AI Category (primary) - with normalization
    const aiCategory = normalizeCategory(aiData.category);

    // Final Category: AI > Code

    let targetCategory;
    if (aiCategory) {
        targetCategory = aiCategory;
        if (aiCategory === codeCategory) {
            console.log(`     ✅ [API Bot] Category VERIFIED (AI + Code match): ${targetCategory}`);
        } else {
            console.log(`     🔄 [API Bot] Category: ${targetCategory} (AI) | Code suggested: ${codeCategory}`);
        }
    } else {
        targetCategory = codeCategory;
        console.log(`     🏷️ [API Bot] Category (Code fallback): ${targetCategory}`);
    }

    // Get a fallback image based on category
    const imageUrl = getCategoryFallback(targetCategory);

    // Prepare article data
    const articleData = {
        headline: aiData.headline,
        content: aiData.content,
        tags: [...(aiData.tags || []), 'Official Order', 'Teachers News', orderType],
        category: targetCategory, // VERIFIED CATEGORY

        sourceUrl: sourceUrl,
        pdfLink: pdfLink, // Store original PDF link
        imageUrl: imageUrl,
        shareCardUrl: imageUrl,
        status: settings.articleStatus,
        author: 'APIBot (Official)',
        isOfficialOrder: true // Flag for UI differentiation
    };


    // Save to Firestore
    const savedId = await dbService.saveDocument('articles', articleData);
    if (savedId) {
        console.log(`     ✅ [API Bot] SAVED: ${aiData.headline.substring(0, 50)}... (ID: ${savedId})`);
        return true;
    }

    return false;
}

/**
 * Main run function.
 */
async function run() {
    console.log('\n🏛️ [API Bot] Starting Official Orders Fetch...');

    // Gatekeeper
    const settings = await dbService.getBotSettings();
    if (!settings.isBotActive) {
        console.log('  🛑 [API Bot] Disabled by Admin. Exiting.');
        return;
    }

    let totalNew = 0;

    // Fetch all orders in a single API call
    const orders = await fetchOrders();

    if (orders.length === 0) {
        console.log('  😴 [API Bot] No orders returned from API.');
        return;
    }

    // 🎯 RELEVANCE FILTER: Only process orders that matter
    const relevantOrders = orders.filter(order => isRelevantOrder(order));
    console.log(`  📋 [API Bot] Total: ${orders.length} orders | Relevant: ${relevantOrders.length}`);

    if (relevantOrders.length === 0) {
        console.log('  😴 [API Bot] No relevant orders found (Shivira/Holiday/Transfer/etc.)');
        return;
    }

    // Process up to 20 most recent RELEVANT orders (to find 5 new ones)
    const recentOrders = relevantOrders.slice(0, 20);
    console.log(`  🎯 [API Bot] Processing ${recentOrders.length} relevant orders...`);

    for (const order of recentOrders) {
        const success = await processOrder(order, settings);
        if (success) {
            totalNew++;
            // Polite delay between saves
            await new Promise(r => setTimeout(r, 3000));
        }

        // Limit total new articles per run
        if (totalNew >= 5) {
            console.log(`     ⏸️ [API Bot] Reached limit of 5 new articles per run.`);
            break;
        }
    }


    if (totalNew === 0) {
        console.log('  😴 [API Bot] No new orders found (all duplicates).');
    } else {
        console.log(`\n🎉 [API Bot] Cycle Complete. New articles: ${totalNew}`);
    }

    // Cleanup old topic cache entries (24 hours)
    await topicCache.cleanupOldEntries(24);
}

module.exports = { run };

// Standalone execution - Run if called directly
if (require.main === module) {
    run().then(() => {
        console.log('🏛️ [API Bot] Standalone execution complete.');
        process.exit(0);
    }).catch(err => {
        console.error('❌ [API Bot] Fatal error:', err.message);
        process.exit(1);
    });
}
