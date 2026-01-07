const { WebSocket } = require('ws');
const crypto = require('crypto');
const fs = require('fs');

async function edgeTts(text, options = {}) {
    const { voice = "hi-IN-SwaraNeural", volume = "+0%", rate = "+0%", pitch = "+0Hz" } = options;

    return new Promise((resolve, reject) => {
        const uuid = () => crypto.randomUUID().replaceAll("-", "");
        const date = () => new Date().toString();

        const token = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
        const url = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${token}&ConnectionId=${uuid()}`;

        console.log("Connecting to:", url);

        const ws = new WebSocket(url, {
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
                console.log("Received Text Data:", dataStr);
                if (dataStr.includes("turn.end")) {
                    resolve(Buffer.concat(audioData));
                    ws.close();
                }
                return;
            }

            console.log("Received Binary Chunk:", rawData.length);
            const data = rawData;
            const separator = "Path:audio\r\n";
            const separatorIndex = data.indexOf(separator);
            if (separatorIndex !== -1) {
                const content = data.subarray(separatorIndex + separator.length);
                audioData.push(content);
            }
        });

        ws.on("error", (e) => {
            console.error("WS Error:", e);
            reject(e);
        });

        ws.on("close", (code, reason) => {
            console.log("WS Closed:", code, reason.toString());
            if (audioData.length > 0) {
                resolve(Buffer.concat(audioData));
            } else {
                reject(new Error("Connection closed with no audio"));
            }
        });

        ws.on("open", () => {
            console.log("WS Open");
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

            // SENDING 'Tom & Jerry' WITHOUT ESCAPING to test failure
            const ssmlMessage = `X-RequestId:${uuid()}\r\nContent-Type:application/ssml+xml\r\n` +
                `X-Timestamp:${date()}Z\r\nPath:ssml\r\n\r\n` +
                `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='hi-IN'>` +
                `<voice name='${voice}'><prosody pitch='${pitch}' rate='${rate}' volume='${volume}'>` +
                `${text}</prosody></voice></speak>`;

            ws.send(ssmlMessage, { compress: false });
        });
    });
}

(async () => {
    try {
        console.log("Starting TTS Test with '&' char...");
        const buffer = await edgeTts("Tom & Jerry"); // This & should likely break it
        fs.writeFileSync('test-edge-broken.mp3', buffer);
        console.log("✅ Written test-edge-broken.mp3");
    } catch (e) {
        console.error("❌ Failed:", e);
    }
})();
