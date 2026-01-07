if (process.env.CI) {
    require('dotenv').config({ path: '.env' });
} else {
    require('dotenv').config({ path: '.env.local', override: true });
}

const axios = require('axios');
// ✅ SAFE IMPORT: Use the existing initialized Firebase instance
const { db, admin } = require('../../lib/firebase');
const { uploadBuffer } = require('../../lib/cloudinary');

const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb'; // Default voice

/**
 * Retrieves all available ElevenLabs API keys from env.
 * Priortizes numbered keys 1-10, then falls back to the main key.
 */
function getApiKeys() {
    const keys = [];

    // 1. Check Numbered Keys 1-10 (Priority)
    for (let i = 1; i <= 10; i++) {
        const key = process.env[`ELEVENLABS_API_KEY_${i}`];
        if (key && key.trim() !== '') {
            keys.push(key.trim());
        }
    }

    // 2. Check Legacy Main Key
    const mainKey = process.env.ELEVENLABS_API_KEY;
    if (mainKey && mainKey.trim() !== '' && !keys.includes(mainKey.trim())) {
        keys.push(mainKey.trim());
    }

    return keys;
}

/**
 * Generates audio using ElevenLabs with Ultimate Fallback System.
 * Uploads to Cloudinary, and updates Firestore.
 * @param {string} text - The text to convert to speech.
 * @param {string} articleId - The Firestore document ID of the article.
 * @returns {Promise<string|null>} - The Cloudinary audio URL or null on failure.
 */
async function generateAndStoreAudio(text, articleId) {
    if (!text || !articleId) {
        console.error("❌ [AudioGen] Missing text or articleId.");
        return null;
    }

    const apiKeys = getApiKeys();
    if (apiKeys.length === 0) {
        console.error("❌ [AudioGen] NO API KEYS FOUND! Please check .env.local");
        return null;
    }

    // 1. Check Cache in Firestore
    try {
        const docRef = db.collection('articles').doc(articleId);
        const doc = await docRef.get();
        if (doc.exists && doc.data().audioUrl) {
            console.log(`[AudioGen] ♻️ Using existing audio for article ${articleId}`);
            return doc.data().audioUrl;
        }

        // 2. ULTIMATE FALLBACK LOOP
        let audioBuffer = null;
        let lastError = null;

        console.log(`🎙️ [AudioGen] Starting Generation with ${apiKeys.length} available keys...`);

        for (let i = 0; i < apiKeys.length; i++) {
            const currentKey = apiKeys[i];
            const maskedKey = currentKey.substring(0, 4) + '...';
            console.log(`   Attempt ${i + 1}/${apiKeys.length} using key: ${maskedKey}`);

            try {
                const response = await axios({
                    method: 'post',
                    url: `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
                    headers: {
                        'Accept': 'audio/mpeg',
                        'xi-api-key': currentKey,
                        'Content-Type': 'application/json',
                    },
                    data: {
                        text: text.substring(0, 5000), // Safety limit
                        model_id: "eleven_multilingual_v2",
                        vote_confidence: 0.5
                    },
                    responseType: 'arraybuffer'
                });

                audioBuffer = Buffer.from(response.data);
                console.log(`   ✅ Success with Key ${i + 1}! (${audioBuffer.length} bytes)`);
                break; // 🏆 EXIT LOOP ON SUCCESS

            } catch (err) {
                console.warn(`   ⚠️ Key ${i + 1} Failed: ${err.response?.status || err.message}`);
                lastError = err;
                // CONTINUE TO NEXT KEY...
            }
        }

        if (!audioBuffer) {
            console.error("❌ [AudioGen] All API Keys Exhausted. Generation Failed.");
            throw lastError || new Error("All API keys failed.");
        }

        // 3. Upload to Cloudinary
        console.log(`   --> Uploading to Cloudinary...`);
        const audioUrl = await uploadBuffer(audioBuffer, 'news_audio');
        if (!audioUrl) throw new Error("Cloudinary upload failed.");

        // 4. Update Firestore
        await docRef.update({
            audioUrl: audioUrl,
            audioGeneratedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`✅ [AudioGen] Audio Process Completed Successfully.`);
        return audioUrl;

    } catch (error) {
        console.error(`❌ [AudioGen] Fatal Error: ${error.message}`);
        return null; // Return null instead of crashing the bot
    }
}

module.exports = { generateAndStoreAudio };
