import { NextResponse } from 'next/server';
import { generateAndStoreAudio } from '@/scripts/services/audio-gen';

// POST /api/admin/generate-audio
export async function POST(req) {
    try {
        const { articleId, text } = await req.json();

        if (!articleId || !text) {
            return NextResponse.json({ error: 'Missing articleId or text' }, { status: 400 });
        }

        console.log(`[API] Admin requesting audio for ${articleId}...`);

        // Call the service (which handles Cloudinary + Firestore update)
        const audioUrl = await generateAndStoreAudio(text, articleId);

        if (!audioUrl) {
            return NextResponse.json({ error: 'Audio generation failed' }, { status: 500 });
        }

        return NextResponse.json({ success: true, audioUrl });

    } catch (error) {
        console.error("[API] Generate Audio Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
