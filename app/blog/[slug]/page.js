import { notFound } from 'next/navigation';
import Link from 'next/link';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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

async function getArticle(slug) {
  try {
    const db = getFirebaseAdmin();
    const snapshot = await db
      .collection('articles')
      .where('slug', '==', slug)
      .limit(1)
      .get({ next: { tags: ['collection'] } });

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate().toISOString()
    };

  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

async function getRelatedArticles(currentSlug) {
  try {
    const db = getFirebaseAdmin();
    const snapshot = await db
      .collection('articles')
      .orderBy('createdAt', 'desc')
      .limit(3)
      .get();

    return snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate().toISOString()
      }))
      .filter(article => article.slug !== currentSlug)
      .slice(0, 2);

  } catch (error) {
    return [];
  }
}

export async function generateMetadata({ params }) {
  const article = await getArticle(params.slug);
  if (!article) return { title: 'Not Found' };
  return {
    title: article.title,
    description: article.summary,
  };
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('hi-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

export default async function BlogPost({ params }) {
  const article = await getArticle(params.slug);
  if (!article) notFound();
  const relatedArticles = await getRelatedArticles(params.slug);
  const shareUrl = encodeURIComponent(`https://dailydhandora.vercel.app/blog/${article.slug}`);
  const shareText = encodeURIComponent(article.title);
  const whatsappUrl = `https://wa.me/?text=${shareText}%20${shareUrl}`;
  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center bg-bg-primary/80 px-4 py-3 backdrop-blur-sm border-b border-bg-tertiary">
        <Link href="/" className="text-text-primary p-2 -ml-2 hover:bg-bg-secondary rounded-lg">
          <span className="material-symbols-outlined text-2xl">arrow_back_ios_new</span>
        </Link>
        <h2 className="text-xl font-display font-bold flex-1 text-center">
          DailyDhandora
        </h2>
        <div className="w-8"></div>
      </header>

      <main className="flex-grow pb-32">


        <div className="px-4 pt-6">
          <h1 className="text-3xl font-display font-bold leading-tight mb-2">
            {article.title}
          </h1>

          <div className="flex items-center gap-3 text-sm text-text-secondary pb-4 border-b border-bg-tertiary mb-6">
            <span>प्रकाशित: {formatDate(article.createdAt)}</span>
            <span>- </span>
            <span className="px-2 py-1 bg-primary/20 text-primary rounded text-xs font-semibold">
              {article.category}
            </span>
          </div>

          <article
            className="prose prose-invert prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-bg-tertiary">
              {article.tags.map(tag => (
                <span key={tag} className="px-3 py-1 bg-bg-secondary border border-bg-tertiary rounded-full text-xs text-text-secondary">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {article.sourceUrl && (
            <div className="mt-6 p-4 bg-bg-secondary rounded-lg border border-bg-tertiary">
              <p className="text-sm text-text-tertiary mb-2">मूल स्रोत:</p>
              <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-sm font-medium hover:underline">
                {article.sourceTitle} ↗
              </a>
            </div>
          )}
        </div>

        {relatedArticles.length > 0 && (
          <section className="mt-12 px-4">
            <h2 className="text-2xl font-display font-bold mb-4">आगे पढ़ें</h2>
            <div className="grid gap-4">
              {relatedArticles.map(rel => (
                <Link key={rel.id} href={`/blog/${rel.slug}`} className="bg-bg-secondary rounded-lg border border-bg-tertiary flex flex-col overflow-hidden hover:border-primary/50">
                  <div className="p-4">
                    <h3 className="text-lg font-display font-bold line-clamp-2">
                      {rel.title}
                    </h3>
                    <span className="mt-4 inline-block text-primary font-bold text-sm">
                      और पढ़ें →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* WhatsApp Share */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-bg-primary/80 backdrop-blur-sm border-t border-bg-tertiary max-w-mobile mx-auto">
        <a href={whatsappUrl} target="_blank" rel="noopener" className="w-full flex items-center justify-center gap-3 rounded-lg bg-whatsapp-green text-white font-bold py-4 text-lg">
          <svg fill="currentColor" height="24" viewBox="0 0 24 24" width="24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.371-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01s-.521.074-.792.372c-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"></path>
          </svg>
          <span>WhatsApp पर शेयर करें</span>
        </a>
      </div>
    </>
  );
}