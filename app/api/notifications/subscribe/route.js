import { NextResponse } from 'next/server';
import { admin, db } from '@/lib/firebase';

/**
 * POST /api/notifications/subscribe
 * 
 * Saves FCM token to Firestore for push targeting.
 * Body: { token, platform?, userAgent? }
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { token, platform, userAgent, categories } = body;

        if (!token) {
            return NextResponse.json(
                { error: 'Token is required' },
                { status: 400 }
            );
        }

        // Validate token format (basic check)
        if (typeof token !== 'string' || token.length < 50) {
            return NextResponse.json(
                { error: 'Invalid token format' },
                { status: 400 }
            );
        }

        // Save to Firestore using token as document ID (prevents duplicates)
        await db.collection('fcmTokens').doc(token).set({
            token,
            platform: platform || 'web',
            userAgent: userAgent || 'unknown',
            categories: Array.isArray(categories) ? categories : [], // NEW: Category subscriptions
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            active: true
        }, { merge: true });

        console.log('🔔 [Subscribe] Token saved successfully');

        return NextResponse.json({
            success: true,
            message: 'Token subscribed successfully'
        });

    } catch (error) {
        console.error('❌ [Subscribe] Error:', error);
        return NextResponse.json(
            { error: 'Failed to save token' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/notifications/subscribe
 * 
 * Removes FCM token from Firestore (unsubscribe).
 * Body: { token }
 */
export async function DELETE(request) {
    try {
        const body = await request.json();
        const { token } = body;

        if (!token) {
            return NextResponse.json(
                { error: 'Token is required' },
                { status: 400 }
            );
        }

        await db.collection('fcmTokens').doc(token).delete();

        console.log('🔔 [Unsubscribe] Token removed');

        return NextResponse.json({
            success: true,
            message: 'Token unsubscribed successfully'
        });

    } catch (error) {
        console.error('❌ [Unsubscribe] Error:', error);
        return NextResponse.json(
            { error: 'Failed to remove token' },
            { status: 500 }
        );
    }
}
