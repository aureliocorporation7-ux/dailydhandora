/**
 * 🗂️ TOPIC CACHE SERVICE v2.0 - SMART DUPLICATE DETECTION
 * Purpose: Prevent cross-bot duplicate posts using SEMANTIC SIMILARITY.
 * 
 * Strategy:
 * 1. Exact hash match (O(1) - instant)
 * 2. Jaccard similarity scan on recent topics (catches "same story, different words")
 * 
 * The cache stores normalized topic word-sets with timestamps and source bot names.
 */

if (process.env.CI) {
    require('dotenv').config({ path: '.env' });
} else {
    require('dotenv').config({ path: '.env.local', override: true });
}

const { db, admin } = require('../../lib/firebase');

// In-memory cache for fast lookups
const memoryCache = new Map();

// Collection name in Firestore
const CACHE_COLLECTION = 'topicCache';

// Default window in hours
const DEFAULT_WINDOW_HOURS = 6;

// 🧠 SIMILARITY THRESHOLD (0.0 to 1.0)
// 0.4 = 40% words must match to consider duplicate
// Lower threshold because synonyms (टेंपो/टैंपो, भिड़ंत/टक्कर) won't match
const SIMILARITY_THRESHOLD = 0.40;

// 🏷️ KEY ENTITIES - Words that carry high semantic weight
// If BOTH headlines have same key entity + similar other words = likely duplicate
const KEY_ENTITIES = new Set([
    // Locations
    'नागौर', 'मकराना', 'डीडवाना', 'लाडनूं', 'डेगाना', 'जायल', 'मेड़ता', 'खींवसर',
    'नावां', 'कुचामन', 'परबतसर', 'रियांबड़ी', 'थांवला', 'मुंडवा', 'बीकानेर',
    // Incident types
    'चोरी', 'हत्या', 'मौत', 'हादसा', 'दुर्घटना', 'गिरफ्तार', 'पलटी', 'भिड़ंत',
    'टक्कर', 'आत्महत्या', 'जब्त', 'बरामद', 'छापा', 'रेप', 'गैंगरेप',
    // Event types
    'विस्फोटक', 'ड्रग्स', 'नशा', 'शराब', 'जुआ', 'विवाह', 'मेला', 'सम्मेलन',
    'चुनाव', 'मतदान', 'परीक्षा', 'भर्ती', 'रिजल्ट', 'तबादला', 'सम्मान',
    // Numbers and casualties
    'करोड़', 'लाख', 'किलो', 'ग्राम', 'बहनों', 'भाई', 'पत्नी', 'पति', 'बच्चों'
]);

// Hindi + English stop words
const STOP_WORDS = new Set([
    // English
    'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'of', 'for', 'in', 'to',
    'be', 'was', 'were', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    // Hindi common words
    'का', 'की', 'के', 'में', 'है', 'हैं', 'को', 'से', 'पर', 'ने', 'एक', 'यह', 'वह',
    'और', 'इस', 'उस', 'तो', 'जो', 'कि', 'हो', 'था', 'थी', 'थे', 'कर', 'करने', 'किया',
    'अब', 'भी', 'या', 'हुआ', 'हुई', 'हुए', 'गया', 'गई', 'गए', 'रहा', 'रही', 'रहे'
]);

/**
 * Converts a topic string to a Set of normalized words for comparison.
 * @param {string} topic - Raw headline
 * @returns {Set<string>} - Set of meaningful words
 */
function topicToWordSet(topic) {
    if (!topic) return new Set();

    const words = topic
        .toLowerCase()
        .replace(/[^\w\s\u0900-\u097F]/g, '') // Keep Hindi chars, remove punctuation
        .split(/\s+/)
        .filter(word => word.length > 2 && !STOP_WORDS.has(word));

    return new Set(words);
}

