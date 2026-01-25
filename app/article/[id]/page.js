import { notFound } from 'next/navigation';
import Link from 'next/link';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import Image from 'next/image';
import ArticleMeta from '@/app/components/ArticleMeta';
import AudioPlayer from '@/app/components/AudioPlayer';
import ArticleActions from '@/app/components/ArticleActions';
import ShareButtons from '@/app/components/ShareButtons';
import ViewTracker from '@/app/components/ViewTracker';

export const revalidate = 3600; // Revalidate every hour

function getFirebaseAdmin() {
  if (getApps().length === 0) {
    let serviceAccount;
    if (process.env.FIREBASE_SERVICE_KEY_BASE64) {
      const decoded = Buffer.from(
        process.env.FIREBASE_SERVICE_KEY_BASE64,
        'base64'
      ).toString('utf8');
      serviceAccount = JSON.parse(decoded);
    } else {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_KEY);
    }
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getFirestore();
}

async function getArticle(id) {
  try {
    const db = getFirebaseAdmin();
    const doc = await db.collection('articles').doc(id).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      publishedAt: data.publishedAt?.toDate?.()?.toISOString() || null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
      audioGeneratedAt: data.audioGeneratedAt?.toDate?.()?.toISOString() || null,
    };
  } catch (error) {
    console.error('Error fetching article:', error);
    return null;
  }
}

async function getRelatedArticles(category, currentId) {
  if (!category) return [];
  try {
    const db = getFirebaseAdmin();
    const snapshot = await db.collection('articles')
      .where('category', '==', category)
      .where('status', '==', 'published')
      .orderBy('createdAt', 'desc')
      .limit(4)
      .get();

    const articles = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      }))
      .filter(a => a.id !== currentId)
      .slice(0, 3);

    return articles;
  } catch (error) {
    console.error('Error fetching related articles:', error);
    return [];
  }
}

const POSTER_CATEGORIES = ['मंडी भाव', 'शिक्षा विभाग', 'भर्ती व रिजल्ट', 'Mandi Bhav', 'Education', 'सरकारी योजना'];

