'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function ArticleCard({ article, index, isFeatured = false, priority = false }) {
  const [timeAgo, setTimeAgo] = useState('');
  const [imgSrc, setImgSrc] = useState(article.imageUrl);

  useEffect(() => {
    const getTimeAgo = (dateString) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now - date) / 1000);
      
      if (diffInSeconds < 60) return 'अभी-अभी';
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} मिनट पहले`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} घंटे पहले`;
      return `${Math.floor(diffInSeconds / 86400)} दिन पहले`;
    };
    
    setTimeAgo(getTimeAgo(article.createdAt));
  }, [article.createdAt]);

  const handleShare = (e) => {
    e.preventDefault();
    if (navigator.share) {
      navigator.share({
        title: article.headline,
        url: `/article/${article.id}`,
      }).catch(console.error);
    }
  };

  const headlineSize = isFeatured ? 'text-xl' : 'text-base';

  return (
    <Link
      href={`/article/${article.id}`}
      className="flex flex-col gap-2 rounded-lg bg-neutral-900 border border-neutral-800 overflow-hidden hover:border-primary/50 transition-colors p-3"
    >
      <div className="relative w-full h-48 rounded-md overflow-hidden">
        <Image
          src={imgSrc}
          alt={article.headline || 'Article image'}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          quality={isFeatured ? 75 : 50}
          priority={priority}
          onError={() => setImgSrc('https://placehold.co/600x400/000000/FFFFFF/png?text=Image+Not+Found')}
        />
      </div>
      <div className="p-3 pt-1">
        <h3 className={`${headlineSize} text-primary font-headings font-bold leading-tight mb-1 line-clamp-2`}>
          {article.headline}
        </h3>
        <div className="flex justify-between items-center mt-2">
          {timeAgo ? (
            <p className="text-gray-500 text-xs font-primary">
              {timeAgo}
            </p>
          ) : (
            <div className="w-24 h-4 bg-neutral-700 rounded animate-pulse"></div>
          )}
          <button
            onClick={handleShare}
            className="text-green-500 hover:text-green-400 transition-colors p-2"
            aria-label="Share article"
          >
            <span className="material-symbols-outlined text-2xl">share</span>
          </button>
        </div>
      </div>
    </Link>
  );
}