import { db } from '@/lib/firebase';
import Link from 'next/link';
import Image from 'next/image';
import ArticleCard from '../components/ArticleCard';

export const dynamic = 'force-dynamic';
export const revalidate = 120; // 2 minutes cache

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://dailydhandora.in';

export const metadata = {
  title: 'नागौर मंडी भाव आज का - जीरा, ग्वार, मूंग, इसबगोल के ताज़ा भाव | DailyDhandora',
  description: 'नागौर और मेड़ता कृषि उपज मंडी के आज के ताज़ा मंडी भाव। जीरा, मूंग, इसबगोल, ग्वार, सौंफ, चना और सरसों की दैनिक आवक, न्यूनतम व अधिकतम भाव देखें।',
  keywords: [
    'नागौर मंडी भाव',
    'nagaur mandi bhav',
    'nagaur mandi bhav today',
    'मेड़ता मंडी भाव',
    'merta mandi bhav',
    'जीरा का भाव आज',
    'ग्वार भाव नागौर',
    'मूंग भाव आज',
    'इसबगोल भाव मेड़ता',
    'rajasthan mandi bhav'
  ],
  alternates: {
    canonical: `${baseUrl}/mandi-bhav`,
    languages: {
      'hi-IN': `${baseUrl}/mandi-bhav`,
    },
  },
  openGraph: {
    title: 'नागौर मंडी भाव आज का - जीरा, ग्वार, मूंग के ताज़ा भाव | DailyDhandora',
    description: 'नागौर और मेड़ता कृषि उपज मंडी के आज के ताज़ा मंडी भाव। जीरा, मूंग, इसबगोल, ग्वार और सरसों के लाइव भाव।',
    url: `${baseUrl}/mandi-bhav`,
    siteName: 'DailyDhandora',
    locale: 'hi_IN',
    type: 'website',
    images: [{
      url: `${baseUrl}/logo-512.webp`,
      width: 512,
      height: 512,
      alt: 'नागौर मंडी भाव - DailyDhandora',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'नागौर मंडी भाव आज का | DailyDhandora',
    description: 'नागौर व मेड़ता मंडी के ताज़ा भाव जीरा, ग्वार, मूंग, इसबगोल।',
  },
};

async function getMandiArticles() {
  if (!db) return [];
  try {
    const snapshot = await db.collection('articles')
      .where('status', '==', 'published')
      .where('category', 'in', ['मंडी भाव', 'Mandi Bhav'])
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
      };
    });
  } catch (error) {
    console.error('Error fetching mandi articles:', error);
    return [];
  }
}

