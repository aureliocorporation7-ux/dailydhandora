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

const categorySeoData = {
  'nagaur-news': {
    title: 'नागौर न्यूज़ टुडे - आज की ताज़ा ख़बरें और लाइव अपडेट',
    description: 'नागौर जिले की हर ताज़ा ख़बर, ब्रेकिंग न्यूज़, स्थानीय घटनाएं, मौसम और विकास कार्य सबसे पहले पढ़ें DailyDhandora पर।',
    keywords: ['नागौर न्यूज़', 'नागौर समाचार', 'nagaur news today', 'nagaur breaking news', 'nagaur hindi news'],
  },
  'mandi-bhav': {
    title: 'नागौर मंडी भाव - आज के ताज़ा भाव जीरा, इसबगोल, ग्वार, मूंग',
    description: 'नागौर और मेड़ता कृषि उपज मंडी के आज के ताज़ा भाव। जीरा, ग्वार, मूंग, इसबगोल, सौंफ, चना और सरसों की दैनिक आवक और नीलामी दरें देखें।',
    keywords: ['नागौर मंडी भाव', 'nagaur mandi bhav', 'merta mandi bhav', 'जीरा भाव आज', 'ग्वार भाव', 'मूंग भाव'],
  },
  'schemes': {
    title: 'राजस्थान सरकारी योजना - नई योजनाएं, पात्रता व आवेदन',
    description: 'राजस्थान सरकार और केंद्र सरकार की सभी जन कल्याणकारी योजनाओं की ताज़ा जानकारी, पात्रता नियम, ज़रूरी दस्तावेज़ और आवेदन प्रक्रिया हिंदी में।',
    keywords: ['राजस्थान सरकारी योजना', 'rajasthan sarkari yojana', 'yojana update', 'rajasthan government schemes'],
  },
  'education-dept': {
    title: 'शिक्षा विभाग राजस्थान - शाला दर्पण, ट्रांसफर व आदेश',
    description: 'राजस्थान शिक्षा विभाग, प्राथमिक व माध्यमिक शिक्षा निदेशालय बीकानेर, शाला दर्पण पोर्टल, शिक्षक तबादले और परीक्षा दिशा-निर्देशों की ताज़ा खबरें।',
    keywords: ['शिक्षा विभाग राजस्थान', 'shiksha vibhag news', 'shala darpan', 'rajasthan education news'],
  },
  'bharti-result': {
    title: 'भर्ती व रिजल्ट - राजस्थान नई नौकरियां, एडमिट कार्ड व कटऑफ',
    description: 'RSMSSB, RPSC, REET, पुलिस और अन्य सरकारी भर्तियों के नोटिफिकेशन, परीक्षा तिथि, प्रवेश पत्र, आंसर की और परीक्षा परिणाम की तुरंत जानकारी।',
    keywords: ['राजस्थान भर्ती', 'rajasthan bharti result', 'sarkari result rajasthan', 'rpsc news', 'rsmssb news'],
  },
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
  const seoInfo = categorySeoData[slug] || {
    title: `${hindiName} समाचार`,
    description: `${hindiName} से जुड़ी सभी ताज़ा ख़बरें और अपडेट्स DailyDhandora पर पढ़ें।`,
    keywords: [hindiName, 'DailyDhandora'],
  };

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://dailydhandora.in';

  // 🔍 SEO: CollectionPage + BreadcrumbList Schema
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: seoInfo.title,
    description: seoInfo.description,
    url: `${baseUrl}/category/${slug}`,
    inLanguage: 'hi-IN',
    publisher: {
      '@type': 'Organization',
      name: 'DailyDhandora',
      url: baseUrl,
      logo: `${baseUrl}/logo-512.webp`,
    },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: articles.slice(0, 10).map((art, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        url: `${baseUrl}/article/${art.id}`,
        name: art.headline,
      })),
    },
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'होम',
        item: baseUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'श्रेणियां',
        item: `${baseUrl}/categories`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: hindiName,
        item: `${baseUrl}/category/${slug}`,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* 🔍 SEO: Schemas */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <header className="sticky top-0 z-10 bg-[#0a0a0a]/80 backdrop-blur-sm border-b border-neutral-800 p-4">
        <div className="max-w-7xl mx-auto flex items-center">
          <Link href="/" className="text-neutral-400 hover:text-white mr-4">
            ← होम पर जाएं
          </Link>
          <h1 className="text-2xl font-bold text-primary">{hindiName}</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Semantic H2 to fix heading level hierarchy (h1 -> h2 -> h3 cards) */}
        <div className="mb-6">
          <h2 className="text-lg text-gray-300 font-medium">
            {seoInfo.description}
          </h2>
        </div>

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
  const seoInfo = categorySeoData[slug] || {
    title: `${hindiName} समाचार`,
    description: `${hindiName} से जुड़ी सभी ताज़ा ख़बरें और अपडेट्स DailyDhandora पर पढ़ें।`,
    keywords: [hindiName],
  };

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://dailydhandora.in';

  return {
    title: `${seoInfo.title} | DailyDhandora`,
    description: seoInfo.description,
    keywords: seoInfo.keywords,
    openGraph: {
      title: `${seoInfo.title} | DailyDhandora`,
      description: seoInfo.description,
      url: `${baseUrl}/category/${slug}`,
      siteName: 'DailyDhandora',
      locale: 'hi_IN',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${seoInfo.title} | DailyDhandora`,
      description: seoInfo.description,
    },
    alternates: {
      canonical: `${baseUrl}/category/${slug}`,
      languages: {
        'hi-IN': `${baseUrl}/category/${slug}`,
      },
    },
  };
}
