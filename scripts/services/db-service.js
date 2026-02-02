if (process.env.CI) {
    require('dotenv').config({ path: '.env' });
} else {
    require('dotenv').config({ path: '.env.local', override: true });
}

const { db, admin } = require('../../lib/firebase');

/**
 * Checks if a document exists in a collection based on a field value.
 * @param {string} collectionName - 'articles', 'schemes', etc.
 * @param {string} field - The field to check (e.g., 'slug', 'sourceUrl', 'headline').
 * @param {string} value - The value to search for.
 * @returns {Promise<boolean>} - True if duplicate exists.
 */
async function checkDuplicate(collectionName, field, value) {
    try {
        const snapshot = await db.collection(collectionName)
            .where(field, '==', value)
            .limit(1)
            .get();
        return !snapshot.empty;
    } catch (error) {
        console.error(`❌ Error checking duplicate in ${collectionName}:`, error.message);
        return false;
    }
}

/**
 * Saves a document to a collection.
 * @param {string} collectionName - Collection to save to.
 * @param {Object} data - The data object.
 * @param {string} [docId] - Optional custom document ID.
 * @returns {Promise<string|null>} - The document ID or null on failure.
 */
async function saveDocument(collectionName, data, docId = null) {
    try {
        // Add timestamps
        const finalData = {
            ...data,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        if (docId) {
            await db.collection(collectionName).doc(docId).set(finalData, { merge: true });
            return docId;
        } else {
            const docRef = await db.collection(collectionName).add(finalData);
            return docRef.id;
        }
    } catch (error) {
        console.error(`❌ Error saving document to ${collectionName}:`, error.message);
        return null;
    }
}

/**
 * Fetches global bot settings from Firestore.
 * @returns {Promise<Object>} - The settings object.
 */
async function getBotSettings() {
    try {
        // console.log("  ⚙️ [DB Service] Fetching Admin Settings..."); // Too noisy for every loop? Maybe okay.
        const doc = await db.collection('settings').doc('global').get();
        if (doc.exists) {
            const data = doc.data();
            const botMode = data.botMode || 'auto';
            return {
                botMode: botMode,
                isBotActive: botMode !== 'off',
                enableImageGen: data.imageGenEnabled !== false,
                enableAudioGen: data.enableAudioGen !== false, // Default true if undefined
                articleStatus: botMode === 'manual' ? 'draft' : 'published',
                enableAI: true // Assumed true as no UI toggle exists yet
            };
        }
    } catch (error) {
        console.error("❌ Error fetching settings:", error.message);
    }
    // Default fallback
    return {
        botMode: 'auto',
        isBotActive: true,
        enableImageGen: true,
        enableAudioGen: true,
        articleStatus: 'published',
        enableAI: true
    };
}

/**
 * 🧠 GOD-LEVEL: Fetches recent headlines for AI duplicate detection.
 * Used to pass headline context to AI so it can semantically detect duplicates.
 * @param {number} hours - Time window in hours (default 6)
 * @param {number} limit - Max headlines to fetch (default 20)
 * @returns {Promise<string[]>} - Array of recent headline strings
 */
async function getRecentHeadlines(hours = 6, limit = 20) {
    try {
        const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
        const snapshot = await db.collection('articles')
            .where('createdAt', '>', cutoff)
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

        const headlines = snapshot.docs
            .map(doc => doc.data().headline)
            .filter(h => h); // Filter out any null/undefined

        console.log(`     📋 [DB] Fetched ${headlines.length} recent headlines for duplicate check`);
        return headlines;
    } catch (error) {
        console.error(`     ⚠️ [DB] Failed to fetch recent headlines: ${error.message}`);
        return []; // Return empty array on error - AI will just write without duplicate context
    }
}

module.exports = { db, checkDuplicate, saveDocument, getBotSettings, getRecentHeadlines, admin };

