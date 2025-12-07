import { db } from '@/lib/firebase';
import ArticleMeta from '@/app/components/ArticleMeta';

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
    };
  } catch (error) {
    console.error('Error fetching article:', error);
    return null;
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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <article className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-6">{article.title}</h1>
        
        {article.imageUrl && (
          <img 
            src={article.imageUrl} 
            alt={article.title}
            className="w-full h-96 object-cover rounded-lg mb-8"
          />
        )}

        <ArticleMeta category={article.category} createdAt={article.createdAt} />

        <div className="prose prose-invert max-w-none">
          <div dangerouslySetInnerHTML={{ __html: article.content }} />
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
    title: `${article.title} - DailyDhandora`,
    description: article.summary || article.title,
  };
}
