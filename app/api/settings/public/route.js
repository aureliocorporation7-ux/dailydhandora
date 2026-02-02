import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

/**
 * 🌐 PUBLIC SETTINGS API
 * Returns frontend settings (safe to expose publicly)
 * Used by client components to conditionally render features
 */
export async function GET() {
    try {
        const doc = await db.collection('settings').doc('global').get();

        // Only expose safe, non-sensitive settings
        const data = {
            showViewCounts: doc.exists ? (doc.data().showViewCounts !== false) : true,
            googleAdsEnabled: doc.exists ? (doc.data().googleAdsEnabled || false) : false,
        };

        // Cache for 60 seconds to reduce DB reads
        return NextResponse.json(data, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
            }
        });
    } catch (error) {
        console.error('[Public Settings] Error:', error.message);
        return NextResponse.json({ showViewCounts: true, googleAdsEnabled: false });
    }
}
