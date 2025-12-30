import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const lastCreatedAt = searchParams.get('lastCreatedAt');
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  if (!category) {
    return NextResponse.json({ error: 'Category is required' }, { status: 400 });
  }

  try {
    let query = db.collection('articles')
      .where('category', '==', category)
      .where('status', '==', 'published')
      .orderBy('createdAt', 'desc')
      .limit(limit);

    if (lastCreatedAt) {
      const dateCursor = new Date(lastCreatedAt);
      query = query.startAfter(dateCursor);
    }

    const snapshot = await query.get();
    
    const articles = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date(data.createdAt).toISOString(),
        publishedAt: data.publishedAt?.toDate ? data.publishedAt.toDate().toISOString() : null,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : null,
      };
    });

    return NextResponse.json({ articles });
  } catch (error) {
    console.error('Error fetching articles:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