/**
 * 🧠 Enhanced Similarity with Entity Boost
 * Base: Jaccard = |A ∩ B| / |A ∪ B|
 * Boost: +0.2 if both share a KEY_ENTITY (location + incident)
 * @param {Set<string>} setA 
 * @param {Set<string>} setB 
 * @returns {number} 0-1 similarity score (can exceed 1 with boost, capped at 1)
 */
function jaccardSimilarity(setA, setB) {
    if (setA.size === 0 && setB.size === 0) return 1;
    if (setA.size === 0 || setB.size === 0) return 0;

    let intersection = 0;
    let sharedEntities = 0;

    for (const word of setA) {
        if (setB.has(word)) {
            intersection++;
            if (KEY_ENTITIES.has(word)) sharedEntities++;
        }
    }

    const union = setA.size + setB.size - intersection;
    let similarity = intersection / union;

    // 🎯 ENTITY BOOST: If they share key entities, boost similarity
    // Each shared entity adds 10% boost (capped at 20%)
    if (sharedEntities >= 2) {
        similarity += 0.20; // Strong match: same location + incident type
    } else if (sharedEntities === 1) {
        similarity += 0.10; // Partial match: one key entity
    }

    return Math.min(similarity, 1.0); // Cap at 1.0
}

/**
 * Simple hash for Firestore doc ID (normalized string → hash)
 */
function getDocId(normalized) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 40);
}

/**
 * Logs a topic to the cache.
 * @param {string} topic - The headline/title to log.
 * @param {string} source - The bot name (e.g., 'api-bot', 'edu-bot').
 * @returns {Promise<boolean>} - True if logged successfully.
 */
