import { NextResponse } from 'next/server';
import { WebSocket } from 'ws';
import crypto from 'crypto';
import * as googleTTS from 'google-tts-api';

// Inline Edge TTS logic 
// Helper to escape XML characters for SSML
function escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
}

// Inline Edge TTS logic (Robuster Version)
function edgeTts(text, options = {}) {
    // Switched to Male Voice (Madhur) per user request
    const { voice = "hi-IN-MadhurNeural", volume = "+0%", rate = "+0%", pitch = "+0Hz" } = options;

    return new Promise((resolve, reject) => {
        const uuid = () => crypto.randomUUID().replaceAll("-", "");
        const date = () => new Date().toString();

        // Config 1: Standard token
        const token = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
        const ws = new WebSocket(`wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${token}&ConnectionId=${uuid()}`, {
            host: "speech.platform.bing.com",
            origin: "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0",
                "Accept-Encoding": "gzip, deflate, br",
                "Accept-Language": "en-US,en;q=0.9"
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

        const cleanText = text.replace(/<[^>]*>?/gm, '').trim();
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

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': buffer.length.toString(),
            },
        });

    } catch (error) {
        console.error('🔥 TTS Critical Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}