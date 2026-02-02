import { db } from '@/lib/firebase';
import ArticleCard from './components/ArticleCard';
import TrendingSection from './components/TrendingSection';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getArticles() {
  try {
    const snapshot = await db.collection('articles')
      .where('status', '==', 'published')
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const newsData = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : new Date(data.createdAt).toISOString()) : null,
        publishedAt: data.publishedAt ? (data.publishedAt.toDate ? data.publishedAt.toDate().toISOString() : new Date(data.publishedAt).toISOString()) : null,
        updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate().toISOString() : new Date(data.updatedAt).toISOString()) : null,
        audioGeneratedAt: data.audioGeneratedAt ? (data.audioGeneratedAt.toDate ? data.audioGeneratedAt.toDate().toISOString() : new Date(data.audioGeneratedAt).toISOString()) : null,
      };
    });

    console.log(`✅ Homepage fetched ${newsData.length} articles.`);
    return newsData;
  } catch (error) {
    console.error('Error fetching articles:', error);
    return [];
  }
}

async function getPublicSettings() {
  try {
    const doc = await db.collection('settings').doc('global').get();
    return {
      showViewCounts: doc.exists ? (doc.data().showViewCounts !== false) : true
    };
  } catch (error) {
    console.error('Error fetching settings:', error);
    return { showViewCounts: true }; // Default to showing views
  }
}

export default async function Home() {
  const [articles, settings] = await Promise.all([
    getArticles(),
    getPublicSettings()
  ]);

  return (
    <div className="bg-[#0a0a0a] text-white" suppressHydrationWarning={true}>
      <main className="max-w-7xl mx-auto px-4 py-8">

        {/* 🔥 Trending Section */}
        <TrendingSection articles={articles} showViewCounts={settings.showViewCounts} />

        {/* ताज़ा समाचार Grid */}
        <h2 className="text-2xl font-bold mb-6 text-primary border-l-4 border-primary pl-3">ताज़ा समाचार</h2>
        {articles.length === 0 ? (
          <p className="text-gray-400 text-center py-12">अभी कोई समाचार उपलब्ध नहीं है।</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {articles.map((article, index) => (
              <div key={article.id} className={index === 0 ? 'col-span-1 md:col-span-2' : ''}>
                <ArticleCard
                  article={article}
                  index={index}
                  isFeatured={index === 0}
                  priority={index === 0}
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}