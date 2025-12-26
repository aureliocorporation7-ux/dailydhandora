import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

// GET: List articles (filtered by status)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status'); // 'draft' or 'published'

  try {
    let query = db.collection('articles').orderBy('createdAt', 'desc').limit(50);
    
    // Only apply status filter if provided
    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.get();
    const articles = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            // Safely convert Timestamp to ISO string
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()
        };
    });

    return NextResponse.json({ articles });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create a new article
export async function POST(request) {
  try {
    const body = await request.json();
    const { headline, content, imageUrl, category, status } = body;

    if (!headline || !content) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newArticle = {
        headline,
        content,
        imageUrl: imageUrl || 'https://placehold.co/600x400/000000/FFFFFF/png?text=DailyDhandora',
        category: category || 'Other',
        status: status || 'published',
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: status === 'published' ? new Date() : null,
        author: 'Admin (Manual)', // Mark as manually created
        views: 0,
        sourceUrl: 'https://dailydhandora.com' // Internal source
    };

    const docRef = await db.collection('articles').add(newArticle);
    return NextResponse.json({ success: true, id: docRef.id });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Update or Publish an article
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, action } = body;
    
    if (action === 'publish') {
      await db.collection('articles').doc(id).update({ 
        status: 'published',
        publishedAt: new Date()
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'update') {
        const { headline, content, imageUrl, category } = body;
        await db.collection('articles').doc(id).update({
            headline,
            content,
            imageUrl,
            category,
            updatedAt: new Date()
        });
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Delete an article
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await db.collection('articles').doc(id).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
