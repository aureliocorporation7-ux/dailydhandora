if (process.env.CI) {
    require('dotenv').config({ path: '.env' });
} else {
    require('dotenv').config({ path: '.env.local', override: true });
}

const { db, admin } = require('../../lib/firebase');
const bloggerService = require('./blogger-service');

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
 * Saves a document to a collection with retry logic.
 * @param {string} collectionName - Collection to save to.
 * @param {Object} data - The data object.
 * @param {string} [docId] - Optional custom document ID.
 * @param {Object} [options] - Additional options.
 * @param {number} [options.maxRetries=3] - Maximum number of retry attempts.
 * @param {number} [options.initialDelay=1000] - Initial delay between retries in ms.
 * @returns {Promise<string|null>} - The document ID or null on failure.
 */
async function saveDocument(collectionName, data, docId = null, options = {}) {
    const maxRetries = options.maxRetries || 3;
    const initialDelay = options.initialDelay || 1000;
    
    // Add timestamps
    const finalData = {
        ...data,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            if (docId) {
                await db.collection(collectionName).doc(docId).set(finalData, { merge: true });
                console.log(`✅ [DB] Document saved to ${collectionName}/${docId} (attempt ${attempt}/${maxRetries})`);
                
                // 🚀 BLOGGER AUTO-POST: Trigger if it's a published article
                if (collectionName === 'articles' && finalData.status === 'published') {
                    try {
                        await bloggerService.publishToBlogger(finalData, docId, db);
                    } catch (err) {
                        console.error('⚠️ [Blogger Hook Error]:', err.message);
                    }
                }
                
                return docId;
            } else {
                const docRef = await db.collection(collectionName).add(finalData);
                console.log(`✅ [DB] Document saved to ${collectionName}/${docRef.id} (attempt ${attempt}/${maxRetries})`);
                
                // 🚀 BLOGGER AUTO-POST: Trigger if it's a published article
                if (collectionName === 'articles' && finalData.status === 'published') {
                    try {
                        await bloggerService.publishToBlogger(finalData, docRef.id, db);
                    } catch (err) {
                        console.error('⚠️ [Blogger Hook Error]:', err.message);
                    }
                }
                
                return docRef.id;
            }
        } catch (error) {
            console.error(`❌ [DB] Error saving document to ${collectionName} (attempt ${attempt}/${maxRetries}):`, error.message);
            
            // Don't retry on certain errors
            if (error.code === 6 || error.code === 'ALREADY_EXISTS') {
                console.log(`⚠️ [DB] Non-retryable error, stopping retries`);
                return null;
            }
            
            // Exponential backoff before retry
            if (attempt < maxRetries) {
                const delay = initialDelay * Math.pow(2, attempt - 1);
                console.log(`⏳ [DB] Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    console.error(`❌ [DB] Failed to save document after ${maxRetries} attempts`);
    return null;
}

/**
 * Batch save multiple documents efficiently.
 * @param {string} collectionName - Collection to save to.
 * @param {Array<Object>} documents - Array of data objects.
 * @param {number} [batchSize=500] - Firestore batch limit (max 500 operations per batch).
 * @returns {Promise<Array<string|null>>} - Array of document IDs or null for failed documents.
 */
async function saveDocumentsBatch(collectionName, documents, batchSize = 500) {
    if (!documents || documents.length === 0) {
        console.log('⚠️ [DB] No documents to batch save');
        return [];
    }

    const results = [];
    const batches = [];
    
    // Create batches
    for (let i = 0; i < documents.length; i += batchSize) {
        const batch = db.batch();
        const batchDocs = documents.slice(i, i + batchSize);
        const batchDocRefs = [];
        
        batchDocs.forEach(doc => {
            const docRef = db.collection(collectionName).doc();
            batchDocRefs.push({ ref: docRef, data: doc });
            batch.set(docRef, {
                ...doc,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });
        
        batches.push({ batch, batchDocRefs });
    }

    console.log(`📦 [DB] Processing ${documents.length} documents in ${batches.length} batch(es)`);

    // Execute batches
    for (let i = 0; i < batches.length; i++) {
        const { batch, batchDocRefs } = batches[i];
        try {
            await batch.commit();
            console.log(`✅ [DB] Batch ${i + 1}/${batches.length} committed successfully`);
            
            // Add document IDs to results
            batchDocRefs.forEach(({ ref }) => {
                results.push(ref.id);
            });
        } catch (error) {
            console.error(`❌ [DB] Batch ${i + 1}/${batches.length} failed:`, error.message);
            // Add null for each failed document in this batch
            batchDocRefs.forEach(() => results.push(null));
        }
    }

    return results;
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

module.exports = {
    db,
    admin,
    checkDuplicate,
    saveDocument,
    saveDocumentsBatch,
    getBotSettings,
    getRecentHeadlines
};

