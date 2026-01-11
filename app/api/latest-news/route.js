import { db } from '@/lib/firebase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Ensure this endpoint is not statically cached at build time

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 's-maxage=60, stale-while-revalidate=30',
};

// Category Mapping (English -> Hindi DB Fields)
// Order: Mandi, News, Education, Schemes, Jobs
const CATEGORY_MAP = {
  'mandi': 'मंडी भाव',
  'news': 'नागौर न्यूज़',
  'education': 'शिक्षा विभाग',
  'schemes': 'सरकारी योजना',
  'jobs': 'भर्ती व रिजल्ट'
};

// Reverse mapping (Hindi -> English key)
const REVERSE_MAP = Object.fromEntries(
  Object.entries(CATEGORY_MAP).map(([k, v]) => [v, k])
);

export async function OPTIONS() {
  return NextResponse.json({}, { headers: HEADERS });
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryParam = searchParams.get('category');
    const perCategoryLimit = parseInt(searchParams.get('perCategory') || '2'); // Default: 2 news per category
    const fetchLimit = 10; // Fetch 10 per category internally, return perCategoryLimit

    // 1. Get Host and Protocol dynamically
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = `${protocol}://${host}`;

    // Helper to transform doc to news object
    const transformDoc = (doc) => {
      const data = doc.data();
      const cleanText = data.content
        ? data.content.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim()
        : '';
      const summary = cleanText.split(' ').slice(0, 25).join(' ') + (cleanText ? '...' : '');

      return {
        headline: data.headline || 'No Title',
        imageUrl: data.imageUrl || '',
        shareCardUrl: data.shareCardUrl || data.imageUrl || '',
        summary: summary,
        url: `${baseUrl}/article/${doc.id}`,
        category: data.category,
        categoryKey: REVERSE_MAP[data.category] || 'other',
        publishedAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      };
    };

    // Helper to fetch articles for a specific category
    const fetchCategory = async (hindiCategory, categoryKey) => {
      try {
        let snapshot;

        if (categoryKey === 'news') {
          // STANDARD QUERY: Now that DB is standardized, we search for the exact category.
          snapshot = await db.collection('articles')
            .where('category', '==', 'नागौर न्यूज़')
            .where('status', '==', 'published')
            .orderBy('createdAt', 'desc')
            .limit(fetchLimit)
            .get();

          console.log(`[API] ✅ Query 'Nagaur News': Found ${snapshot.size} docs.`);

        } else {
          // Standard Query for single-variation categories
          snapshot = await db.collection('articles')
            .where('category', '==', hindiCategory)
            .where('status', '==', 'published')
            .orderBy('createdAt', 'desc')
            .limit(fetchLimit)
            .get();
        }

        if (!snapshot.empty) {
          return snapshot.docs.map(transformDoc);
        }

        console.log(`[API] ⚠️ No articles found for "${hindiCategory}"`);
        return [];
      } catch (err) {
        console.error(`[API] Error fetching "${hindiCategory}":`, err.message);
        return [];
      }
    };

    // 2. If specific category requested, fetch only that
    if (categoryParam && CATEGORY_MAP[categoryParam]) {
      const articles = await fetchCategory(CATEGORY_MAP[categoryParam], categoryParam);
      return NextResponse.json(articles.slice(0, perCategoryLimit), { headers: HEADERS });
    }

    // 3. Fetch from ALL categories in PARALLEL (5 queries)
    console.log(`[API] Fetching ${fetchLimit} articles from each of 5 categories...`);

    const categoryKeys = Object.keys(CATEGORY_MAP);
    const categoryPromises = categoryKeys.map(async (key) => {
      const hindiCategory = CATEGORY_MAP[key];
      const articles = await fetchCategory(hindiCategory, key);
      return {
        key,
        hindiCategory,
        articles,
        count: articles.length
      };
    });

    const results = await Promise.all(categoryPromises);

    // 4. Build final response - 2 latest from each category
    const allNews = [];
    const categoryStats = [];

    for (const result of results) {
      const { key, hindiCategory, articles, count } = result;

      // Take only perCategoryLimit (default 2) from each
      const selected = articles.slice(0, perCategoryLimit);
      allNews.push(...selected);

      categoryStats.push({
        key,
        category: hindiCategory,
        fetched: count,
        returned: selected.length
      });

      console.log(`[API] ✅ ${key}: ${count} fetched, ${selected.length} returned`);
    }

    // Debug mode
    const debugMode = searchParams.get('debug') === 'true';
    if (debugMode) {
      return NextResponse.json({
        debug: true,
        perCategoryLimit,
        fetchLimit,
        categories: categoryStats,
        totalReturned: allNews.length,
        news: allNews
      }, { headers: HEADERS });
    }

    return NextResponse.json(allNews, { headers: HEADERS });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500, headers: HEADERS }
    );
  }
}