export default async function ArticlePage({ params }) {
  const { id } = await params;
  const article = await getArticle(id);

  if (!article) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">लेख नहीं मिला</h1>
          <p className="text-gray-400">यह लेख उपलब्ध नहीं है।</p>
          <a href="/" className="mt-4 inline-block text-blue-500 hover:underline">
            होम पर वापस जाएं
          </a>
        </div>
      </div>
    );
  }

  const relatedArticles = await getRelatedArticles(article.category, article.id);
  const isPosterMode = POSTER_CATEGORIES.includes(article.category);

  // Dynamic base URL
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://dailydhandora.onrender.com';

  // 🔍 SEO: Enhanced NewsArticle Schema (Google Rich Results)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${baseUrl}/article/${article.id}`
    },
    headline: article.headline,
    description: article.summary || article.headline?.substring(0, 160),
    image: {
      '@type': 'ImageObject',
      url: article.imageUrl,
      width: 1200,
      height: 675
    },
    datePublished: article.createdAt,
    dateModified: article.updatedAt || article.createdAt,
    author: {
      '@type': 'Person',
      name: 'Abhishek',
      url: `${baseUrl}/about`
    },
    publisher: {
      '@type': 'Organization',
      name: 'DailyDhandora',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.png`,
        width: 512,
        height: 512
      }
    },
    articleSection: article.category,
    keywords: article.tags?.join(', ') || article.category,
    inLanguage: 'hi-IN',
    isAccessibleForFree: true
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" suppressHydrationWarning>
      {/* Inject Schema for Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="max-w-4xl mx-auto px-4 py-12">
        <ViewTracker id={article.id} />

        {/* 🎨 CONDITIONAL LAYOUT LOGIC */}
        {isPosterMode ? (
          // Option A: CLEAN LAYOUT (For Posters)
          <div className="mb-8">
            {/* Image Block - Fluid Visibility */}
            <div className="w-full mb-6 rounded-lg overflow-hidden shadow-2xl border border-neutral-800 bg-neutral-900/50">
              <Image
                src={article.imageUrl}
                alt={article.headline || 'Article image'}
                width={1200}
                height={675}
                style={{ width: '100%', height: 'auto', display: 'block' }}
                className="rounded-lg"
                priority
              />
            </div>
            {/* Text Block - Below Image */}
            <div className="px-2">
              <span className="bg-primary/20 text-primary text-sm font-bold px-3 py-1 rounded-full mb-4 inline-block border border-primary/30">
                {article.category}
              </span>
              <h1 className="text-3xl md:text-5xl font-bold leading-tight text-white mb-2">{article.headline}</h1>
              <p className="text-gray-400 text-sm mt-2">Posted on {new Date(article.createdAt).toLocaleDateString('hi-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
        ) : (
          // Option B: HERO LAYOUT (For Standard News)
          <div className="relative w-full h-96 mb-8 rounded-lg overflow-hidden shadow-2xl border border-neutral-800 group">
            <Image
              src={article.imageUrl}
              alt={article.headline || 'Article image'}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
            <div className="absolute bottom-6 left-6 right-6">
              <span className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full mb-3 inline-block shadow-md">
                {article.category}
              </span>
              <h1 className="text-3xl md:text-4xl font-bold leading-tight drop-shadow-lg text-white">{article.headline}</h1>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center gap-4 mb-8 bg-neutral-900/50 p-4 rounded-xl border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-neutral-800 rounded-full flex items-center justify-center border border-white/10">
              <span className="text-xl">🎙️</span>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Listen News</p>
              <p className="text-sm font-bold text-white">Audio Summary</p>
            </div>
          </div>
          <AudioPlayer text={article.content} audioUrl={article.audioUrl} />
        </div>

        <ArticleMeta category={article.category} createdAt={article.createdAt} />

        <div className="prose prose-invert max-w-none prose-lg prose-headings:text-primary prose-a:text-blue-400 hover:prose-a:text-blue-300">
          <div dangerouslySetInnerHTML={{ __html: article.content }} />
        </div>

        {/* 📲 SHARE SECTION - Prominent placement for viral sharing */}
        <div className="mt-8 p-6 bg-gradient-to-r from-neutral-900 to-neutral-800 border border-neutral-700 rounded-2xl shadow-xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <p className="text-lg font-bold text-white">📲 खबर पसंद आई?</p>
              <p className="text-sm text-gray-400">अपने दोस्तों के साथ शेयर करें!</p>
            </div>
            <ShareButtons article={article} />
          </div>
        </div>

        <div className="flex justify-end mt-8 pt-6 border-t border-neutral-800">
          <ArticleActions articleId={article.id} />
        </div>

        <div className="mt-12 p-6 bg-neutral-900/50 border border-neutral-800 rounded-xl flex items-start gap-4 shadow-lg">
          <div className="w-14 h-14 bg-neutral-800 rounded-full flex items-center justify-center flex-shrink-0 border border-white/10 overflow-hidden shadow-inner">
            <img
              src="/logo.png"
              alt="DailyDhandora Official"
              className="w-full h-full object-contain p-1"
            />
          </div>
          <div className="flex-1">
            <p className="text-[10px] text-primary uppercase tracking-widest font-bold mb-1">Written & Verified By</p>
            <h3 className="text-lg font-bold text-white flex items-center gap-1">
              Abhishek
              <svg className="w-4 h-4 text-blue-500 fill-current" viewBox="0 0 24 24">
                <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .495.083.965.238 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
              </svg>
              <span className="bg-blue-500/10 text-blue-400 text-[10px] px-1.5 py-0.5 rounded border border-blue-500/20 ml-2">Chief Editor</span>
            </h3>
            <p className="text-sm text-gray-400 mt-2 leading-relaxed">
              नागौर के युवा पत्रकार और डिजिटल मीडिया विशेषज्ञ। अभिषेक जी को ग्रामीण विकास और स्थानीय समस्याओं के सटीक विश्लेषण का गहरा अनुभव है।
            </p>
          </div>
        </div>

        {relatedArticles.length > 0 && (
          <div className="mt-16 pt-10 border-t border-neutral-800">
            <h3 className="text-2xl font-bold text-white mb-6 border-l-4 border-primary pl-3">
              संबंधित समाचार (Related News)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedArticles.map((rel) => (
                <Link key={rel.id} href={`/article/${rel.id}`} className="group block bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden hover:border-primary transition-all">
                  <div className="relative h-40 w-full">
                    <Image
                      src={rel.imageUrl || '/placeholder.png'}
                      alt={rel.headline}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-4">
                    <h4 className="text-sm font-bold text-white line-clamp-2 group-hover:text-primary transition-colors">
                      {rel.headline}
                    </h4>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(rel.createdAt).toLocaleDateString('hi-IN')}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

      </article>
    </div>
  );
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const article = await getArticle(id);

  if (!article) {
    return {
      title: 'लेख नहीं मिला - DailyDhandora',
    };
  }

  return {
    title: `${article.headline} - DailyDhandora`,
    description: article.summary || article.headline,
  };
}
