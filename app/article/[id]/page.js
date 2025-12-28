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
