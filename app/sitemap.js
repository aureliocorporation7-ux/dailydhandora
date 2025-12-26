const { db } = require('../lib/firebase');

export default async function sitemap() {
  if (!db) {
    console.error("Sitemap generation failed: Firestore not initialized.");
    return [{
      url: 'https://dailydhandora.vercel.app',
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1,
    }];
  }
  
  try {
    const snapshot = await db
      .collection('articles')
      .where('status', '==', 'published') // Only published articles
      .orderBy('createdAt', 'desc')
      .limit(500)
      .get();

    const articles = snapshot.docs.map(doc => ({
      url: `https://dailydhandora.vercel.app/article/${doc.id}`, // Correct URL pattern
      lastModified: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    }));

    return [
      {
        url: 'https://dailydhandora.vercel.app',
        lastModified: new Date(),
        changeFrequency: 'hourly',
        priority: 1,
      },
      ...articles,
    ];
  } catch (error) {
    console.error('Sitemap generation error:', error);
    // Return basic sitemap on error to avoid build failure
    return [
      {
        url: 'https://dailydhandora.vercel.app',
        lastModified: new Date(),
        changeFrequency: 'hourly',
        priority: 1,
      },
    ];
  }
}

