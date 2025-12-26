import { db } from '@/lib/firebase';
import ArticleCard from '@/app/components/ArticleCard';
import Link from 'next/link';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const categoryMapping = {
  'politics': 'राजनीति',
  'entertainment': 'मनोरंजन',
  'technology': 'तकनीक',
  'business': 'व्यापार',
  'sports': 'खेल',
  'education': 'शिक्षा',
  'science': 'विज्ञान',
  'startups': 'स्टार्टअप',
  'health': 'स्वास्थ्य'
};

async function getCategoryArticles(slug) {
  const hindiCategory = categoryMapping[slug];
  
  if (!hindiCategory) return [];

  try {
    const snapshot = await db.collection('articles')
      .where('category', '==', hindiCategory)
      .where('status', '==', 'published')
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : new Date(data.createdAt).toISOString()) : null,
        publishedAt: data.publishedAt ? (data.publishedAt.toDate ? data.publishedAt.toDate().toISOString() : new Date(data.publishedAt).toISOString()) : null,
      };
    });
  } catch (error) {
    console.error('Error fetching category articles:', error);
    return [];
  }
}

export default async function CategoryPage({ params }) {
  const { slug } = await params;
  const articles = await getCategoryArticles(slug);
  const hindiName = categoryMapping[slug] || slug;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="sticky top-0 z-10 bg-[#0a0a0a]/80 backdrop-blur-sm border-b border-neutral-800 p-4">
        <div className="max-w-7xl mx-auto flex items-center">
            <Link href="/categories" className="text-neutral-400 hover:text-white mr-4">
                ← Back
            </Link>
            <h1 className="text-2xl font-bold capitalize text-primary">{hindiName} News</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {articles.length === 0 ? (
          <div className="text-center py-20 bg-neutral-900 rounded-lg border border-neutral-800">
            <p className="text-xl text-gray-400">इस श्रेणी में अभी कोई समाचार उपलब्ध नहीं है।</p>
            <p className="text-sm text-gray-600 mt-2">जल्द ही अपडेट होगा!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article, index) => (
              <ArticleCard 
                key={article.id} 
                article={article} 
                index={index} 
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const hindiName = categoryMapping[slug] || slug;
  return {
    title: `${hindiName} News - DailyDhandora`,
    description: `Latest news and updates from ${hindiName} category.`,
  };
}
