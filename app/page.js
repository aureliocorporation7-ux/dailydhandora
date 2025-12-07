import { db } from '../lib/firebase';
import Link from 'next/link';
import Image from 'next/image';
import ArticleCard from './components/ArticleCard';
import NotificationBell from './components/NotificationBell';

// Server-side function to get articles
async function getArticles() {
  try {
    const articlesRef = db.collection('articles');
    const snapshot = await articlesRef
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    if (snapshot.empty) {
      console.log('No articles found in Firestore');
      return [];
    }

    const articles = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      articles.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      });
    });

    return articles;
  } catch (error) {
    console.error('Error fetching articles:', error);
    // Return empty array instead of throwing to allow page to render
    return [];
  }
}

export default async function Home() {
  const articles = await getArticles();

  // Helper to get time ago in Hindi
  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'अभी-अभी';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} मिनट पहले`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} घंटे पहले`;
    return `${Math.floor(diffInSeconds / 86400)} दिन पहले`;
  };

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Top App Bar */}
      <header className="sticky top-0 z-10 flex items-center bg-neutral-950/80 backdrop-blur-sm p-4 justify-between border-b border-neutral-800">
        <h1 className="text-white text-xl font-headings font-bold leading-tight tracking-tight">
          DailyDhandora
        </h1>
        <NotificationBell />
      </header>

      <main className="p-4">
        {articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-6xl mb-4">📰</div>
            <h2 className="text-2xl font-bold text-white mb-2">कोई समाचार नहीं मिला</h2>
            <p className="text-gray-400">जल्द ही यहाँ लेख प्रकाशित होंगे</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {/* Hero Card - Latest Article */}
            {articles && articles.length > 0 && (
              <Link
                href={`/article/${articles[0].id}`}
                className="col-span-2 flex flex-col items-stretch justify-start rounded-lg bg-neutral-900 border border-neutral-800 overflow-hidden hover:border-primary/50 transition-colors"
              >
                <div className="w-full relative aspect-video bg-neutral-800">
                  {articles[0].imageUrl ? (
                    <Image
                      src={articles[0].imageUrl}
                      alt={articles[0].title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 768px"
                      priority
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600 text-6xl">
                      📰
                    </div>
                  )}
                </div>
                <div className="flex w-full flex-col items-stretch justify-center gap-2 p-4">
                  <h2 className="text-white text-xl font-headings font-bold leading-tight line-clamp-3">
                    {articles[0].title}
                  </h2>
                  <p className="text-gray-400 text-sm font-primary font-normal leading-normal line-clamp-2">
                    {articles[0].summary || articles[0].content?.substring(0, 150)}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-gray-500 text-xs" suppressHydrationWarning>{getTimeAgo(articles[0].createdAt)}</span>
                    <button className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-9 px-5 bg-primary text-white text-sm font-bold leading-normal hover:bg-primary/90 transition-colors">
                      <span className="truncate">और पढ़ें</span>
                    </button>
                  </div>
                </div>
              </Link>
            )}

            {/* Standard Cards - Remaining Articles */}
            {articles.slice(1).map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}