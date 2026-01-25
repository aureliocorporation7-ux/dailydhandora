/**
 * 🧠 GIST SELECTOR SERVICE
 * 
 * Implements the GIST (Greedy Independent Set Thresholding) algorithm
 * from Google Research paper (arXiv:2405.18754)
 * 
 * Purpose: Select diverse, high-quality news articles from scraped content.
 * Balances: Utility (viral potential) + Diversity (semantic distance)
 * 
 * Approximation Guarantee: 0.5 (50% of optimal solution)
 */

if (process.env.CI) {
    require('dotenv').config({ path: '.env' });
} else {
    require('dotenv').config({ path: '.env.local', override: true });
}

// ==========================================
// 1. TEXT PROCESSING & EMBEDDINGS
// ==========================================

/**
 * Normalizes text for comparison (same logic as topic-cache.js)
 * - Converts to lowercase
 * - Removes punctuation
 * - Removes stop words
 * @param {string} text - Raw text
 * @returns {Set<string>} - Set of normalized words
 */
function normalizeToWordSet(text) {
    if (!text) return new Set();

    const stopWords = [
        // English
        'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'of', 'for', 'in', 'to',
        'be', 'was', 'were', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
        // Hindi common words
        'का', 'की', 'के', 'में', 'है', 'हैं', 'को', 'से', 'पर', 'ने', 'एक', 'यह', 'वह',
        'और', 'इस', 'उस', 'तो', 'जो', 'कि', 'हो', 'था', 'थी', 'थे', 'कर', 'करने', 'किया'
    ];

    const words = text
        .toLowerCase()
        .replace(/[^\w\s\u0900-\u097F]/g, '') // Keep Hindi chars, remove punctuation
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.includes(word));

    return new Set(words);
}

/**
 * Calculates Jaccard Similarity between two word sets
 * @param {Set<string>} setA 
 * @param {Set<string>} setB 
 * @returns {number} 0-1 similarity score
 */
function jaccardSimilarity(setA, setB) {
    if (setA.size === 0 && setB.size === 0) return 1;
    if (setA.size === 0 || setB.size === 0) return 0;

    let intersection = 0;
    for (const word of setA) {
        if (setB.has(word)) intersection++;
    }

    const union = setA.size + setB.size - intersection;
    return intersection / union;
}

/**
 * Calculates semantic distance between two articles
 * Distance = 1 - Similarity (higher = more different)
 * @param {Object} articleA 
 * @param {Object} articleB 
 * @returns {number} 0-1 distance score
 */
function calculateDistance(articleA, articleB) {
    // Use cached word sets if available
    const setA = articleA._wordSet || normalizeToWordSet(articleA.headline + ' ' + (articleA.body || ''));
    const setB = articleB._wordSet || normalizeToWordSet(articleB.headline + ' ' + (articleB.body || ''));

    const similarity = jaccardSimilarity(setA, setB);
    return 1 - similarity;
}

/**
 * Pre-computes word sets for all articles (optimization)
 * @param {Array} articles 
 */
function precomputeWordSets(articles) {
    for (const article of articles) {
        article._wordSet = normalizeToWordSet(article.headline + ' ' + (article.body || ''));
    }
}

// ==========================================
// 2. UTILITY SCORING
// ==========================================

/**
 * Calculates utility score for an article
 * Uses heuristics when AI scoring is not available
 * @param {Object} article 
 * @returns {number} 0-10 utility score
 */
function calculateUtility(article) {
    let score = 5; // Base score

    const text = (article.headline + ' ' + (article.body || '')).toLowerCase();

    // 📈 VIRAL BOOSTERS (Local Relevance)
    const localTerms = ['नागौर', 'nagaur', 'मेड़ता', 'merta', 'जयाल', 'डीडवाना', 'लाडनूं', 'कुचामन'];
    if (localTerms.some(t => text.includes(t))) score += 2;

    // 🔥 HIGH-INTEREST TOPICS
    const hotTopics = [
        'भर्ती', 'vacancy', 'result', 'रिजल्ट', // Jobs
        'योजना', 'scheme', 'subsidy', // Schemes
        'तबादला', 'transfer', 'वेतन', 'salary', // Teachers
        'मंडी', 'भाव', 'rate', 'price' // Mandi
    ];
    if (hotTopics.some(t => text.includes(t))) score += 2;

    // 📰 BREAKING/URGENT INDICATORS
    const urgentTerms = ['breaking', 'तुरंत', 'urgent', 'आज', 'अभी', 'latest', 'ताज़ा'];
    if (urgentTerms.some(t => text.includes(t))) score += 1;

    // 📉 PENALTY: Generic/Low-value content
    const genericTerms = ['click here', 'read more', 'advertisement', 'विज्ञापन'];
    if (genericTerms.some(t => text.includes(t))) score -= 2;

    // Cap score between 1-10
    return Math.max(1, Math.min(10, score));
}

