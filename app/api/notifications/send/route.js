import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { admin, db } from '@/lib/firebase';

/**
 * 🎯 NOTIFICATION SEND API - Auto-Targeting Edition
 * 
 * Send push notifications to all or targeted devices.
 * NEW: Supports category filtering for auto-targeting.
 */

export async function POST(request) {
    try {
        // Check admin authentication
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

        // 🎯 CATEGORY TARGETING - Filter by category if specified
        let tokensSnapshot;
        if (targetCategory) {
            // Get all active tokens first
            tokensSnapshot = await tokensQuery.get();

            // Filter tokens that have this category in their preferences
            const filteredDocs = tokensSnapshot.docs.filter(doc => {
                const data = doc.data();
                const categories = data.categories || [];
                // Include if user has this category OR has no categories (send to all)
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

        // Build notification message
        const message = {
            notification: {
                title,
                body: notificationBody,
                ...(image && { image })
            },
            data: {
                title,
                body: notificationBody,
                url: url || '/',
                articleId: articleId || '',
                category: targetCategory || '',
                timestamp: Date.now().toString()
            },
            webpush: {
                fcmOptions: {
                    link: url || '/'
                },
                notification: {
                    icon: '/icons/icon-192x192.png',
                    badge: '/icons/badge-72x72.png',
                    vibrate: [200, 100, 200],
                    requireInteraction: true,
                    tag: articleId || targetCategory || 'general'
                }
            }
        };

        // Send to all tokens
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

/**
 * GET /api/notifications/send
 * Get subscriber counts (with optional category breakdown)
 */
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

        // Build category breakdown
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
