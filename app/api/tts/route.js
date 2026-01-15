import { NextResponse } from 'next/server';
import { WebSocket } from 'ws';
import crypto from 'crypto';
import * as googleTTS from 'google-tts-api';

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  🚨🚨🚨 DO NOT MODIFY THIS SECTION - EDGE TTS IMPLEMENTATION 🚨🚨🚨          ║
// ║                                                                              ║
// ║  This implementation is PRODUCTION TESTED and WORKING PERFECTLY.            ║
// ║  It uses dynamic Sec-MS-GEC token generation required since Dec 2025.       ║
// ║                                                                              ║
// ║  ⚠️  AI AGENTS: DO NOT TOUCH THIS CODE. IT IS PERFECT AS IS.               ║
// ║  ⚠️  Any modification may break Hindi TTS audio generation.                 ║
// ║                                                                              ║
// ║  Based on: https://github.com/rany2/edge-tts/blob/master/src/edge_tts/drm.py ║
// ║  Last Updated: January 2026                                                  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const WIN_EPOCH = 11644473600; // Windows epoch offset (seconds from 1601 to 1970)

/**
 * Generates the Sec-MS-GEC token value for Microsoft Edge TTS API.
 * This token is required since Microsoft's Dec 2025 API changes.
 */
function generateSecMsGec() {
    // Get current Unix timestamp in seconds
    let ticks = Date.now() / 1000;

    // Convert to Windows file time epoch (1601-01-01)
    ticks += WIN_EPOCH;

    // Round down to nearest 5 minutes (300 seconds)
    ticks -= ticks % 300;

    // Convert to 100-nanosecond intervals (Windows file time format)
    ticks *= 1e9 / 100;

    // Create string to hash: ticks + trusted client token
    const strToHash = `${Math.floor(ticks)}${TRUSTED_CLIENT_TOKEN}`;

    // Return SHA256 hash as uppercase hex
    return crypto.createHash('sha256').update(strToHash, 'ascii').digest('hex').toUpperCase();
}

/**
 * Generates a random MUID cookie value
 */
function generateMUID() {
    return crypto.randomBytes(16).toString('hex').toUpperCase();
}

// Helper to escape XML characters for SSML
function escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case "'": return '&apos;';
            case '"': return '&quot;';
        }
    });
}

