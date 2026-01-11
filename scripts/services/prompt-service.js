const { db } = require('./db-service');

// Simple In-Memory Cache
const cache = {
    data: {},
    expiry: {}
};

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 Minutes

/**
 * Fetch a prompt by key. 
 * Priority: Memory Cache > Firestore > Default (Fallback)
 */
async function getPrompt(key, defaultContent) {
    try {
        const now = Date.now();

        // 1. Check Cache
        if (cache.data[key] && cache.expiry[key] > now) {
            return cache.data[key];
        }

        // 2. Check Database
        // We store all prompts in a 'config' collection, doc 'prompts'
        // OR individual docs in 'prompts' collection. 
        // Let's use 'system_config' collection -> 'prompts' doc -> fields
        const docRef = db.collection('system_config').doc('prompts');
        const doc = await docRef.get();

        if (doc.exists && doc.data()[key]) {
            const dbValue = doc.data()[key];
            // Update Cache
            cache.data[key] = dbValue;
            cache.expiry[key] = now + CACHE_TTL_MS;
            // console.log(`     ✅ [PromptService] Loaded '${key}' from DB.`);
            return dbValue;
        }

    } catch (e) {
        console.error(`     ⚠️ [PromptService] Failed to load '${key}': ${e.message}. Using Default.`);
    }

    // 3. Fallback
    return defaultContent;
}

/**
 * Replace placeholders like {{headline}} in a template string.
 */
function fillTemplate(template, data) {
    let text = template;
    for (const [key, value] of Object.entries(data)) {
        // Replace all occurrences of {{key}}
        // Using global regex with escape
        const regex = new RegExp(`{{${key}}}`, 'g');
        text = text.replace(regex, value || '');
    }
    return text;
}

module.exports = { getPrompt, fillTemplate };
