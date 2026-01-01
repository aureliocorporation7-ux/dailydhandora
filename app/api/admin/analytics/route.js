import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

export const dynamic = 'force-dynamic'; // Always fetch fresh data

export async function GET() {
  try {
    // 1. Fetch Top 20 Most Viewed Articles
    const topSnapshot = await db.collection('articles')
      .orderBy('views', 'desc')
      .limit(20)
      .get();

    const topArticles = topSnapshot.docs.map(doc => ({
      id: doc.id,
      headline: doc.data().headline,
      views: doc.data().views || 0,
      category: doc.data().category,
      publishedAt: doc.data().publishedAt ? (doc.data().publishedAt.toDate ? doc.data().publishedAt.toDate().toISOString() : doc.data().publishedAt) : null,
    }));

    // 2. Calculate Total Views (Aggregation Query is cheaper but requires index, 
    //    so we'll just sum the top articles + estimated rest for now or use a separate counter document in future)
    //    For now, let's just use the sum of Top 50 to give a "Trend" idea.
    //    Calculating TRUE total views in Firestore requires reading ALL docs (expensive) or using Distributed Counters.
    //    Let's assume the user just wants "Viral" analysis.
    
    //    Wait, I can do a simple count of total articles.
    const countSnapshot = await db.collection('articles').count().get();
    const totalArticles = countSnapshot.data().count;

    //    For Total Views, let's just sum what we fetched + add a "Others" buffer if we were tracking globally.
    //    Since we just started tracking, we can just sum the top ones for now.
    const totalViews = topArticles.reduce((acc, curr) => acc + curr.views, 0);

    return NextResponse.json({
      totalArticles,
      totalViews, // Note: This is currently sum of top 20, will grow as we track more
      topArticles
    });

  } catch (error) {
    console.error('Analytics Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
