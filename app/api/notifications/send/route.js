import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { admin, db } from '@/lib/firebase';

/**
 * 🎯 NOTIFICATION SEND API - Supreme Divine Edition
 *
 * FIXED: Correct icon paths (/icon-192x192.png not /icons/icon-192x192.png)
 * FIXED: Added webpush.notification.title/body for browser notification rendering
 * FIXED: Added data payload for push event fallback in service worker
 * FIXED: Added high urgency header for immediate delivery
 */

export async function POST(request) {
    try {
        const cookieStore = await cookies();
        const adminSession = cookieStore.get('admin_session');

        if (!adminSession || adminSession.value !== 'authenticated') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { title, body: notificationBody, image, url, articleId, targetCategory } = body;

        if (!title || !notificationBody) {
            return NextResponse.json({ error: 'Title and body are required' }, { status: 400 });
        }

        // Build query for tokens
        let tokensQuery = db.collection('fcmTokens').where('active', '==', true);

        let tokensSnapshot;
        if (targetCategory) {
            tokensSnapshot = await tokensQuery.get();

            const filteredDocs = tokensSnapshot.docs.filter(doc => {
                const data = doc.data();
                const categories = data.categories || [];
                return categories.length === 0 || categories.includes(targetCategory);
            });

            console.log(`🎯 [Send] Category targeting: "${targetCategory}"`);
            console.log(`🎯 [Send] Filtered ${filteredDocs.length}/${tokensSnapshot.size} devices`);

            tokensSnapshot = { docs: filteredDocs, size: filteredDocs.length, empty: filteredDocs.length === 0 };
        } else {
            tokensSnapshot = await tokensQuery.get();
        }

        if (tokensSnapshot.empty) {
            return NextResponse.json({
                success: false,
                message: targetCategory
                    ? `No devices subscribed to "${targetCategory}"`
                    : 'No subscribed devices found',
                sentCount: 0
            });
        }

        const tokens = tokensSnapshot.docs.map(doc => doc.data().token);
        console.log(`🔔 [Send] Sending to ${tokens.length} devices`);

        // Build message: data-only for reliable SW push event + webpush.notification for auto-display
        const message = {
            data: {
                title: title,
                body: notificationBody,
                url: url || '/',
                articleId: articleId || '',
                image: image || '',
                category: targetCategory || '',
                timestamp: Date.now().toString()
            },
            webpush: {
                fcmOptions: {
                    link: url || '/'
                },
                headers: {
                    Urgency: 'high'
                },
                notification: {
                    title: title,
                    body: notificationBody,
                    icon: '/icon-192x192.png',
                    badge: '/icon-192x192.png',
                    image: image || undefined,
                    vibrate: [200, 100, 200, 100, 200, 100, 300],
                    requireInteraction: true,
                    tag: articleId || targetCategory || 'general',
                    renotify: true,
                    silent: false
                }
            }
        };

        const response = await admin.messaging().sendEachForMulticast({
            tokens,
            ...message
        });

        console.log(`🔔 [Send] Success: ${response.successCount}, Failed: ${response.failureCount}`);

        // Clean up invalid tokens
        const tokensToRemove = [];
        response.responses.forEach((resp, idx) => {
            if (!resp.success) {
                const errorCode = resp.error?.code;
                if (errorCode === 'messaging/registration-token-not-registered' ||
                    errorCode === 'messaging/invalid-registration-token') {
                    tokensToRemove.push(tokens[idx]);
                }
            }
        });

        if (tokensToRemove.length > 0) {
            const batch = db.batch();
            tokensToRemove.forEach(token => {
                batch.delete(db.collection('fcmTokens').doc(token));
            });
            await batch.commit();
            console.log(`🔔 [Send] Removed ${tokensToRemove.length} invalid tokens`);
        }

        return NextResponse.json({
            success: true,
            message: targetCategory
                ? `Notification sent to ${response.successCount} "${targetCategory}" subscribers`
                : `Notification sent to ${response.successCount} devices`,
            sentCount: response.successCount,
            failedCount: response.failureCount,
            cleanedTokens: tokensToRemove.length,
            targetCategory: targetCategory || 'all'
        });

    } catch (error) {
        console.error('❌ [Send] Error:', error);
        return NextResponse.json({ error: 'Failed to send notification', details: error.message }, { status: 500 });
    }
}

export async function GET(request) {
    try {
        const cookieStore = await cookies();
        const adminSession = cookieStore.get('admin_session');

        if (!adminSession || adminSession.value !== 'authenticated') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tokensSnapshot = await db.collection('fcmTokens')
            .where('active', '==', true)
            .get();

        const categoryBreakdown = {};
        tokensSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const categories = data.categories || [];
            if (categories.length === 0) {
                categoryBreakdown['all'] = (categoryBreakdown['all'] || 0) + 1;
            } else {
                categories.forEach(cat => {
                    categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
                });
            }
        });

        return NextResponse.json({
            subscribedDevices: tokensSnapshot.size,
            categoryBreakdown
        });

    } catch (error) {
        console.error('❌ [Send GET] Error:', error);
        return NextResponse.json({ error: 'Failed to get stats' }, { status: 500 });
    }
}