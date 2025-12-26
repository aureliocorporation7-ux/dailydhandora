import { NextResponse } from 'next/server';
import { HfInference } from '@huggingface/inference';

export async function POST(request) {
    try {
        const { text } = await request.json();

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        // Clean text (Shorten for reliability)
        const cleanText = text.replace(/<[^>]*>?/gm, '').substring(0, 500); 

        const TOKENS = [
            process.env.HUGGINGTOCK,
            process.env.HUGGINGTOCK_BACKUP,
            process.env.HUGGINGTOCK_BACKUP2
        ].filter(Boolean);

        const HF_MODELS = [
            'facebook/mms-tts-hin',
            'suno/bark-small',
            'microsoft/speecht5_tts'
        ];

        let audioBlob = null;

        // 1. Try Hugging Face
        if (TOKENS.length > 0) {
            outerLoop:
            for (const model of HF_MODELS) {
                for (const token of TOKENS) {
                    console.log(`🔊 TTS: Trying HF Model [${model}]...`);
                    try {
                        const hf = new HfInference(token);
                        audioBlob = await hf.textToSpeech({
                            model: model,
                            inputs: cleanText,
                        });
                        console.log(`✅ TTS: Success with HF [${model}]`);
                        break outerLoop;
                    } catch (error) {
                        console.warn(`⚠️ HF Fail: ${error.message}`);
                        if (error.message.includes('No Inference Provider')) break; // Switch model
                    }
                }
            }
        }

        // 2. Ultimate Fallback: Google TTS (If HF fails)
        if (!audioBlob) {
            console.log("🔻 All HF Models failed. Switching to Google TTS Fallback...");
            try {
                // Google TTS URL (Unofficial but reliable for simple use)
                const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanText)}&tl=hi&client=tw-ob`;
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' // Pretend to be a browser
                    }
                });
                if (response.ok) {
                    audioBlob = await response.blob();
                    console.log("✅ TTS: Success with Google Fallback");
                }
            } catch (err) {
                console.error("Google Fallback failed:", err);
            }
        }

        if (!audioBlob) {
            throw new Error("All TTS services (HF & Google) failed.");
        }

        const arrayBuffer = await audioBlob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

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