// ==========================================
// 3. GIST CORE ALGORITHM
// ==========================================

/**
 * GreedyIndependentSet Subroutine (Algorithm 1 from paper)
 * 
 * Builds a set S by iteratively adding items with highest utility
 * while maintaining minimum distance >= threshold
 * 
 * @param {Array} items - All articles (sorted by utility, descending)
 * @param {number} threshold - Minimum distance threshold
 * @param {number} k - Maximum set size
 * @returns {Array} Selected items
 */
function greedyIndependentSet(items, threshold, k) {
    const selected = [];

    for (const item of items) {
        if (selected.length >= k) break;

        // Check if item is far enough from all selected items
        let isFarEnough = true;
        for (const selectedItem of selected) {
            const dist = calculateDistance(item, selectedItem);
            if (dist < threshold) {
                isFarEnough = false;
                break;
            }
        }

        if (isFarEnough) {
            selected.push(item);
        }
    }

    return selected;
}

/**
 * Calculates the combined objective function f(S)
 * f(S) = g(S) + λ·div(S)
 * 
 * @param {Array} selected - Selected set S
 * @param {number} lambda - Diversity weight
 * @returns {number} Objective value
 */
function calculateObjective(selected, lambda) {
    if (selected.length === 0) return 0;
    if (selected.length === 1) {
        // div(S) for single item = max possible distance (1.0)
        return selected[0]._utility + lambda * 1.0;
    }

    // g(S) = Sum of utilities
    const totalUtility = selected.reduce((sum, item) => sum + item._utility, 0);

    // div(S) = min(dist(u,v)) for all pairs
    let minDistance = Infinity;
    for (let i = 0; i < selected.length; i++) {
        for (let j = i + 1; j < selected.length; j++) {
            const dist = calculateDistance(selected[i], selected[j]);
            if (dist < minDistance) minDistance = dist;
        }
    }

    // If only one item or empty, minDistance stays Infinity, use 1.0
    if (!isFinite(minDistance)) minDistance = 1.0;

    return totalUtility + lambda * minDistance;
}

/**
 * 🎯 MAIN GIST SELECTION ALGORITHM
 * 
 * Selects k diverse, high-utility articles using threshold sweeping
 * 
 * @param {Array} articles - All scraped articles
 * @param {number} k - Number of articles to select
 * @param {number} lambda - Diversity weight (default: 1.0)
 * @returns {Array} Selected diverse articles
 */
