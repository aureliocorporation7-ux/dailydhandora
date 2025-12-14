'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function NotificationItem({ notification, onClick }) {
  const [imageError, setImageError] = useState(false);

  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'अभी-अभी';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} मिनट पहले`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} घंटे पहले`;
    return `${Math.floor(seconds / 86400)} दिन पहले`;
  };

  return (
    <Link
      href={`/article/${notification.id}`}
      onClick={onClick}
      className="block hover:bg-orange-50 transition-colors duration-150"
    >
      <div className="p-4 flex gap-3">
        <div className="flex-shrink-0">
          <div className="w-16 h-16 relative rounded-lg overflow-hidden bg-gray-200">
            {notification.imageUrl && !imageError ? (
              <Image
                src={notification.imageUrl}
                alt={notification.headline || 'Notification image'}
                fill
                className="object-cover"
                sizes="64px"
                quality={50}
                unoptimized={notification.imageUrl.includes('placehold.co')}
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                📰
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1">
            {notification.headline}
          </p>
          
          {notification.category && (
            <span className="inline-block px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 rounded mb-1">
              {notification.category}
            </span>
          )}
          
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
            {formatTimeAgo(notification.createdAt)}
          </p>
        </div>
      </div>
    </Link>
  );
}
