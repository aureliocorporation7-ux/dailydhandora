import { NextResponse } from 'next/server';
import { admin, db } from '@/lib/firebase';

/**
 * 🎯 NOTIFICATION SUBSCRIBE API - Auto-Targeting Edition
 * 
 * Saves FCM tokens with category preferences for targeted notifications.
 * Links guest tracking ID to FCM token.
 */

export async function POST(request) {
    try {
        const body = await request.json();
        const { token, platform, userAgent, categories, guestId } = body;

        if (!token) {
            return NextResponse.json({ error: 'Token is required' }, { status: 400 });
        }

        if (typeof token !== 'string' || token.length < 50) {
            return NextResponse.json({ error: 'Invalid token format' }, { status: 400 });
        }

        // Save to Firestore with auto-targeting data
        await db.collection('fcmTokens').doc(token).set({
            token,
            platform: platform || 'web',
            userAgent: userAgent || 'unknown',
            // 🎯 Auto-targeting fields
            guestId: guestId || null,
            categories: Array.isArray(categories) ? categories : [],
            // Timestamps
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            active: true
        }, { merge: true });

        console.log('🔔 [Subscribe] Token saved with categories:', categories);

        return NextResponse.json({
            success: true,
            message: 'Token subscribed with category preferences',
            categories: categories || []
        });

    } catch (error) {
        console.error('❌ [Subscribe] Error:', error);
        return NextResponse.json({ error: 'Failed to save token' }, { status: 500 });
    }
}

/**
 * PATCH /api/notifications/subscribe
 * 
 * Update category preferences for existing token
 */
export async function PATCH(request) {
    try {
        const body = await request.json();
        const { token, categories } = body;

        if (!token) {
            return NextResponse.json({ error: 'Token is required' }, { status: 400 });
        }

        await db.collection('fcmTokens').doc(token).update({
            categories: Array.isArray(categories) ? categories : [],
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return NextResponse.json({
            success: true,
            message: 'Categories updated'
        });

    } catch (error) {
        console.error('❌ [Subscribe PATCH] Error:', error);
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const body = await request.json();
        const { token } = body;

        if (!token) {
            return NextResponse.json({ error: 'Token is required' }, { status: 400 });
        }

        await db.collection('fcmTokens').doc(token).delete();
        console.log('🔔 [Unsubscribe] Token removed');

        return NextResponse.json({
            success: true,
            message: 'Token unsubscribed successfully'
        });

    } catch (error) {
        console.error('❌ [Unsubscribe] Error:', error);
        return NextResponse.json({ error: 'Failed to remove token' }, { status: 500 });
    }
}
