import { db } from '@/lib/firebase';
import ArticleCard from './components/ArticleCard';
import NotificationBell from './components/NotificationBell';

export const revalidate = 60; // Revalidate every 60 seconds

async function getArticles() {
  try {
    const snapshot = await db.collection('articles').orderBy('createdAt', 'desc').limit(20).get({ next: { tags: ['collection'] } });
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}

export default async function Home() {
  const articles = await getArticles();
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" suppressHydrationWarning={true}>
      <header className="sticky top-0 z-50 bg-[#0a0a0a] border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">DailyDhandora</h1>
          <NotificationBell />
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">ताज़ा समाचार</h2>
        {articles.length === 0 ? (
          <p className="text-gray-400 text-center py-12">अभी कोई समाचार उपलब्ध नहीं है।</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {articles.map((article, index) => (
              <div key={article.id} className={index === 0 ? 'col-span-2' : ''}>
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
