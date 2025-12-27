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
    // 1. Get Host and Protocol dynamically
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = `${protocol}://${host}`;

    // 2. Fetch top 5 published articles
    const snapshot = await db.collection('articles')
      .where('status', '==', 'published')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    // 3. Transform the data
    const news = snapshot.docs.map(doc => {
      const data = doc.data();
      
      // Extract summary from HTML content: Strip tags and take first 20 words
      const cleanText = data.content 
        ? data.content.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim() 
        : '';
      const summary = cleanText.split(' ').slice(0, 20).join(' ') + (cleanText ? '...' : '');

      return {
        title: data.headline || 'No Title',
        summary: summary,
        link: `${baseUrl}/article/${doc.id}`,
        imageUrl: data.imageUrl || '',
        publishedAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      };
    });

    // 3. Return JSON response
    return NextResponse.json(news, { headers: HEADERS });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500, headers: HEADERS }
    );
  }
}
