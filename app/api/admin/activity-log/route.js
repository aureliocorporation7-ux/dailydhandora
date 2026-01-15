import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

// Maximum activities to return
const MAX_ACTIVITIES = 50;

// GET: Fetch recent activity log
export async function GET() {
    try {
        const snapshot = await db.collection('activity_log')
            .orderBy('timestamp', 'desc')
            .limit(MAX_ACTIVITIES)
            .get();

        const activities = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            activities.push({
                id: doc.id,
                type: data.type || 'default',
                message: data.message || '',
                timestamp: data.timestamp?.toDate?.().toISOString() || data.timestamp || null,
                metadata: data.metadata || {},
            });
        });

        return NextResponse.json({ activities });
    } catch (error) {
        console.error('[Activity Log API] Error:', error);
        return NextResponse.json({ activities: [] });
    }
}

// POST: Log a new activity
export async function POST(request) {
    try {
        const body = await request.json();
        const { type, message, metadata } = body;

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        const activityData = {
            type: type || 'default',
            message,
            metadata: metadata || {},
            timestamp: new Date(),
        };

        const docRef = await db.collection('activity_log').add(activityData);

        // Optional: Clean up old activities (keep only last 500)
        const oldActivities = await db.collection('activity_log')
            .orderBy('timestamp', 'desc')
            .offset(500)
            .limit(100)
            .get();

        if (!oldActivities.empty) {
            const batch = db.batch();
            oldActivities.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }

        return NextResponse.json({ success: true, id: docRef.id });
    } catch (error) {
        console.error('[Activity Log API] POST Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
