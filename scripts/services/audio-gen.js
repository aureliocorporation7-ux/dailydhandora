if (process.env.CI) {
    require('dotenv').config({ path: '.env' });
} else {
    require('dotenv').config({ path: '.env.local', override: true });
}

const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
// ✅ SAFE IMPORT: Use the existing initialized Firebase instance
const { db, admin } = require('../../lib/firebase');
const { uploadBuffer } = require('../../lib/cloudinary');

const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb'; // Default voice

/**
 * 🛡️ SANITIZE TEXT FOR TTS
 * Removes HTML, special characters, and problematic symbols
 */
function sanitizeForTTS(text) {
    if (!text) return '';

    let clean = text
        // Remove all HTML tags
        .replace(/<[^>]*>/g, ' ')
        // Remove HTML entities
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, 'और')
        .replace(/&lt;/g, '')
        .replace(/&gt;/g, '')
        .replace(/&quot;/g, '')
        .replace(/&#\d+;/g, '')
        // Remove URLs
        .replace(/https?:\/\/[^\s]+/g, '')
        // Remove email addresses
        .replace(/[\w.-]+@[\w.-]+\.\w+/g, '')
        // Remove special symbols that break TTS
        .replace(/[<>{}[\]|\\^~`]/g, '')
        // Remove multiple asterisks (markdown bold)
        .replace(/\*{2,}/g, '')
        // Remove hashtags
        .replace(/#\w+/g, '')
        // Remove emojis (basic)
        .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
        .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
        .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
        .replace(/[\u{2600}-\u{26FF}]/gu, '')
        .replace(/[\u{2700}-\u{27BF}]/gu, '')
        // Clean up whitespace
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, '. ')
        .trim();

    // Limit length for TTS (5000 chars max)
    if (clean.length > 5000) {
        clean = clean.substring(0, 4950) + '...';
    }

    return clean;
}

/**
 * Adds a valid WAV header to raw PCM data.
 * Defaults: 24kHz, 1 Channel, 16-bit
 */
function addWavHeader(samples, sampleRate = 24000, numChannels = 1, bitDepth = 16) {
    const byteRate = (sampleRate * numChannels * bitDepth) / 8;
    const blockAlign = (numChannels * bitDepth) / 8;
    const dataSize = samples.length;
    const chunkSize = 36 + dataSize;

    const buffer = Buffer.alloc(44);

    // RIFF chunk descriptor
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(chunkSize, 4);
    buffer.write('WAVE', 8);

    // fmt sub-chunk
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
    buffer.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(bitDepth, 34);

    // data sub-chunk
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    return Buffer.concat([buffer, samples]);
}

/**
 * 🎙️ Generates Audio using Gemini Native Audio (Primary)
 */
async function generateGeminiAudio(text) {
    const apiKey = process.env.AUDIO_API;
    if (!apiKey) {
        console.warn('⚠️ [AudioGen] process.env.AUDIO_API is missing. Skipping Gemini.');
        return null;
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: 'models/gemini-2.5-flash-preview-tts',
            apiVersion: 'v1alpha'
        });

        console.log('🎙️ [AudioGen] Attempting Gemini Native Audio (Primary)...');

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: text }] }],
            generationConfig: {
                responseModalities: ["AUDIO"]
            }
        });

        const response = result.response;

        if (response.candidates && response.candidates[0].content.parts[0].inlineData) {
            const part = response.candidates[0].content.parts[0];
            const audioData = part.inlineData.data;
            const mimeType = part.inlineData.mimeType || 'audio/wav';

            let buffer = Buffer.from(audioData, 'base64');

            // If raw PCM, add WAV header
            if (mimeType.includes('pcm') || mimeType.includes('L16')) {
                console.log('   ℹ️ Gemini returned Raw PCM. Adding WAV header...');
                buffer = addWavHeader(buffer, 24000, 1, 16);
            }

            console.log(`✅ [AudioGen] Gemini Success! (${buffer.length} bytes)`);
            return buffer;
        } else {
            console.warn('⚠️ [AudioGen] Gemini response empty or invalid format.');
            return null;
        }

    } catch (error) {
        console.warn(`⚠️ [AudioGen] Gemini Generation Failed: ${error.message}`);
        // Return null to trigger fallback
        return null;
    }
}


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

    // 🛡️ SANITIZE TEXT BEFORE TTS
    const cleanText = sanitizeForTTS(text);
    if (!cleanText || cleanText.length < 10) {
        console.error("❌ [AudioGen] Text too short after sanitization.");
        return null;
    }
    console.log(`🎙️ [AudioGen] Sanitized text length: ${cleanText.length} chars`);

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

        // 2. PRIMARY: Try Gemini Native Audio
        let audioBuffer = await generateGeminiAudio(cleanText);

        // 3. FALLBACK: ElevenLabs (If Gemini failed)
        // 3. FALLBACK: ElevenLabs (If Gemini failed)
        if (!audioBuffer) {
            console.log(`⚠️ [AudioGen] Fallback: Switching to ElevenLabs...`);
            let lastError = null;

            console.log(`🎙️ [AudioGen] Starting ElevenLabs Generation with ${apiKeys.length} available keys...`);

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
                            text: cleanText, // 🛡️ Using sanitized text
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
        }

        if (!audioBuffer) {
            console.error("❌ [AudioGen] All Strategies Failed (Gemini & ElevenLabs). Generation Failed.");
            throw lastError || new Error("All TTS services failed.");
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
