'use client';

import { useState, useEffect } from 'react';
import { X, Send, MessageSquare } from 'lucide-react';

export default function CommentSection({ articleId, isOpen, onClose }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasCommented, setHasCommented] = useState(false);

  useEffect(() => {
    if (isOpen) {
        if (localStorage.getItem(`commented_${articleId}`)) {
            setHasCommented(true);
        }
        fetchComments();
    }
  }, [articleId, isOpen]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/comments?articleId=${articleId}`);
      const data = await res.json();
      setComments(data.comments || []);
    } catch (error) {
      console.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            articleId, 
            content: newComment,
            username: username || 'DailyDhandora Reader'
        }),
      });

      if (res.ok) {
        setNewComment('');
        setHasCommented(true);
        localStorage.setItem(`commented_${articleId}`, 'true'); 
        fetchComments(); 
      }
    } catch (error) {
      alert('Error posting comment');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>

        {/* Drawer */}
        <div className="relative w-full max-w-md h-full bg-[#111] border-l border-white/10 shadow-2xl flex flex-col transform transition-transform duration-300">
            
            {/* Header */}
            <div className="flex justify-between items-center p-5 border-b border-white/10 bg-[#161616]">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    जनता की आवाज़
                </h3>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                
                {/* Form */}
                {!hasCommented ? (
                    <form onSubmit={handleSubmit} className="mb-8">
                        <div className="mb-3">
                            <input 
                                type="text" 
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-primary outline-none text-sm"
                                placeholder="आपका नाम (Optional)"
                            />
                        </div>
                        <div className="relative">
                            <textarea 
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                className="w-full bg-black border border-white/10 rounded-lg p-3 pr-12 text-white focus:border-primary outline-none h-24 resize-none text-sm leading-relaxed"
                                placeholder="अपनी राय लिखें..."
                                required
                            />
                            <button 
                                type="submit" 
                                disabled={submitting}
                                className="absolute bottom-3 right-3 p-2 bg-primary text-white rounded-full hover:bg-orange-600 transition-colors disabled:opacity-50"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="bg-green-900/20 border border-green-500/30 p-4 rounded-xl mb-8 text-center">
                        <p className="text-green-400 font-bold text-sm">धन्यवाद! आपकी राय दर्ज कर ली गई है।</p>
                    </div>
                )}

                {/* List */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="text-center py-10">
                            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                        </div>
                    ) : comments.length === 0 ? (
                        <div className="text-center py-10 opacity-50">
                            <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-600" />
                            <p className="text-gray-500 text-sm">अभी कोई चर्चा नहीं है। शुरुआत करें!</p>
                        </div>
                    ) : (
                        comments.map(comment => (
                            <div key={comment.id} className="bg-[#1a1a1a] p-4 rounded-xl border border-white/5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-300">
                                            {comment.username.charAt(0)}
                                        </div>
                                        <h4 className="font-bold text-white text-sm">{comment.username}</h4>
                                    </div>
                                    <span className="text-[10px] text-gray-600">{new Date(comment.createdAt).toLocaleDateString()}</span>
                                </div>
                                <p className="text-gray-300 text-sm leading-relaxed pl-8">{comment.content}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    </div>
  );
}