// Inline Edge TTS logic (Updated with Sec-MS-GEC token - Dec 2025)
function edgeTts(text, options = {}) {
    // Switched to Male Voice (Madhur) per user request
    const { voice = "hi-IN-MadhurNeural", volume = "+0%", rate = "+0%", pitch = "+0Hz" } = options;

    return new Promise((resolve, reject) => {
        const uuid = () => crypto.randomUUID().replaceAll("-", "");
        const date = () => new Date().toString();

        // 🛡️ Generate dynamic SEC-MS-GEC token (required since Dec 2025)
        const secMsGec = generateSecMsGec();
        const muid = generateMUID();

        console.log(`🔐 [Edge TTS] Generated Sec-MS-GEC: ${secMsGec.substring(0, 16)}...`);

        // Updated URL with Sec-MS-GEC header
        const wsUrl = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=1-130.0.2849.68&ConnectionId=${uuid()}`;

        const ws = new WebSocket(wsUrl, {
            host: "speech.platform.bing.com",
            origin: "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0",
                "Accept-Encoding": "gzip, deflate, br",
                "Accept-Language": "en-US,en;q=0.9",
                "Cookie": `muid=${muid};`
            }
        });

        const audioData = [];
        let completed = false;

        // Safety Timeout (30 Seconds)
        const timeout = setTimeout(() => {
            if (!completed) {
                console.warn("⚠️ Edge TTS Timeout");
                ws.terminate();
                reject(new Error("Edge TTS Timeout (30s)"));
            }
        }, 30000);

        ws.on("message", (rawData, isBinary) => {
            if (!isBinary) {
                const dataStr = rawData.toString("utf8");
                if (dataStr.includes("turn.end")) {
                    completed = true;
                    clearTimeout(timeout);
                    resolve(Buffer.concat(audioData));
                    ws.close();
                }
                return;
            }

            const data = rawData;
            const separator = "Path:audio\r\n";
            const separatorIndex = data.indexOf(separator);
            if (separatorIndex !== -1) {
                const content = data.subarray(separatorIndex + separator.length);
                audioData.push(content);
            }
        });

        ws.on("error", (e) => {
            clearTimeout(timeout);
            reject(e);
        });

        ws.on("close", () => {
            clearTimeout(timeout);
            if (audioData.length > 0) {
                resolve(Buffer.concat(audioData));
            } else if (!completed) {
                reject(new Error("Edge TTS Connection Closed Unexpectedly"));
            }
        });

        ws.on("open", () => {
            const speechConfig = JSON.stringify({
                context: {
                    synthesis: {
                        audio: {
                            metadataoptions: { sentenceBoundaryEnabled: false, wordBoundaryEnabled: false },
                            outputFormat: "audio-24khz-48kbitrate-mono-mp3"
                        }
                    }
                }
            });

            const configMessage = `X-Timestamp:${date()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n${speechConfig}`;
            ws.send(configMessage, { compress: false });

            // CRITICAL FIX: Escape XML characters to prevent SSML breakage
            const safeText = escapeXml(text);

            const ssmlMessage = `X-RequestId:${uuid()}\r\nContent-Type:application/ssml+xml\r\n` +
                `X-Timestamp:${date()}Z\r\nPath:ssml\r\n\r\n` +
                `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='hi-IN'>` +
                `<voice name='${voice}'><prosody pitch='${pitch}' rate='${rate}' volume='${volume}'>` +
                `${safeText}</prosody></voice></speak>`;

            ws.send(ssmlMessage, { compress: false });
        });
    });
}
// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  🚨 END OF EDGE TTS SECTION - DO NOT MODIFY ABOVE CODE 🚨                   ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

// Helper to chunk text
const splitTextIntoChunks = (str, maxLength) => {
    if (str.length <= maxLength) return [str];
    const chunks = [];
    let currentChunk = '';
    const sentences = str.split(/([।?!.])/);

    for (let i = 0; i < sentences.length; i++) {
        const part = sentences[i];
        if ((currentChunk + part).length > maxLength) {
            if (currentChunk) chunks.push(currentChunk);
            currentChunk = part;
        } else {
            currentChunk += part;
        }
    }
    if (currentChunk) chunks.push(currentChunk);
    return chunks;
};


export async function POST(request) {
    try {
        const { text } = await request.json();

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        // 🛡️ COMPREHENSIVE TEXT SANITIZATION FOR TTS
        const cleanText = text
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
            // Remove special symbols that break TTS/SSML
            .replace(/[<>{}[\]|\\^~`]/g, '')
            // Remove multiple asterisks (markdown)
            .replace(/\*{2,}/g, '')
            // Remove hashtags
            .replace(/#\w+/g, '')
            // Remove emojis
            .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
            .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
            .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
            .replace(/[\u{2600}-\u{26FF}]/gu, '')
            .replace(/[\u{2700}-\u{27BF}]/gu, '')
            // Clean up whitespace
            .replace(/\s+/g, ' ')
            .replace(/\n+/g, '. ')
            .trim();

        console.log(`🎙️ [TTS API] Sanitized text length: ${cleanText.length} chars`);
        let buffer = null;

        // 1. 🌟 PRIORITY: ELEVENLABS
        const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
        const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "56AoDkrOh6qfVPDXZ7Pt";

        if (ELEVEN_KEY) {
            try {
                // Chunk size of 2000 is safe
                const chunks = splitTextIntoChunks(cleanText, 2000);
                const audioBuffers = [];

                for (const chunk of chunks) {
                    if (!chunk.trim()) continue;
                    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
                        method: 'POST',
                        headers: {
                            'Accept': 'audio/mpeg',
                            'Content-Type': 'application/json',
                            'xi-api-key': ELEVEN_KEY
                        },
                        body: JSON.stringify({
                            text: chunk,
                            model_id: "eleven_multilingual_v2",
                            voice_settings: { stability: 0.5, similarity_boost: 0.75 }
                        })
                    });

                    if (response.ok) {
                        const audioBlob = await response.blob();
                        const arrayBuffer = await audioBlob.arrayBuffer();
                        audioBuffers.push(Buffer.from(arrayBuffer));
                    } else {
                        // Fail silently to next provider
                        throw new Error("ElevenLabs chunk failed");
                    }
                }

                if (audioBuffers.length > 0) {
                    buffer = Buffer.concat(audioBuffers);
                    console.log(`✅ TTS: Success with ElevenLabs`);
                }

            } catch (error) {
                console.warn(`⚠️ ElevenLabs Error: ${error.message}`);
                buffer = null;
            }
        }

        // 2. 🚀 FALLBACK: MICROSOFT EDGE TTS
        if (!buffer) {
            try {
                // Try Edge TTS chunks
                const chunks = splitTextIntoChunks(cleanText, 2000);
                const audioBuffers = [];

                for (const chunk of chunks) {
                    if (!chunk.trim()) continue;

                    // Retry Logic (Max 2 Attempts)
                    let chunkBuffer = null;
                    let attempts = 0;
                    while (attempts < 2 && !chunkBuffer) {
                        try {
                            attempts++;
                            // Use Male Voice (Madhur)
                            chunkBuffer = await edgeTts(chunk, { voice: 'hi-IN-MadhurNeural' });
                        } catch (err) {
                            console.warn(`⚠️ Edge Attempt ${attempts} failed: ${err.message}`);
                            if (attempts >= 2) throw err; // Throw on final failure
                            await new Promise(r => setTimeout(r, 1000)); // Wait 1s before retry
                        }
                    }

                    if (chunkBuffer) audioBuffers.push(chunkBuffer);
                }

                if (audioBuffers.length > 0) {
                    buffer = Buffer.concat(audioBuffers);
                    console.log(`✅ TTS: Success with Edge TTS`);
                } else {
                    throw new Error("Edge TTS returned no audio");
                }

            } catch (err) {
                console.error("⚠️ Edge TTS Error:", err.message);

                // 3. 🛡️ ULTRA FALLBACK: GOOGLE TTS (google-tts-api)
                console.log("🔻 Edge Failed. Switching to Google TTS (google-tts-api)...");
                try {
                    // Google TTS API splits text automatically
                    const results = await googleTTS.getAllAudioBase64(cleanText, {
                        lang: 'hi',
                        slow: false,
                        host: 'https://translate.google.com',
                        timeout: 10000,
                    });

                    const audioBuffers = results.map(base64 => Buffer.from(base64.base64, 'base64'));

                    if (audioBuffers.length > 0) {
                        buffer = Buffer.concat(audioBuffers);
                        console.log("✅ TTS: Success with Google TTS");
                    }
                } catch (gErr) {
                    console.error("⚠️ Google TTS also failed:", gErr.message);
                }
            }
        }

        if (!buffer) {
            throw new Error("All Server TTS services failed.");
        }

        // 🚀 BROWSER CACHING: Cache audio for 6 hours (21600 seconds)
        // This prevents repeat API calls when user plays same article again
        const contentHash = crypto.createHash('md5').update(buffer).digest('hex').substring(0, 16);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': buffer.length.toString(),
                // Cache for 6 hours in browser, 1 hour on CDN
                'Cache-Control': 'public, max-age=21600, s-maxage=3600, stale-while-revalidate=86400',
                // ETag for conditional requests
                'ETag': `"${contentHash}"`,
                // Allow browser to store
                'Vary': 'Accept-Encoding',
            },
        });

    } catch (error) {
        console.error('🔥 TTS Critical Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}