function gistSelection(articles, k, lambda = 1.0) {
    if (!articles || articles.length === 0) {
        console.log('     ⚠️ [GIST] No articles to select from.');
        return [];
    }

    if (articles.length <= k) {
        console.log(`     ℹ️ [GIST] Only ${articles.length} articles, returning all.`);
        return articles;
    }

    console.log(`\n  🧠 [GIST] Starting Selection: ${articles.length} articles → ${k} diverse`);
    console.log(`     📊 Lambda (λ): ${lambda}`);

    // Step 0: Pre-compute word sets and utility scores
    precomputeWordSets(articles);
    for (const article of articles) {
        article._utility = calculateUtility(article);
    }

    // Sort by utility (descending) for greedy selection
    const sorted = [...articles].sort((a, b) => b._utility - a._utility);

    let bestSolution = [];
    let bestScore = -Infinity;

    // ==========================================
    // Step 1: Pure Greedy Baseline (threshold = 0)
    // ==========================================
    const greedyBaseline = sorted.slice(0, k);
    const greedyScore = calculateObjective(greedyBaseline, lambda);
    console.log(`     📌 Step 1 - Greedy Baseline Score: ${greedyScore.toFixed(2)}`);

    if (greedyScore > bestScore) {
        bestScore = greedyScore;
        bestSolution = greedyBaseline;
    }

    // ==========================================
    // Step 2: Max-Diversity Pair (two farthest articles)
    // ==========================================
    if (k >= 2) {
        let maxDist = 0;
        let pair = [sorted[0], sorted[1]];

        for (let i = 0; i < Math.min(sorted.length, 10); i++) {
            for (let j = i + 1; j < Math.min(sorted.length, 10); j++) {
                const dist = calculateDistance(sorted[i], sorted[j]);
                if (dist > maxDist) {
                    maxDist = dist;
                    pair = [sorted[i], sorted[j]];
                }
            }
        }

        const pairScore = calculateObjective(pair, lambda);
        console.log(`     📌 Step 2 - Max-Diversity Pair Score: ${pairScore.toFixed(2)} (dist: ${maxDist.toFixed(2)})`);

        if (pairScore > bestScore) {
            bestScore = pairScore;
            bestSolution = pair;
        }
    }

    // ==========================================
    // Step 3: Threshold Sweeping (Core GIST)
    // ==========================================
    // Thresholds from 0.1 to 0.9 in steps of 0.1
    const thresholds = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];

    for (const threshold of thresholds) {
        const candidate = greedyIndependentSet(sorted, threshold, k);

        if (candidate.length === 0) continue;

        const score = calculateObjective(candidate, lambda);

        if (score > bestScore) {
            bestScore = score;
            bestSolution = candidate;
            console.log(`     ✨ Step 3 - Threshold ${threshold}: Score ${score.toFixed(2)} (${candidate.length} items)`);
        }
    }

    // ==========================================
    // Final Result
    // ==========================================
    console.log(`\n  🎯 [GIST] Final Selection:`);
    console.log(`     📊 Best Score: ${bestScore.toFixed(2)}`);
    console.log(`     📰 Selected: ${bestSolution.length} articles`);

    // Calculate and log min-diversity of final selection
    if (bestSolution.length >= 2) {
        let minDiv = Infinity;
        for (let i = 0; i < bestSolution.length; i++) {
            for (let j = i + 1; j < bestSolution.length; j++) {
                const dist = calculateDistance(bestSolution[i], bestSolution[j]);
                if (dist < minDiv) minDiv = dist;
            }
        }
        console.log(`     🔀 Min Diversity: ${minDiv.toFixed(2)}`);
    }

    // Log selected headlines
    bestSolution.forEach((article, i) => {
        console.log(`     ${i + 1}. [U:${article._utility}] ${article.headline.substring(0, 50)}...`);
    });

    // Clean up temporary fields before returning
    for (const article of bestSolution) {
        delete article._wordSet;
        delete article._utility;
    }

    return bestSolution;
}

/**
 * 🏷️ CATEGORY DETECTION: Pre-classify article's potential category
 * @param {Object} article 
 * @returns {string} Detected category
 */
function detectCategory(article) {
    const text = (article.headline + ' ' + (article.body || '')).toLowerCase();

    // Category detection rules (priority order)
    const categoryRules = [
        {
            category: 'मंडी भाव',
            keywords: ['मंडी भाव', 'मंडी रेट', 'क्विंटल', 'quintal', 'रुपये प्रति', 'फसल भाव', 'कृषि उपज']
        },
        {
            category: 'भर्ती व रिजल्ट',
            keywords: ['भर्ती', 'vacancy', 'result', 'रिजल्ट', 'परीक्षा', 'exam', 'admit card', 'answer key', 'रीट', 'reet', 'rpsc']
        },
        {
            category: 'शिक्षा विभाग',
            keywords: ['शिक्षा', 'तबादला', 'transfer', 'teacher', 'शिक्षक', 'वरिष्ठता', 'seniority', 'वेतन', 'salary', 'पदोन्नति']
        },
        {
            category: 'सरकारी योजना',
            keywords: ['योजना', 'scheme', 'subsidy', 'सब्सिडी', 'लाभार्थी', 'पेंशन', 'pension', 'आवेदन', 'किसान सम्मान']
        }
    ];

    for (const rule of categoryRules) {
        if (rule.keywords.some(kw => text.includes(kw))) {
            return rule.category;
        }
    }

    // Default to local news
    return 'नागौर न्यूज़';
}

