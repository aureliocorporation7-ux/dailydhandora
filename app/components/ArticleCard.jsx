'use client';

import Link from 'next/link';
import Image from 'next/image';

// This is a Client Component because it uses an onClick event handler.
export default function ArticleCard({ article }) {

  // This helper function can also live inside the client component.
  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'अभी-अभी';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} मिनट पहले`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} घंटे पहले`;
    return `${Math.floor(diffInSeconds / 86400)} दिन पहले`;
  };

  const handleShare = (e) => {
    e.preventDefault();
    if (navigator.share) {
      navigator.share({
        title: article.title,
        url: `/article/${article.id}`,
      }).catch(console.error);
    }
  };

  return (
    <Link
      href={`/article/${article.id}`}
      className="flex flex-col gap-2 rounded-lg bg-neutral-900 border border-neutral-800 overflow-hidden hover:border-primary/50 transition-colors"
    >
      <div className="w-full relative aspect-[4/3] bg-neutral-800">
        {article.imageUrl ? (
          <Image
            src={article.imageUrl}
            alt={article.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 384px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600 text-4xl">
            📰
          </div>
        )}
      </div>
      <div className="p-3 pt-1">
        <h3 className="text-white text-base font-headings font-bold leading-tight mb-1 line-clamp-2">
          {article.title}
        </h3>
        <div className="flex justify-between items-center mt-2">
          <p className="text-gray-500 text-xs font-primary" suppressHydrationWarning>
            {getTimeAgo(article.createdAt)}
          </p>
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