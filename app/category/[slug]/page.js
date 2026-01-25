import ArticleGrid from '@/app/components/ArticleGrid';
import Link from 'next/link';
import { headers } from 'next/headers';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const categoryMapping = {
  'schemes': 'सरकारी योजना',
  'mandi-bhav': 'मंडी भाव',
  'nagaur-news': 'नागौर न्यूज़',
  'bharti-result': 'भर्ती व रिजल्ट',
  'education-dept': 'शिक्षा विभाग'
};

// Reverse mapping for API (slug -> API category key)
const apiCategoryMap = {
  'schemes': 'schemes',
  'mandi-bhav': 'mandi',
  'nagaur-news': 'news',
  'bharti-result': 'jobs',
  'education-dept': 'education'
};

async function getCategoryArticles(slug) {
  const hindiCategory = categoryMapping[slug];
  const apiCategory = apiCategoryMap[slug];

  console.log(`[Category Page] Slug: "${slug}", Hindi: "${hindiCategory}", API Key: "${apiCategory}"`);

  if (!hindiCategory || !apiCategory) {
    console.log('[Category Page] ❌ No mapping found for slug');
    return [];
  }

  try {
    // Get host from headers for internal API call
    const headersList = await headers();
    const host = headersList.get('host') || 'localhost:3000';
    const protocol = headersList.get('x-forwarded-proto') || 'http';

    const apiUrl = `${protocol}://${host}/api/latest-news?category=${apiCategory}&perCategory=20`;
    console.log(`[Category Page] Fetching from API: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      console.error(`[Category Page] ❌ API returned ${response.status}`);
      return [];
    }

    const articles = await response.json();
    console.log(`[Category Page] ✅ API returned ${articles.length} articles`);

    // Transform API response to match expected format
    return articles.map(article => ({
      id: article.url?.split('/').pop() || article.id,
      headline: article.headline,
      imageUrl: article.imageUrl,
      shareCardUrl: article.shareCardUrl,
      category: article.category,
      createdAt: article.publishedAt,
      publishedAt: article.publishedAt,
    }));

  } catch (error) {
    console.error('[Category Page] ❌ Error fetching from API:', error.message);
    return [];
  }
}

export default async function CategoryPage({ params }) {
  const { slug } = await params;
  const articles = await getCategoryArticles(slug);
  const hindiName = categoryMapping[slug] || slug;
  const hindiCategory = categoryMapping[slug];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="sticky top-0 z-10 bg-[#0a0a0a]/80 backdrop-blur-sm border-b border-neutral-800 p-4">
        <div className="max-w-7xl mx-auto flex items-center">
          <Link href="/" className="text-neutral-400 hover:text-white mr-4">
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
          <ArticleGrid
            initialArticles={articles}
            hindiCategory={hindiCategory}
            apiCategory={apiCategoryMap[slug]}
          />
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
