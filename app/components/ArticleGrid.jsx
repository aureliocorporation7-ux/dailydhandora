'use client';

import { useState } from 'react';
import ArticleCard from './ArticleCard';

export default function ArticleGrid({ initialArticles, hindiCategory, apiCategory }) {
  const [articles, setArticles] = useState(initialArticles);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialArticles.length >= 10); // Assume more if full batch returned

  const loadMore = async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    const lastArticle = articles[articles.length - 1];
    const lastCreatedAt = lastArticle?.publishedAt || lastArticle?.createdAt;

    try {
      // Use the new paginated API
      const res = await fetch(`/api/articles?category=${apiCategory}&limit=10&lastCreatedAt=${lastCreatedAt}`);
      const data = await res.json();

      if (data.articles && data.articles.length > 0) {
        setArticles(prev => {
          // Filter out any potential duplicates by ID
          const existingIds = new Set(prev.map(a => a.id));
          const newArticles = data.articles.filter(a => !existingIds.has(a.id));
          return [...prev, ...newArticles];
        });

        // If we got fewer than requested, we're likely at the end
        if (data.articles.length < 10) setHasMore(false);
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {articles.map((article, index) => (
          <ArticleCard
            key={article.id}
            article={article}
            index={index}
          />
        ))}
      </div>

      {hasMore && (
        <div className="mt-10 lg:mt-16 text-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="group relative px-8 py-3 rounded-full font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-70 disabled:pointer-events-none overflow-hidden"
          >
            {/* Gradient Background */}
            <div className={`absolute inset-0 bg-gradient-to-r from-primary to-orange-600 transition-transform duration-500 ${loading ? 'animate-pulse' : 'group-hover:scale-110'}`}></div>

            {/* Content */}
            <span className="relative flex items-center gap-2">
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading Articles...
                </>
              ) : (
                <>
                  Load More Articles
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 group-hover:translate-y-1 transition-transform">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </>
              )}
            </span>
          </button>
        </div>
      )}

      {!hasMore && articles.length > 0 && (
        <div className="mt-16 text-center">
          <p className="text-gray-500 text-sm font-medium bg-neutral-900/50 inline-block px-6 py-2 rounded-full border border-neutral-800">
            ✅ You've reached the end of the list
          </p>
        </div>
      )}
    </>
  );
}