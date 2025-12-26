'use client';

import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import CommentSection from './CommentSection';

export default function ArticleActions({ articleId }) {
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsCommentsOpen(true)}
        className="mt-4 flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-primary transition-colors bg-white/5 px-4 py-2 rounded-full border border-white/10 hover:border-primary/50"
      >
        <MessageSquare className="w-4 h-4" />
        चर्चा करें (Comments)
      </button>

      <CommentSection 
        articleId={articleId} 
        isOpen={isCommentsOpen} 
        onClose={() => setIsCommentsOpen(false)} 
      />
    </>
  );
}