async function logTopic(topic, source) {
    const wordSet = topicToWordSet(topic);
    if (wordSet.size === 0) return false;

    const normalized = [...wordSet].sort().join(' ');
    const entry = {
        topic: normalized,
        wordSetArray: [...wordSet], // Store as array for similarity checks
        originalTopic: topic,
        source: source,
        timestamp: Date.now(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Update memory cache
    memoryCache.set(normalized, entry);

    // Persist to Firestore (fire-and-forget for speed)
    try {
        const docId = getDocId(normalized);
        await db.collection(CACHE_COLLECTION).doc(docId).set(entry, { merge: true });
        console.log(`     📝 [Topic Cache] Logged: "${topic.substring(0, 50)}..." from ${source}`);
        return true;
    } catch (e) {
        console.error(`     ⚠️ [Topic Cache] Failed to persist: ${e.message}`);
        return false;
    }
}

/**
 * 🧠 SMART CHECK: Uses Jaccard similarity to find semantically similar topics.
 * @param {string} topic - The headline/title to check.
 * @param {string} currentSource - The bot trying to post.
 * @param {number} [windowHours=6] - Time window in hours.
 * @returns {Promise<{isDuplicate: boolean, originalSource: string|null, similarity: number, matchedTopic: string|null}>}
 */
async function checkRecentTopic(topic, currentSource, windowHours = DEFAULT_WINDOW_HOURS) {
    const newWordSet = topicToWordSet(topic);
    if (newWordSet.size === 0) return { isDuplicate: false, originalSource: null, similarity: 0, matchedTopic: null };

    const windowMs = windowHours * 60 * 60 * 1000;
    const cutoffTime = Date.now() - windowMs;

    // ========================================
    // LAYER 1: EXACT HASH MATCH (O(1) - Instant)
    // ========================================
    const normalized = [...newWordSet].sort().join(' ');
    const cached = memoryCache.get(normalized);
    if (cached && cached.timestamp > cutoffTime) {
        console.log(`     🎯 [Topic Cache] EXACT HIT: "${topic.substring(0, 40)}..." already posted by ${cached.source}`);
        return { isDuplicate: true, originalSource: cached.source, similarity: 1.0, matchedTopic: cached.originalTopic };
    }

    // ========================================
    // LAYER 2: SIMILARITY SCAN (Check all recent topics)
    // ========================================
    let bestMatch = { similarity: 0, entry: null };

    for (const [key, entry] of memoryCache.entries()) {
        // Skip old entries
        if (entry.timestamp <= cutoffTime) continue;

        // Create word set from stored data
        const cachedWordSet = entry.wordSetArray
            ? new Set(entry.wordSetArray)
            : topicToWordSet(entry.originalTopic || entry.topic);

        // Calculate similarity
        const similarity = jaccardSimilarity(newWordSet, cachedWordSet);

        if (similarity > bestMatch.similarity) {
            bestMatch = { similarity, entry };
        }
    }

    // Check if best match exceeds threshold
    if (bestMatch.similarity >= SIMILARITY_THRESHOLD && bestMatch.entry) {
        console.log(`     🧠 [Topic Cache] SIMILARITY HIT (${(bestMatch.similarity * 100).toFixed(0)}%): `);
        console.log(`        New: "${topic.substring(0, 50)}..."`);
        console.log(`        Old: "${bestMatch.entry.originalTopic?.substring(0, 50) || bestMatch.entry.topic}..." by ${bestMatch.entry.source}`);
        return {
            isDuplicate: true,
            originalSource: bestMatch.entry.source,
            similarity: bestMatch.similarity,
            matchedTopic: bestMatch.entry.originalTopic || bestMatch.entry.topic
        };
    }

    // ========================================
    // LAYER 3: FIRESTORE FALLBACK (Cold start)
    // ========================================
    // Only check Firestore if memory cache is empty (cold start scenario)
    if (memoryCache.size < 10) {
        try {
            const snapshot = await db.collection(CACHE_COLLECTION)
                .where('timestamp', '>', cutoffTime)
                .limit(50)
                .get();

            for (const doc of snapshot.docs) {
                const data = doc.data();
                const cachedWordSet = data.wordSetArray
                    ? new Set(data.wordSetArray)
                    : topicToWordSet(data.originalTopic || data.topic);

                const similarity = jaccardSimilarity(newWordSet, cachedWordSet);

                if (similarity >= SIMILARITY_THRESHOLD) {
                    // Update memory cache for next time
                    memoryCache.set(data.topic, data);
                    console.log(`     🧠 [Topic Cache] FIRESTORE SIMILARITY HIT (${(similarity * 100).toFixed(0)}%)`);
                    return {
                        isDuplicate: true,
                        originalSource: data.source,
                        similarity,
                        matchedTopic: data.originalTopic || data.topic
                    };
                }
            }
        } catch (e) {
            console.error(`     ⚠️ [Topic Cache] Firestore check failed: ${e.message}`);
        }
    }

    return { isDuplicate: false, originalSource: null, similarity: bestMatch.similarity, matchedTopic: null };
}

/**
 * Cleans up old entries from Firestore and memory cache.
 * @param {number} [maxAgeHours=24] - Delete entries older than this.
 */
async function cleanupOldEntries(maxAgeHours = 24) {
    const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);

    // Clean memory cache first
    let memoryCleared = 0;
    for (const [key, entry] of memoryCache.entries()) {
        if (entry.timestamp < cutoffTime) {
            memoryCache.delete(key);
            memoryCleared++;
        }
    }

    // Clean Firestore
    try {
        const snapshot = await db.collection(CACHE_COLLECTION)
            .where('timestamp', '<', cutoffTime)
            .limit(100)
            .get();

        if (snapshot.empty) {
            console.log(`     🧹 [Topic Cache] Cleaned ${memoryCleared} memory entries, 0 Firestore entries.`);
            return memoryCleared;
        }

        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        console.log(`     🧹 [Topic Cache] Cleaned ${memoryCleared} memory + ${snapshot.size} Firestore entries.`);
        return memoryCleared + snapshot.size;
    } catch (e) {
        console.error(`     ⚠️ [Topic Cache] Cleanup failed: ${e.message}`);
        return memoryCleared;
    }
}

module.exports = {
    logTopic,
    checkRecentTopic,
    cleanupOldEntries,
    topicToWordSet,
    jaccardSimilarity,
    SIMILARITY_THRESHOLD
};

