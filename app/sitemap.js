import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function getFirebaseAdmin() {
  if (getApps().length === 0) {
    let serviceAccount;
    if (process.env.FIREBASE_SERVICE_KEY_BASE64) {
      const decoded = Buffer.from(process.env.FIREBASE_SERVICE_KEY_BASE64, 'base64').toString('utf8');
      serviceAccount = JSON.parse(decoded);
    } else {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_KEY);
    }
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getFirestore();
}

export default async function sitemap() {
  const db = getFirebaseAdmin();
  
  try {
    const snapshot = await db
      .collection('articles')
      .orderBy('createdAt', 'desc')
      .limit(500)
      .get();

    const articles = snapshot.docs.map(doc => ({
      url: 'https://dailydhandora.vercel.app/blog/' + doc.data().slug,
      lastModified: doc.data().createdAt?.toDate() || new Date(),
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
