import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

// GET: Fetch bot status for all bots
export async function GET() {
    try {
        const doc = await db.collection('system_config').doc('bot_status').get();

        if (!doc.exists) {
            // Return default status if no data exists
            return NextResponse.json({
                news: { lastRun: null, status: 'idle', articlesGenerated: 0 },
                mandi: { lastRun: null, status: 'idle', articlesGenerated: 0 },
                edu: { lastRun: null, status: 'idle', articlesGenerated: 0 },
                scheme: { lastRun: null, status: 'idle', articlesGenerated: 0 },
            });
        }

        const data = doc.data();

        // Convert Firestore Timestamps to ISO strings
        const serializeStatus = (status) => {
            if (!status) return { lastRun: null, status: 'idle', articlesGenerated: 0 };
            return {
                lastRun: status.lastRun?.toDate?.().toISOString() || status.lastRun || null,
                status: status.status || 'idle',
                articlesGenerated: status.articlesGenerated || 0,
                error: status.error || null,
            };
        };

        return NextResponse.json({
            news: serializeStatus(data.news),
            mandi: serializeStatus(data.mandi),
            edu: serializeStatus(data.edu),
            scheme: serializeStatus(data.scheme),
        });
    } catch (error) {
        console.error('[Bot Status API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Update bot status (called by bots after execution)
export async function POST(request) {
    try {
        const body = await request.json();
        const { bot, status, articlesGenerated, error } = body;

        if (!bot || !['news', 'mandi', 'edu', 'scheme'].includes(bot)) {
            return NextResponse.json({ error: 'Invalid bot name' }, { status: 400 });
        }

        const updateData = {
            [bot]: {
                lastRun: new Date(),
                status: status || 'success',
                articlesGenerated: articlesGenerated || 0,
                error: error || null,
            }
        };

        await db.collection('system_config').doc('bot_status').set(updateData, { merge: true });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Bot Status API] POST Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
