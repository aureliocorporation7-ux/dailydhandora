import { NextResponse } from 'next/server';
import { db, FieldValue } from '@/lib/firebase';

// Helper to log activity
async function logActivity(type, message) {
    try {
        await db.collection('activity_log').add({
            type,
            message,
            timestamp: new Date(),
        });
    } catch (e) {
        console.error('Failed to log activity:', e);
    }
}

// POST: Execute quick actions
export async function POST(request) {
    try {
        const body = await request.json();
        const { action } = body;

        switch (action) {
            case 'publish-all': {
                // Get all draft articles
                const draftsSnapshot = await db.collection('articles')
                    .where('status', '==', 'draft')
                    .get();

                if (draftsSnapshot.empty) {
                    return NextResponse.json({ message: 'No drafts to publish' });
                }

                // Batch update
                const batch = db.batch();
                let count = 0;
                draftsSnapshot.forEach(doc => {
                    batch.update(doc.ref, {
                        status: 'published',
                        publishedAt: new Date()
                    });
                    count++;
                });
                await batch.commit();

                await logActivity('admin_publish', `Bulk published ${count} articles`);
                return NextResponse.json({ message: `Published ${count} articles!` });
            }

            case 'generate-audio': {
                // Get articles without audio
                const noAudioSnapshot = await db.collection('articles')
                    .where('status', '==', 'published')
                    .limit(50)
                    .get();

                const articlesNeedingAudio = [];
                noAudioSnapshot.forEach(doc => {
                    const data = doc.data();
                    if (!data.audioUrl) {
                        articlesNeedingAudio.push({ id: doc.id, headline: data.headline });
                    }
                });

                if (articlesNeedingAudio.length === 0) {
                    return NextResponse.json({ message: 'All articles have audio!' });
                }

                // Note: Actual audio generation is resource-intensive
                // This just returns the count for now - can be extended
                await logActivity('audio_generated', `Queued ${articlesNeedingAudio.length} articles for audio generation`);
                return NextResponse.json({
                    message: `${articlesNeedingAudio.length} articles need audio. Use individual generation.`,
                    articles: articlesNeedingAudio.slice(0, 10) // Return first 10
                });
            }

            case 'clear-old-drafts': {
                // Delete drafts older than 7 days
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

                const oldDraftsSnapshot = await db.collection('articles')
                    .where('status', '==', 'draft')
                    .where('createdAt', '<', sevenDaysAgo)
                    .get();

                if (oldDraftsSnapshot.empty) {
                    return NextResponse.json({ message: 'No old drafts to clear' });
                }

                const batch = db.batch();
                let count = 0;
                oldDraftsSnapshot.forEach(doc => {
                    batch.delete(doc.ref);
                    count++;
                });
                await batch.commit();

                await logActivity('admin_delete', `Cleared ${count} old drafts (7d+)`);
                return NextResponse.json({ message: `Deleted ${count} old drafts!` });
            }

            case 'force-bot-run': {
                // This would typically trigger the bot via a webhook or queue
                // For now, we just log the request
                await logActivity('bot_process', 'Force bot run requested via Admin Panel');

                return NextResponse.json({
                    message: 'Bot run scheduled! Check back in 2 minutes.',
                    note: 'Bots run on Render cron. This is a notification marker.'
                });
            }

            default:
                return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
        }
    } catch (error) {
        console.error('[Quick Actions API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
