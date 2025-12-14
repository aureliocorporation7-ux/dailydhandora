'use client';

import { useState, useEffect } from 'react';

export default function ArticleMeta({ category, createdAt }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    // Render a placeholder on the server and initial client render
    return (
      <div className="flex items-center gap-4 mb-8 text-gray-400 h-6" aria-busy="true" suppressHydrationWarning>
        <span>{category}</span>
        <span>•</span>
        <span className="w-24 h-4 bg-neutral-800 rounded animate-pulse"></span>
      </div>
    );
  }

  const formattedDate = new Date(createdAt).toLocaleDateString('hi-IN');

  return (
    <div className="flex items-center gap-4 mb-8 text-gray-400">
      <span>{category}</span>
      <span>•</span>
      <span>{formattedDate}</span>
    </div>
  );
}

