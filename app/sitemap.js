const { db } = require('../lib/firebase');

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function sitemap() {
  // Dynamic base URL - works on any domain (Render, Vercel, custom)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    'https://dailydhandora.onrender.com';

  if (!db) {
    console.error("Sitemap generation failed: Firestore not initialized.");
    return [{
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1,
    }];
  }

  try {
    const snapshot = await db
      .collection('articles')
      .where('status', '==', 'published')
      .orderBy('createdAt', 'desc')
      .limit(500)
      .get();

    const articles = snapshot.docs.map(doc => ({
      url: `${baseUrl}/article/${doc.id}`,
      lastModified: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    }));

    return [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: 'hourly',
        priority: 1,
      },
      ...articles,
    ];
  } catch (error) {
    console.error('Sitemap generation error:', error);
    return [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: 'hourly',
        priority: 1,
      },
    ];
  }
}