/**
 * 🎯 CATEGORY-WISE GIST SELECTION
 * 
 * Groups articles by category, then picks BEST (highest utility) from EACH category
 * This guarantees:
 * 1. Every category gets representation
 * 2. Only top-quality/viral news from each category
 * 
 * @param {Array} articles - All scraped articles
 * @param {number} perCategoryLimit - Max articles per category (default: 2)
 * @param {number} lambda - Diversity weight (default: 1.0)
 * @returns {Array} Selected articles from all categories
 */
function categoryWiseSelection(articles, perCategoryLimit = 2, lambda = 1.0) {
    if (!articles || articles.length === 0) {
        console.log('     ⚠️ [GIST] No articles to select from.');
        return [];
    }

    console.log(`\n  🧠 [GIST] Category-Wise Selection: ${articles.length} articles`);
    console.log(`     📊 Per Category Limit: ${perCategoryLimit}`);

    // Step 1: Pre-compute utility scores
    precomputeWordSets(articles);
    for (const article of articles) {
        article._utility = calculateUtility(article);
        article._category = detectCategory(article);
    }

    // Step 2: Group by category
    const categoryGroups = {};
    for (const article of articles) {
        const cat = article._category;
        if (!categoryGroups[cat]) {
            categoryGroups[cat] = [];
        }
        categoryGroups[cat].push(article);
    }

    console.log(`     📂 Categories Found:`);
    for (const [cat, items] of Object.entries(categoryGroups)) {
        console.log(`        - ${cat}: ${items.length} articles`);
    }

    // Step 3: From EACH category, pick top utility articles
    const selected = [];

    for (const [category, categoryArticles] of Object.entries(categoryGroups)) {
        // 🎯 VARIABLE LIMIT: नागौर न्यूज़ gets 3, others get 2
        const categoryLimit = category === 'नागौर न्यूज़' ? 3 : perCategoryLimit;

        // Sort by utility (highest first)
        categoryArticles.sort((a, b) => b._utility - a._utility);

        // Apply diversity within category (avoid near-duplicates)
        const categorySelected = [];
        const minDistance = 0.3; // Minimum distance within same category

        for (const article of categoryArticles) {
            if (categorySelected.length >= categoryLimit) break;


            // Check distance from already selected in this category
            let isFarEnough = true;
            for (const sel of categorySelected) {
                if (calculateDistance(article, sel) < minDistance) {
                    isFarEnough = false;
                    break;
                }
            }

            if (isFarEnough) {
                categorySelected.push(article);
            }
        }

        selected.push(...categorySelected);

        if (categorySelected.length > 0) {
            console.log(`     ✅ ${category}: Selected ${categorySelected.length} (Top Utility: ${categorySelected[0]._utility})`);
        }
    }

    // Step 4: Final logging
    console.log(`\n  🎯 [GIST] Final Category-Wise Selection:`);
    console.log(`     📰 Total Selected: ${selected.length} articles`);

    selected.forEach((article, i) => {
        console.log(`     ${i + 1}. [${article._category}] [U:${article._utility}] ${article.headline.substring(0, 40)}...`);
    });

    // Clean up temporary fields
    for (const article of selected) {
        delete article._wordSet;
        delete article._utility;
        delete article._category;
    }

    return selected;
}

/**
 * 🚀 PUBLIC API: Select diverse articles for news bot
 * 
 * @param {Array} articles - Scraped articles with {headline, body, sourceUrl, source}
 * @param {number} k - Number to select per category (default: 2)
 * @param {number} lambda - Diversity weight (default: 1.0)
 * @returns {Array} Selected diverse articles
 */
async function selectDiverse(articles, k = 2, lambda = 1.0) {
    // Use category-wise selection for guaranteed coverage
    return categoryWiseSelection(articles, k, lambda);
}

module.exports = {
    selectDiverse,
    gistSelection,
    categoryWiseSelection,
    calculateDistance,
    calculateUtility,
    detectCategory,
    normalizeToWordSet
};
