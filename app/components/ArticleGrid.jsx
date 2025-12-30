'use client';

import { useState } from 'react';
import ArticleCard from './ArticleCard';

export default function ArticleGrid({ initialArticles, hindiCategory }) {
  const [articles, setArticles] = useState(initialArticles);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialArticles.length === 20);

  const loadMore = async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    const lastArticle = articles[articles.length - 1];
    const lastCreatedAt = lastArticle?.createdAt;

    try {
      const res = await fetch(`/api/articles?category=${encodeURIComponent(hindiCategory)}&lastCreatedAt=${lastCreatedAt}`);
      const data = await res.json();

      if (data.articles && data.articles.length > 0) {
        setArticles(prev => [...prev, ...data.articles]);
        if (data.articles.length < 20) setHasMore(false);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Failed to load more:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map((article, index) => (
          <ArticleCard 
            key={article.id} 
            article={article} 
            index={index} 
          />
        ))}
      </div>

      {hasMore && (
        <div className="mt-12 text-center">
          <button 
            onClick={loadMore} 
            disabled={loading}
            className="px-8 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-full font-bold transition-all disabled:opacity-50 border border-neutral-700 hover:scale-105 active:scale-95"
          >
            {loading ? '⏳ Loading...' : 'Load More Articles ↓'}
          </button>
        </div>
      )}
      
      {!hasMore && articles.length > 0 && (
        <div className="mt-12 text-center text-gray-600 text-sm italic">
          ✅ You have reached the end of the list.
        </div>
      )}
    </>
  );
}
