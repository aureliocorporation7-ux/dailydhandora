const WebSocket = require('ws');
const crypto = require('crypto');
const fs = require('fs');

function edgeTts(text, options = {}) {
    const { voice = "hi-IN-SwaraNeural", volume = "+0%", rate = "+0%", pitch = "+0Hz" } = options;

    return new Promise((resolve, reject) => {
        const uuid = () => crypto.randomUUID().replaceAll("-", "");
        const date = () => new Date().toString();

        // Config 1: Standard
        const token = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";

        // Try removing TrustedClientToken if this fails, or updating headers
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

        ws.on("message", (rawData, isBinary) => {
            if (!isBinary) {
                const dataStr = rawData.toString("utf8");
                // console.log("Received text:", dataStr); // Debug
                if (dataStr.includes("turn.end")) {
                    console.log("Turn end received.");
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
            console.error("Link EdgeTTS WebSocket Error:", e.message);
            reject(e);
        });

        ws.on("close", (code, reason) => {
            console.log(`WebSocket closed: ${code} ${reason}`);
            if (audioData.length > 0) {
                resolve(Buffer.concat(audioData));
            } else {
                reject(new Error("WebSocket closed without audio"));
            }
        });

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

        ws.on("open", () => {
            console.log("WebSocket connected.");
            ws.send(configMessage, { compress: false }, (configError) => {
                if (configError) return reject(configError);

                const ssmlMessage = `X-RequestId:${uuid()}\r\nContent-Type:application/ssml+xml\r\n` +
                    `X-Timestamp:${date()}Z\r\nPath:ssml\r\n\r\n` +
                    `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='hi-IN'>` +
                    `<voice name='${voice}'><prosody pitch='${pitch}' rate='${rate}' volume='${volume}'>` +
                    `${text}</prosody></voice></speak>`;

                ws.send(ssmlMessage, { compress: false }, (ssmlError) => {
                    if (ssmlError) reject(ssmlError);
                });
            });
        });
    });
}

async function testTTS() {
    try {
        console.log("Testing WebSocket Edge TTS...");
        const text = "नागौर में मकर संक्रांति का त्योहार जैसे-जैसे करीब आ रहा है";
        const buffer = await edgeTts(text);

        if (buffer && buffer.length > 0) {
            console.log(`Success! Buffer length: ${buffer.length}`);
            fs.writeFileSync('test-output.mp3', buffer);
        }
    } catch (error) {
        console.error("Final Error:", error);
    }
}

testTTS();
