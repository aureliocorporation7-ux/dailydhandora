import { NextResponse } from 'next/server';
import { generateAndStoreAudio } from '@/scripts/services/audio-gen';
import { db } from '@/lib/firebase';

// POST /api/admin/generate-audio
export async function POST(req) {
    try {
        const { articleId, text } = await req.json();

        if (!articleId || !text) {
            return NextResponse.json({ error: 'Missing articleId or text' }, { status: 400 });
        }

        // 🛡️ CHECK IF AUDIO GENERATION IS ENABLED
        const settingsDoc = await db.collection('settings').doc('global').get();
        const settings = settingsDoc.exists ? settingsDoc.data() : {};

        if (settings.enableAudioGen === false) {
            console.log(`[API] ❌ Audio Gen is DISABLED in Admin Settings. Rejecting request.`);
            return NextResponse.json({
                error: 'Audio Generation is disabled in Admin Settings. Enable it first!'
            }, { status: 403 });
        }

        console.log(`[API] ✅ Audio Gen enabled. Generating for ${articleId}...`);
        console.log(`[API] ⚙️ Settings: Paid Audio enabled: ${settings.enablePaidAudio !== false}`);

        // Call the service with settings (which handles Cloudinary + Firestore update)
        const audioUrl = await generateAndStoreAudio(text, articleId, {
            enablePaidAudio: settings.enablePaidAudio !== false // Default true
        });

        if (!audioUrl) {
            return NextResponse.json({ error: 'Audio generation failed' }, { status: 500 });
        }

        return NextResponse.json({ success: true, audioUrl });

    } catch (error) {
        console.error("[API] Generate Audio Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
