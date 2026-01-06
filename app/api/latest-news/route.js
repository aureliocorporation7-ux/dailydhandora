import { db } from '@/lib/firebase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Ensure this endpoint is not statically cached at build time

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 's-maxage=60, stale-while-revalidate=30',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: HEADERS });
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryParam = searchParams.get('category');
    const limitParam = parseInt(searchParams.get('limit') || '5');

    // Category Mapping (English -> Hindi DB Fields)
    const CATEGORY_MAP = {
      'education': 'शिक्षा विभाग',
      'mandi': 'मंडी भाव',
      'news': 'नागौर न्यूज़',
      'schemes': 'सरकारी योजना',
      'jobs': 'भर्ती व रिजल्ट'
    };

    // 1. Get Host and Protocol dynamically
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = `${protocol}://${host}`;

    // 2. Build Query
    let query = db.collection('articles').where('status', '==', 'published');

    if (categoryParam && CATEGORY_MAP[categoryParam]) {
        query = query.where('category', '==', CATEGORY_MAP[categoryParam]);
    }

    // 3. Execute Query
    const snapshot = await query
      .orderBy('createdAt', 'desc')
      .limit(limitParam)
      .get();

    // 4. Transform the data
    const news = snapshot.docs.map(doc => {
      const data = doc.data();
      
      // Extract summary
      const cleanText = data.content 
        ? data.content.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim() 
        : '';
      const summary = cleanText.split(' ').slice(0, 25).join(' ') + (cleanText ? '...' : '');

      return {
        headline: data.headline || 'No Title', // mapped as requested
        imageUrl: data.imageUrl || '',
        shareCardUrl: data.shareCardUrl || data.imageUrl || '',
        summary: summary,
        url: `${baseUrl}/article/${doc.id}`, // mapped as requested
        category: data.category, // helpful for debugging
        publishedAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      };
    });

    return NextResponse.json(news, { headers: HEADERS });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500, headers: HEADERS }
    );
  }
}
