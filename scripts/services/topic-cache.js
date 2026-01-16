/**
 * 🗂️ TOPIC CACHE SERVICE
 * Purpose: Prevent cross-bot duplicate posts within a configurable time window.
 * 
 * Strategy: In-memory cache with Firestore backup for persistence across restarts.
 * The cache stores normalized topic strings with timestamps and source bot names.
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
const DEFAULT_WINDOW_HOURS = 4;

/**
 * Normalizes a topic string for comparison.
 * - Converts to lowercase
 * - Removes extra whitespace
 * - Removes common stop words
 * - Removes punctuation
 */
function normalizeTopic(topic) {
    if (!topic) return '';

    const stopWords = ['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'of', 'for', 'in', 'to'];

    return topic
        .toLowerCase()
        .replace(/[^\w\s\u0900-\u097F]/g, '') // Keep Hindi chars, remove punctuation
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.includes(word))
        .join(' ')
        .trim();
}

/**
 * Logs a topic to the cache.
 * @param {string} topic - The headline/title to log.
 * @param {string} source - The bot name (e.g., 'api-bot', 'edu-bot').
 * @returns {Promise<boolean>} - True if logged successfully.
 */
async function logTopic(topic, source) {
    const normalized = normalizeTopic(topic);
    if (!normalized) return false;

    const entry = {
        topic: normalized,
        originalTopic: topic,
        source: source,
        timestamp: Date.now(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Update memory cache
    memoryCache.set(normalized, entry);

    // Persist to Firestore (fire-and-forget for speed)
    try {
        // Use crypto hash for safe Firestore document ID (no special chars)
        const crypto = require('crypto');
        const docId = crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 40);
        await db.collection(CACHE_COLLECTION).doc(docId).set(entry, { merge: true });
        console.log(`     📝 [Topic Cache] Logged: "${topic.substring(0, 50)}..." from ${source}`);
        return true;
    } catch (e) {
        console.error(`     ⚠️ [Topic Cache] Failed to persist: ${e.message}`);
        return false;
    }
}


/**
 * Checks if a similar topic was recently posted by a DIFFERENT source.
 * @param {string} topic - The headline/title to check.
 * @param {string} currentSource - The bot trying to post (will be excluded).
 * @param {number} [windowHours=4] - Time window in hours.
 * @returns {Promise<{isDuplicate: boolean, originalSource: string|null}>}
 */
async function checkRecentTopic(topic, currentSource, windowHours = DEFAULT_WINDOW_HOURS) {
    const normalized = normalizeTopic(topic);
    if (!normalized) return { isDuplicate: false, originalSource: null };

    const windowMs = windowHours * 60 * 60 * 1000;
    const cutoffTime = Date.now() - windowMs;

    // Check memory cache first (fast path)
    const cached = memoryCache.get(normalized);
    if (cached && cached.source !== currentSource && cached.timestamp > cutoffTime) {
        console.log(`     🔍 [Topic Cache] HIT (Memory): "${topic.substring(0, 30)}..." already posted by ${cached.source}`);
        return { isDuplicate: true, originalSource: cached.source };
    }

    // Fallback to Firestore (cold start or cache miss)
    try {
        const crypto = require('crypto');
        const docId = crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 40);
        const doc = await db.collection(CACHE_COLLECTION).doc(docId).get();


        if (doc.exists) {
            const data = doc.data();
            if (data.source !== currentSource && data.timestamp > cutoffTime) {
                // Update memory cache
                memoryCache.set(normalized, data);
                console.log(`     🔍 [Topic Cache] HIT (Firestore): "${topic.substring(0, 30)}..." already posted by ${data.source}`);
                return { isDuplicate: true, originalSource: data.source };
            }
        }
    } catch (e) {
        console.error(`     ⚠️ [Topic Cache] Check failed: ${e.message}`);
    }

    return { isDuplicate: false, originalSource: null };
}

/**
 * Cleans up old entries from Firestore (run periodically).
 * @param {number} [maxAgeHours=24] - Delete entries older than this.
 */
async function cleanupOldEntries(maxAgeHours = 24) {
    const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);

    try {
        const snapshot = await db.collection(CACHE_COLLECTION)
            .where('timestamp', '<', cutoffTime)
            .limit(100) // Batch size
            .get();

        if (snapshot.empty) {
            console.log(`     🧹 [Topic Cache] No old entries to clean.`);
            return 0;
        }

        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        console.log(`     🧹 [Topic Cache] Cleaned ${snapshot.size} old entries.`);
        return snapshot.size;
    } catch (e) {
        console.error(`     ⚠️ [Topic Cache] Cleanup failed: ${e.message}`);
        return 0;
    }
}

module.exports = {
    logTopic,
    checkRecentTopic,
    cleanupOldEntries,
    normalizeTopic
};
