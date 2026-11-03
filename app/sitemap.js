const { db } = require('../lib/firebase');

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function sitemap() {
  // Dynamic base URL - works on any domain (Render, Vercel, custom)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    'https://dailydhandora.in';

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

    const staticPages = [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: 'hourly',
        priority: 1.0,
      },
      {
        url: `${baseUrl}/mandi-bhav`,
        lastModified: new Date(),
        changeFrequency: 'hourly',
        priority: 0.9,
      },
      {
        url: `${baseUrl}/category/nagaur-news`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.85,
      },
      {
        url: `${baseUrl}/category/mandi-bhav`,
        lastModified: new Date(),
        changeFrequency: 'hourly',
        priority: 0.85,
      },
      {
        url: `${baseUrl}/category/schemes`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.8,
      },
      {
        url: `${baseUrl}/category/education-dept`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.8,
      },
      {
        url: `${baseUrl}/category/bharti-result`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.8,
      },
      {
        url: `${baseUrl}/categories`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      },
      {
        url: `${baseUrl}/about`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.6,
      },
      {
        url: `${baseUrl}/contact`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.6,
      },
      {
        url: `${baseUrl}/privacy`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.4,
      },
      {
        url: `${baseUrl}/terms`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.4,
      },
    ];

    return [
      ...staticPages,
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
