'use client';

import { useState, useEffect } from 'react';

export default function ArticleMeta({ category, createdAt }) {
  const [formattedDate, setFormattedDate] = useState('');

  useEffect(() => {
    // This code runs only on the client, after hydration
    setFormattedDate(new Date(createdAt).toLocaleDateString('hi-IN'));
  }, [createdAt]);

  // Render a placeholder on the server and initial client render
  if (!formattedDate) {
    return (
      <div className="flex items-center gap-4 mb-8 text-gray-400 h-6" aria-busy="true">
        <span>{category}</span>
        <span>•</span>
        <span className="w-24 h-4 bg-neutral-800 rounded animate-pulse"></span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 mb-8 text-gray-400">
      <span>{category}</span>
      <span>•</span>
      <span>{formattedDate}</span>
    </div>
  );
}
