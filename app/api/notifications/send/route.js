import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { admin, db } from '@/lib/firebase';

/**
 * POST /api/notifications/send
 * 
 * Send push notification to all subscribed devices.
 * Protected: Admin only (requires admin_session cookie).
 * 
 * Body: {
 *   title: string,
 *   body: string,
 *   image?: string,
 *   url?: string,
 *   articleId?: string
 * }
 */
export async function POST(request) {
    try {
        // Check admin authentication
        const cookieStore = await cookies();
        const adminSession = cookieStore.get('admin_session');

        if (!adminSession || adminSession.value !== 'authenticated') {
            return NextResponse.json(
                { error: 'Unauthorized - Admin access required' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { title, body: notificationBody, image, url, articleId } = body;

        if (!title || !notificationBody) {
            return NextResponse.json(
                { error: 'Title and body are required' },
                { status: 400 }
            );
        }

        // Fetch all active FCM tokens
        const tokensSnapshot = await db.collection('fcmTokens')
            .where('active', '==', true)
            .get();

        if (tokensSnapshot.empty) {
            return NextResponse.json({
                success: false,
                message: 'No subscribed devices found',
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
                    tag: articleId || 'general'
                }
            }
        };

        // Send to all tokens using sendEachForMulticast
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
                // Remove tokens with permanent errors
                if (errorCode === 'messaging/registration-token-not-registered' ||
                    errorCode === 'messaging/invalid-registration-token') {
                    tokensToRemove.push(tokens[idx]);
                }
            }
        });

        // Batch delete invalid tokens
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
            message: `Notification sent to ${response.successCount} devices`,
            sentCount: response.successCount,
            failedCount: response.failureCount,
            cleanedTokens: tokensToRemove.length
        });

    } catch (error) {
        console.error('❌ [Send] Error:', error);
        return NextResponse.json(
            { error: 'Failed to send notification', details: error.message },
            { status: 500 }
        );
    }
}

/**
 * GET /api/notifications/send
 * 
 * Get count of subscribed devices (Admin only).
 */
export async function GET(request) {
    try {
        const cookieStore = await cookies();
        const adminSession = cookieStore.get('admin_session');

        if (!adminSession || adminSession.value !== 'authenticated') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const tokensSnapshot = await db.collection('fcmTokens')
            .where('active', '==', true)
            .get();

        return NextResponse.json({
            subscribedDevices: tokensSnapshot.size
        });

    } catch (error) {
        console.error('❌ [Send GET] Error:', error);
        return NextResponse.json(
            { error: 'Failed to get subscriber count' },
            { status: 500 }
        );
    }
}