export default async function MandiBhavHub() {
  const articles = await getMandiArticles();

  // 🔍 SEO: FAQ Schema for Google AI Overviews & Rich Snippets
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'नागौर मंडी में आज जीरा का क्या भाव है?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'नागौर और मेड़ता कृषि उपज मंडी में जीरे के भाव गुणवत्ता के अनुसार प्रतिदिन बदलते हैं। आज के सटीक न्यूनतम, अधिकतम और मॉडल भाव ऊपर दी गई ताज़ा रिपोर्ट में देखें। DailyDhandora पर मंडी खुलते ही भाव अपडेट किए जाते हैं।'
        }
      },
      {
        '@type': 'Question',
        name: 'मेड़ता कृषि उपज मंडी में किन फसलों की प्रमुख आवक होती है?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'मेड़ता मंडी राजस्थान की प्रमुख मंडियों में से एक है जहां मुख्य रूप से मूंग, जीरा, इसबगोल, सौंफ, चना, ग्वार, रायड़ा (सरसों) और तारामीरा की भारी आवक होती है।'
        }
      },
      {
        '@type': 'Question',
        name: 'DailyDhandora पर मंडी भाव कब अपडेट होते हैं?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'DailyDhandora पर मंडी भाव दोपहर की नीलामी और शाम की अंतिम बोली समाप्त होते ही सबसे पहले प्रकाशित किए जाते हैं। किसान भाई हर दिन 2 बजे और 6 बजे ताज़ा भाव देख सकते हैं।'
        }
      }
    ]
  };

  const breadcrumbSchema = {
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
        name: 'मंडी भाव',
        item: `${baseUrl}/mandi-bhav`,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* 🔍 SEO Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0a0a0a]/80 backdrop-blur-sm border-b border-neutral-800 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="text-neutral-400 hover:text-white mr-4">
              ← होम
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold text-primary flex items-center gap-2">
              <span>🌾</span> नागौर मंडी भाव (Nagaur Mandi Bhav)
            </h1>
          </div>
          <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1 rounded-full font-bold animate-pulse">
            ● लाइव अपडेट्स
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Notice Banner */}
        <section className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-orange-950/40 via-neutral-900 to-amber-950/30 border border-orange-500/30 shadow-xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            नागौर व मेड़ता मंडी के आज के ताज़ा भाव
          </h2>
          <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
            राजस्थान की प्रसिद्ध <strong>नागौर कृषि उपज मंडी</strong> और <strong>मेड़ता सिटी मंडी</strong> के दैनिक फसल भाव — जीरा, मूंग, इसबगोल, ग्वार, सौंफ, चना और सरसों की सटीक आवक व नीलामी दरें।
          </p>
        </section>

        {/* Mandi Bhav Articles Grid */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold mb-6 text-white border-l-4 border-primary pl-3 flex items-center gap-2">
            ताज़ा मंडी बुलेटिन एवं भाव रिपोर्ट
          </h2>

          {articles.length === 0 ? (
            <div className="text-center py-16 bg-neutral-900/60 rounded-xl border border-neutral-800">
              <span className="text-4xl block mb-2">🌾</span>
              <p className="text-lg text-gray-300 font-medium">आज के मंडी भाव की ताज़ा रिपोर्ट जल्द ही लाइव होगी।</p>
              <p className="text-sm text-gray-500 mt-1">मंडी में नीलामी पूरी होते ही यहाँ सूची अपडेट कर दी जाएगी।</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article, index) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  index={index}
                  isFeatured={index === 0}
                  priority={index === 0}
                />
              ))}
            </div>
          )}
        </section>

        {/* Local Mandis Info Section (E-E-A-T and Local Relevance) */}
        <section className="mb-12 p-6 sm:p-8 bg-neutral-900/40 rounded-2xl border border-neutral-800">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-6 border-l-4 border-orange-500 pl-3">
            नागौर जिले की प्रमुख कृषि मंडियां
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="p-4 bg-neutral-900 rounded-xl border border-neutral-800/80">
              <h3 className="font-bold text-base text-primary mb-2">🏛️ नागौर कृषि उपज मंडी</h3>
              <p className="text-gray-400 leading-relaxed">
                नागौर मुख्य मंडी जीरा, मैथी, ग्वार और तारामीरा के लिए प्रसिद्ध है। यहाँ स्थानीय गांवों से भारी मात्रा में किसान अपनी फसल लेकर आते हैं।
              </p>
            </div>
            <div className="p-4 bg-neutral-900 rounded-xl border border-neutral-800/80">
              <h3 className="font-bold text-base text-primary mb-2">🌾 मेड़ता सिटी कृषि उपज मंडी</h3>
              <p className="text-gray-400 leading-relaxed">
                मेड़ता मंडी को मूंग और इसबगोल का सबसे बड़ा व्यापारिक केंद्र माना जाता है। यहाँ उच्च गुणवत्ता वाला मूंग अच्छे प्रीमियम भावों पर बिकता है।
              </p>
            </div>
            <div className="p-4 bg-neutral-900 rounded-xl border border-neutral-800/80">
              <h3 className="font-bold text-base text-primary mb-2">🚜 डेगाना व कुचामन मंडी</h3>
              <p className="text-gray-400 leading-relaxed">
                पूर्वी नागौर और डीडवाना-कुचामन क्षेत्र के किसानों के लिए ग्वार, बाजरा, चना और तिलहन की बिक्री का मुख्य केंद्र है।
              </p>
            </div>
          </div>
        </section>

        {/* ❓ Farmer FAQs - High Value for Google AI Overviews */}
        <section className="mb-8 p-6 sm:p-8 bg-neutral-900/60 rounded-2xl border border-neutral-800">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-6 border-l-4 border-blue-500 pl-3">
            अक्सर पूछे जाने वाले सवाल (Mandi FAQs)
          </h2>

          <div className="space-y-4">
            <div className="p-4 bg-neutral-950/60 rounded-xl border border-neutral-800">
              <h3 className="font-bold text-base text-white mb-1">
                ❓ नागौर मंडी में आज जीरा का क्या भाव है?
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                नागौर और मेड़ता कृषि उपज मंडी में जीरे के भाव गुणवत्ता, दानों के रंग और नमी के आधार पर तय होते हैं। ताज़ा न्यूनतम, अधिकतम और औसत भाव ऊपर दी गई आज की बुलेटिन रिपोर्ट में देखें।
              </p>
            </div>

            <div className="p-4 bg-neutral-950/60 rounded-xl border border-neutral-800">
              <h3 className="font-bold text-base text-white mb-1">
                ❓ मेड़ता मंडी में किन फसलों की सबसे अधिक आवक होती है?
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                मेड़ता मंडी में मुख्य रूप से मूंग, जीरा, इसबगोल, सौंफ, चना और रायड़ा (सरसों) की बंपर आवक होती है।
              </p>
            </div>

            <div className="p-4 bg-neutral-950/60 rounded-xl border border-neutral-800">
              <h3 className="font-bold text-base text-white mb-1">
                ❓ DailyDhandora पर मंडी भाव किस समय अपडेट होते हैं?
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                जैसे ही दोपहर की पहली बोली और शाम की अंतिम नीलामी समाप्त होती है, हमारी टीम तुरंत सटीक मंडी रिपोर्ट यहाँ पब्लिश करती है।
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
