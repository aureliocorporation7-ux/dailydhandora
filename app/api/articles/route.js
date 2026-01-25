import { db } from '@/lib/firebase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 's-maxage=60, stale-while-revalidate=30',
};

// Category Mapping (English -> Hindi DB Fields)
const CATEGORY_MAP = {
  'mandi': 'मंडी भाव',
  'news': 'नागौर न्यूज़',
  'education': 'शिक्षा विभाग',
  'schemes': 'सरकारी योजना',
  'jobs': 'भर्ती व रिजल्ट'
};

// Reverse mapping (Hindi -> English key)
const REVERSE_MAP = Object.fromEntries(
  Object.entries(CATEGORY_MAP).map(([k, v]) => [v, k])
);

export async function OPTIONS() {
  return NextResponse.json({}, { headers: HEADERS });
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryKey = searchParams.get('category'); // e.g., 'news', 'mandi'
    const limitParams = parseInt(searchParams.get('limit') || '10');
    const lastCreatedAt = searchParams.get('lastCreatedAt'); // ISO string for pagination logic

    // 1. Validate Category
    const hindiCategory = CATEGORY_MAP[categoryKey];
    if (!hindiCategory) {
      return NextResponse.json(
        { error: 'Invalid or missing category' },
        { status: 400, headers: HEADERS }
      );
    }

    // 2. Build Query
    let query = db.collection('articles')
      .where('category', '==', hindiCategory)
      .where('status', '==', 'published')
      .orderBy('createdAt', 'desc')
      .limit(limitParams);

    // 3. Apply Pagination (startAfter)
    if (lastCreatedAt) {
      const dateCursor = new Date(lastCreatedAt);
      if (!isNaN(dateCursor.getTime())) {
        query = query.startAfter(dateCursor);
      }
    }

    // 4. Execute Query
    const snapshot = await query.get();

    // 5. Get Host Protocol (for URLs)
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = `${protocol}://${host}`;

    // 6. Transform Data
    const articles = snapshot.docs.map(doc => {
      const data = doc.data();
      const cleanText = data.content
        ? data.content.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim()
        : '';
      const summary = cleanText.split(' ').slice(0, 25).join(' ') + (cleanText ? '...' : '');

      return {
        id: doc.id,
        headline: data.headline || 'No Title',
        imageUrl: data.imageUrl || '',
        shareCardUrl: data.shareCardUrl || data.imageUrl || '',
        summary: summary,
        url: `${baseUrl}/article/${doc.id}`,
        category: data.category,
        categoryKey: REVERSE_MAP[data.category] || 'other',
        publishedAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(), // Important for next cursor
      };
    });

    console.log(`[API/Articles] Fetched ${articles.length} for "${hindiCategory}" (After: ${lastCreatedAt || 'Start'})`);

    return NextResponse.json({
      articles,
      hasMore: articles.length === limitParams, // Simple heuristic
      nextCursor: articles.length > 0 ? articles[articles.length - 1].createdAt : null
    }, { headers: HEADERS });

  } catch (error) {
    console.error('[API/Articles] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500, headers: HEADERS }
    );
  }
}
