'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const router = useRouter();
  const [mode, setMode] = useState('loading');
  const [imageGen, setImageGen] = useState(true); // New state
  const [articles, setArticles] = useState([]);
  const [filter, setFilter] = useState('draft'); // 'draft' | 'published'
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0); // To trigger re-renders
  const [editingArticle, setEditingArticle] = useState(null); // Article being edited

  useEffect(() => {
    fetchSettings();
    fetchArticles();
  }, [filter, refreshKey]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (res.status === 401) { router.push('/admin'); return; }
      const data = await res.json();
      setMode(data.botMode);
      setImageGen(data.imageGenEnabled);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/articles?status=${filter}`);
      const data = await res.json();
      setArticles(data.articles || []);
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateMode = async (newMode) => {
    const oldMode = mode;
    setMode(newMode); // Optimistic UI update
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode }),
      });
    } catch (error) {
      console.error('Error updating mode:', error);
      setMode(oldMode); // Revert on failure
      alert('Failed to update mode.');
    }
  };

  const toggleImageGen = async () => {
      const newState = !imageGen;
      setImageGen(newState);
      try {
        await fetch('/api/admin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageGenEnabled: newState }),
        });
      } catch (error) {
          setImageGen(!newState); // Revert
          alert('Failed to update settings');
      }
  };

  const publishArticle = async (id) => {
    try {
      const res = await fetch('/api/admin/articles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'publish' }),
      });
      if (res.ok) {
        // Remove from current list (optimistic)
        setArticles(prev => prev.filter(a => a.id !== id));
      }
    } catch (error) {
      alert('Failed to publish');
    }
  };

  const deleteArticle = async (id) => {
    if (!confirm('Permanent Delete: Are you sure?')) return;
    try {
      const res = await fetch(`/api/admin/articles?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setArticles(prev => prev.filter(a => a.id !== id));
      }
    } catch (error) {
      alert('Failed to delete');
    }
  };

  const openEditModal = (article) => {
      setEditingArticle({ ...article });
  };

  const saveEdit = async (e) => {
      e.preventDefault();
      if (!editingArticle) return;

      try {
          const res = await fetch('/api/admin/articles', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                  id: editingArticle.id, 
                  action: 'update',
                  headline: editingArticle.headline,
                  content: editingArticle.content,
                  imageUrl: editingArticle.imageUrl,
                  category: editingArticle.category
              }),
          });

          if (res.ok) {
              setEditingArticle(null);
              fetchArticles(); // Refresh list to show changes
          } else {
              alert('Failed to save changes');
          }
      } catch (err) {
          alert('Error saving changes');
      }
  };

  const handleEditChange = (field, value) => {
      setEditingArticle(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-red-500/30">
      
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full animate-pulse ${mode === 'off' ? 'bg-red-500' : 'bg-green-500'}`}></div>
            <h1 className="font-bold text-lg tracking-tight hidden md:block">DailyDhandora <span className="text-white/40 font-normal ml-2">Control</span></h1>
          </div>

          <div className="flex items-center gap-4">
            
            {/* Image Gen Toggle */}
            <button
                onClick={toggleImageGen}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${imageGen ? 'bg-blue-900/20 border-blue-500/30 text-blue-400 hover:bg-blue-900/40' : 'bg-gray-800 border-gray-700 text-gray-500'}`}
                title="Toggle AI Image Generation (Saves Cost)"
            >
                <span className="text-xs font-bold">IMG GEN</span>
                <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${imageGen ? 'bg-blue-500' : 'bg-gray-600'}`}>
                    <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${imageGen ? 'translate-x-4' : 'translate-x-0'}`}></div>
                </div>
            </button>

            <div className="h-6 w-px bg-white/10 mx-2"></div>

            {/* Mode Switcher */}
            <div className="flex items-center bg-white/5 rounded-full p-1 border border-white/10">
                <button 
                    onClick={() => updateMode('auto')}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${mode === 'auto' ? 'bg-green-600 text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
                >
                    AUTO
                </button>
                <button 
                    onClick={() => updateMode('manual')}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${mode === 'manual' ? 'bg-yellow-500 text-black shadow-lg' : 'text-white/50 hover:text-white'}`}
                >
                    MANUAL
                </button>
                <button 
                    onClick={() => updateMode('off')}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${mode === 'off' ? 'bg-red-600 text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
                >
                    OFF
                </button>
            </div>
            
            <a href="/" target="_blank" className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white" title="View Live Site">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Status Mode Indicator Banner */}
        <div className={`mb-8 p-4 rounded-xl border flex items-center justify-between ${mode === 'manual' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-200' : mode === 'off' ? 'bg-red-500/10 border-red-500/20 text-red-200' : 'bg-green-500/10 border-green-500/20 text-green-200'}`}>
            <div className="flex items-center gap-3">
                <span className="text-2xl">
                    {mode === 'manual' ? '✋' : mode === 'off' ? '🛑' : '🤖'}
                </span>
                <div>
                    <h2 className="font-bold text-sm uppercase tracking-wider opacity-80">Current System Status</h2>
                    <p className="text-lg font-medium">
                        {mode === 'manual' ? 'Manual Approval Mode Active' : mode === 'off' ? 'System Halted (Kill Switch Active)' : 'Fully Autonomous Mode'}
                    </p>
                    {!imageGen && (
                        <p className="text-xs text-blue-300 mt-1 flex items-center gap-1">
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            Eco Mode: Image Gen Disabled
                        </p>
                    )}
                </div>
            </div>
            <div className="text-xs opacity-60 max-w-xs text-right hidden md:block">
                {mode === 'manual' ? 'Bot creates Drafts. You must approve them.' : mode === 'off' ? 'No new content will be generated.' : 'Bot generates and publishes automatically.'}
            </div>
        </div>

        {/* Content Tabs */}
        <div className="flex items-center gap-6 mb-6 border-b border-white/10">
            <button 
                onClick={() => setFilter('draft')}
                className={`pb-4 text-sm font-bold uppercase tracking-wider transition-all relative ${filter === 'draft' ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
            >
                Drafts / Pending
                {filter === 'draft' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]"></div>}
            </button>
            <button 
                onClick={() => setFilter('published')}
                className={`pb-4 text-sm font-bold uppercase tracking-wider transition-all relative ${filter === 'published' ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
            >
                Published History
                {filter === 'published' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>}
            </button>
        </div>

        {/* Grid */}
        {loading ? (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
               {[1,2,3,4,5,6].map(i => (
                   <div key={i} className="h-64 bg-white/5 rounded-xl"></div>
               ))}
           </div>
        ) : articles.length === 0 ? (
            <div className="text-center py-20 bg-white/5 rounded-xl border border-white/5 border-dashed">
                <p className="text-white/30 text-lg">No articles found in this section.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.map(article => (
                    <div key={article.id} className="group bg-[#0f0f0f] border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-all hover:shadow-2xl hover:shadow-black/50 flex flex-col">
                        
                        {/* Image */}
                        <div className="relative h-48 w-full overflow-hidden bg-black">
                             <Image 
                                src={article.imageUrl || '/placeholder.png'} 
                                alt="Cover"
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-105 opacity-80 group-hover:opacity-100"
                                unoptimized
                             />
                             <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white/80 text-[10px] px-2 py-1 rounded border border-white/10 uppercase font-bold tracking-wider">
                                 {article.category}
                             </div>
                        </div>

                        {/* Body */}
                        <div className="p-5 flex-grow flex flex-col">
                            <h3 className="text-lg font-bold leading-tight mb-2 text-white/90 group-hover:text-white line-clamp-2">
                                {article.headline}
                            </h3>
                            <div className="text-xs text-white/40 mb-4 flex items-center gap-2">
                                <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                                <span>•</span>
                                <span className="truncate max-w-[100px]">{article.sourceUrl ? new URL(article.sourceUrl).hostname : 'Source'}</span>
                            </div>

                            <div className="mt-auto flex gap-2 pt-4">
                                {filter === 'draft' && (
                                    <button 
                                        onClick={() => publishArticle(article.id)}
                                        className="bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-lg shadow-green-900/20"
                                        title="Publish Now"
                                    >
                                        🚀
                                    </button>
                                )}
                                
                                {/* EDIT BUTTON */}
                                <button 
                                    onClick={() => openEditModal(article)}
                                    className="flex-1 bg-white/5 hover:bg-blue-500/20 hover:text-blue-400 text-white/60 py-2 rounded-lg text-xs font-bold uppercase transition-colors"
                                >
                                    Edit
                                </button>

                                <button 
                                    onClick={() => deleteArticle(article.id)}
                                    className="px-3 bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-white/40 py-2 rounded-lg transition-colors"
                                    title="Delete"
                                >
                                    🗑️
                                </button>
                                <Link
                                    href={`/article/${article.id}`}
                                    target="_blank"
                                    className="px-3 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white py-2 rounded-lg transition-colors"
                                    title="Preview"
                                >
                                    👁️
                                </Link>
                            </div>
                        </div>

                    </div>
                ))}
            </div>
        )}

        {/* EDIT MODAL */}
        {editingArticle && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                    <form onSubmit={saveEdit} className="p-6 space-y-4">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Edit Article</h2>
                            <button type="button" onClick={() => setEditingArticle(null)} className="text-gray-400 hover:text-white">✕</button>
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Headline</label>
                            <input 
                                type="text" 
                                value={editingArticle.headline} 
                                onChange={(e) => handleEditChange('headline', e.target.value)}
                                className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                                <input 
                                    type="text" 
                                    value={editingArticle.category} 
                                    onChange={(e) => handleEditChange('category', e.target.value)}
                                    className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Image URL</label>
                                <input 
                                    type="text" 
                                    value={editingArticle.imageUrl} 
                                    onChange={(e) => handleEditChange('imageUrl', e.target.value)}
                                    className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none text-xs"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Content (HTML Supported)</label>
                            <textarea 
                                value={editingArticle.content} 
                                onChange={(e) => handleEditChange('content', e.target.value)}
                                className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none h-64 font-mono text-sm leading-relaxed"
                            />
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-white/5">
                            <button 
                                type="button" 
                                onClick={() => setEditingArticle(null)}
                                className="flex-1 py-3 rounded-lg bg-white/5 hover:bg-white/10 font-bold transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                className="flex-1 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 font-bold transition-colors shadow-lg shadow-blue-900/20"
                            >
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

      </main>
    </div>
  );
}
