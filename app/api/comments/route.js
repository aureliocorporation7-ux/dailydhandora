import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const articleId = searchParams.get('articleId');

  if (!articleId) {
    return NextResponse.json({ error: 'Article ID required' }, { status: 400 });
  }

  try {
    const snapshot = await db.collection('comments')
      .where('articleId', '==', articleId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const comments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate().toISOString() || new Date().toISOString()
    }));

    return NextResponse.json({ comments });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { articleId, content, username } = await request.json();

    if (!articleId || !content) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Basic spam filter: Length check
    if (content.length > 500) {
        return NextResponse.json({ error: 'Comment too long' }, { status: 400 });
    }

    const newComment = {
      articleId,
      content,
      username: username || 'Anonymous User',
      createdAt: new Date(),
      likes: 0
    };

    await db.collection('comments').add(newComment);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
