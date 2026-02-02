import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

// GET: Fetch current bot settings
export async function GET() {
  try {
    const doc = await db.collection('settings').doc('global').get();
    let data = { botMode: 'auto', imageGenEnabled: true };

    if (doc.exists) {
      const docData = doc.data();
      data = {
        botMode: docData.botMode || 'auto',
        imageGenEnabled: docData.imageGenEnabled !== false,
        enableAudioGen: docData.enableAudioGen !== false,
        googleAdsId: docData.googleAdsId || '', // Google AdSense Publisher ID
        googleAdsEnabled: docData.googleAdsEnabled || false,
        showViewCounts: docData.showViewCounts !== false // Default true - show views on trending
      };
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Update bot settings
export async function POST(request) {
  try {
    const body = await request.json();
    const updateData = {};

    if (body.mode) {
      if (!['auto', 'manual', 'off'].includes(body.mode)) {
        return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
      }
      updateData.botMode = body.mode;
    }

    if (typeof body.imageGenEnabled !== 'undefined') {
      updateData.imageGenEnabled = body.imageGenEnabled;
    }

    if (typeof body.enableAudioGen !== 'undefined') {
      updateData.enableAudioGen = body.enableAudioGen;
    }

    // Google Ads settings
    if (typeof body.googleAdsId !== 'undefined') {
      updateData.googleAdsId = body.googleAdsId;
    }
    if (typeof body.googleAdsEnabled !== 'undefined') {
      updateData.googleAdsEnabled = body.googleAdsEnabled;
    }

    // Show View Counts toggle
    if (typeof body.showViewCounts !== 'undefined') {
      updateData.showViewCounts = body.showViewCounts;
    }

    await db.collection('settings').doc('global').set(updateData, { merge: true });
    return NextResponse.json({ success: true, ...updateData });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
