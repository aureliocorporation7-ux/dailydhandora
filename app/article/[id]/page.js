import { db } from '../../../lib/firebase';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import WhatsAppShareButton from '../../components/WhatsAppShareButton';

async function getArticle(id) {
  try {
    const docRef = db.collection('articles').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error fetching article:', error);
    return null;
  }
}

async function getRelatedArticles(currentId, category) {
  try {
    let query = db.collection('articles').orderBy('createdAt', 'desc').limit(3);
    
    if (category) {
      query = query.where('category', '==', category);
    }

    const snapshot = await query.get();
    const articles = [];

    snapshot.forEach((doc) => {
      if (doc.id !== currentId) {
        const data = doc.data();
        articles.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        });
      }
    });

    return articles.slice(0, 2);
  } catch (error) {
    console.error('Error fetching related articles:', error);
    return [];
  }
}

export default async function ArticlePage({ params }) {
  const article = await getArticle(params.id);

  if (!article) {
    notFound();
  }

  const relatedArticles = await getRelatedArticles(params.id, article.category);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('hi-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col text-neutral-200 bg-background-dark font-body">
      {/* Top App Bar */}
      <header className="sticky top-0 z-10 flex items-center bg-neutral-950/80 px-4 py-3 backdrop-blur-sm border-b border-neutral-800">
        <Link href="/" className="text-neutral-200 p-2 -ml-2 hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-2xl">arrow_back_ios_new</span>
        </Link>
        <h2 className="text-neutral-200 text-xl font-display font-bold leading-tight tracking-tight flex-1 text-center">
          DailyDhandora
        </h2>
        <div className="w-8"></div> {/* Spacer for centering */}
      </header>

      <main className="flex-grow pb-32">
        {/* Header Image */}
        {article.imageUrl && (
          <div className="w-full">
            <Image
              className="w-full h-auto object-cover max-h-64"
              src={article.imageUrl}
              alt={article.title}
              width={800}
              height={450}
              priority
            />
          </div>
        )}

        <div className="px-4 pt-6">
          {/* Headline Text */}
          <h1 className="text-neutral-200 text-3xl font-display font-bold leading-tight">
            {article.title}
          </h1>
          {/* Meta Text */}
          <p className="text-neutral-400 text-sm font-normal leading-normal pt-2 pb-4">
            प्रकाशित: {formatDate(article.createdAt)}
          </p>
          {/* Body Text */}
          <article className="prose prose-invert prose-lg max-w-none text-neutral-200 prose-p:leading-relaxed">
            {article.content ? (
              <div dangerouslySetInnerHTML={{ __html: article.content.replace(/\n/g, '<br/>') }} />
            ) : (
              <p>{article.summary}</p>
            )}
          </article>
        </div>

        {/* Read Next Section */}
        {relatedArticles.length > 0 && (
          <section className="mt-12 px-4">
            <h2 className="text-2xl font-display font-bold text-neutral-200 mb-4">आगे पढ़ें</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {relatedArticles.map((related) => (
                <Link
                  key={related.id}
                  href={`/article/${related.id}`}
                  className="bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800 flex flex-col hover:border-primary transition-colors"
                >
                  {related.imageUrl && (
                     <div className="w-full h-32 relative">
                        <Image
                          src={related.imageUrl}
                          alt={related.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 384px"
                        />
                      </div>
                  )}
                  <div className="p-4 flex-grow flex flex-col">
                    <h3 className="text-lg font-display font-bold text-neutral-200 leading-tight flex-grow line-clamp-2">
                      {related.title}
                    </h3>
                    <span className="mt-4 self-start text-primary font-bold text-sm hover:underline">और पढ़ें →</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Sticky Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-neutral-950/80 backdrop-blur-sm border-t border-neutral-800">
        <WhatsAppShareButton article={article} />
      </div>
    </div>
  );
}
