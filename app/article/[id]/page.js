import { db } from '@/lib/firebase';
import ArticleMeta from '@/app/components/ArticleMeta';
import AudioPlayer from '@/app/components/AudioPlayer';
import ArticleActions from '@/app/components/ArticleActions';
import Image from 'next/image';
import Link from 'next/link';

export const revalidate = 3600; // Revalidate every hour

async function getArticle(id) {
  try {
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
    };
  } catch (error) {
    console.error('Error fetching article:', error);
    return null;
  }
}

async function getRelatedArticles(category, currentId) {
    if (!category) return [];
    try {
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

  // Safe to call now because article exists
  const relatedArticles = await getRelatedArticles(article.category, article.id);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" suppressHydrationWarning>
      <article className="max-w-4xl mx-auto px-4 py-12">
        <div className="relative w-full h-96 mb-8 rounded-lg overflow-hidden">
          <Image
            src={article.imageUrl}
            alt={article.headline || 'Article image'}
            fill
            className="object-cover"
            quality={75}
            priority
          />
        </div>

        <div className="flex justify-between items-start gap-4 mb-6">
            <h1 className="text-4xl font-bold flex-1">{article.headline}</h1>
            <div className="flex-shrink-0 pt-1">
                <AudioPlayer text={article.content} />
            </div>
        </div>
        
        <ArticleMeta category={article.category} createdAt={article.createdAt} />

        <div className="prose prose-invert max-w-none">
          <div dangerouslySetInnerHTML={{ __html: article.content }} />
        </div>

        {/* Action Buttons (Comments) after content */}
        <div className="flex justify-end mt-6">
            <ArticleActions articleId={article.id} />
        </div>

        {/* Author Box */}
        <div className="mt-12 p-6 bg-neutral-900/50 border border-neutral-800 rounded-xl flex items-start gap-4">
            <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0">
                D
            </div>
            <div className="flex-1">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-0.5">Written By</p>
                <h3 className="text-lg font-bold text-white">{article.author || 'Daily Dhandora Desk'}</h3>
                <p className="text-xs text-gray-500 mt-1">
                    Providing accurate, unbiased, and timely news updates for the people of India.
                </p>
            </div>
        </div>

        {article.source && (
          <div className="mt-8 pt-8 border-t border-gray-800">
            <p className="text-sm text-gray-500">
              स्रोत: <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                {article.source}
              </a>
            </p>
          </div>
        )}

        {/* Related Articles Section */}
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
