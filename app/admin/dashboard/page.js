'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase-client';
import {
  LayoutDashboard,
  BarChart3,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Zap,
  Image as ImageIcon,
  Mic,
  ExternalLink,
  Filter,
  Plus,
  Trash2,
  Eye,
  Edit3,
  Rocket,
  AlertTriangle,
  ChevronDown,
  Clock,
  TrendingUp
} from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const [mode, setMode] = useState('loading');
  const [imageGen, setImageGen] = useState(true);
  const [audioGen, setAudioGen] = useState(true);
  const [articles, setArticles] = useState([]);
  const [filter, setFilter] = useState('draft');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [editingArticle, setEditingArticle] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    todayCount: 0,
    draftCount: 0,
    publishedCount: 0,
    totalViews: 0
  });

  // Cleanup states
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState('');
  const [cleanupError, setCleanupError] = useState('');

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'नागौर न्यूज़', label: 'नागौर न्यूज़' },
    { value: 'मंडी भाव', label: 'मंडी भाव' },
    { value: 'शिक्षा विभाग', label: 'शिक्षा विभाग' },
    { value: 'सरकारी योजना', label: 'सरकारी योजना' },
    { value: 'भर्ती व रिजल्ट', label: 'भर्ती व रिजल्ट' },
  ];

  useEffect(() => {
    fetchSettings();
    fetchArticles();
    fetchStats();
  }, [filter, categoryFilter]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (res.status === 401) { router.push('/admin'); return; }
      const data = await res.json();
      setMode(data.botMode);
      setImageGen(data.imageGenEnabled);
      setAudioGen(data.enableAudioGen);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const [draftRes, pubRes] = await Promise.all([
        fetch('/api/admin/articles?status=draft'),
        fetch('/api/admin/articles?status=published')
      ]);
      const draftData = await draftRes.json();
      const pubData = await pubRes.json();

      const today = new Date().toDateString();
      const todayArticles = [...(draftData.articles || []), ...(pubData.articles || [])]
        .filter(a => new Date(a.createdAt).toDateString() === today);

      setStats({
        todayCount: todayArticles.length,
        draftCount: draftData.articles?.length || 0,
        publishedCount: pubData.articles?.length || 0,
        totalViews: pubData.articles?.reduce((sum, a) => sum + (a.views || 0), 0) || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchArticles = async () => {
    setLoading(true);
    try {
      let url = `/api/admin/articles?status=${filter}`;
      const res = await fetch(url);
      const data = await res.json();
      let filteredArticles = data.articles || [];

      if (categoryFilter !== 'all') {
        filteredArticles = filteredArticles.filter(a => a.category === categoryFilter);
      }

      setArticles(filteredArticles);
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateMode = async (newMode) => {
    const oldMode = mode;
    setMode(newMode);
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode }),
      });
    } catch (error) {
      console.error('Error updating mode:', error);
      setMode(oldMode);
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
      setImageGen(!newState);
      alert('Failed to update settings');
    }
  };

  const toggleAudioGen = async () => {
    const newState = !audioGen;
    setAudioGen(newState);
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enableAudioGen: newState }),
      });
    } catch (error) {
      setAudioGen(!newState);
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
        setArticles(prev => prev.filter(a => a.id !== id));
        fetchStats();
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
        fetchStats();
      }
    } catch (error) {
      alert('Failed to delete');
    }
  };

  const generateAudio = async (article) => {
    if (!confirm(`Generate Audio for "${article.headline}"? This costs credits.`)) return;
    const btn = document.activeElement;
    if (btn) { btn.disabled = true; btn.innerText = '...'; }
    try {
      const res = await fetch('/api/admin/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId: article.id, text: article.content }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('Audio Generated Successfully!');
        fetchArticles();
      } else {
        alert('Failed: ' + data.error);
        if (btn) { btn.disabled = false; btn.innerText = '🎙️'; }
      }
    } catch (error) {
      alert('Error generating audio');
      if (btn) { btn.disabled = false; btn.innerText = '🎙️'; }
    }
  };

  const openEditModal = (article) => {
    setEditingArticle({ ...article, isNew: false });
  };

  const openCreateModal = () => {
    setEditingArticle({
      headline: '',
      content: '',
      imageUrl: '',
      category: 'Other',
      isNew: true,
    });
  };

  const saveArticle = async (e) => {
    e.preventDefault();
    if (!editingArticle) return;
    const { isNew, ...articleData } = editingArticle;
    try {
      let res;
      if (isNew) {
        res = await fetch('/api/admin/articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...articleData, status: 'published' }),
        });
      } else {
        res = await fetch('/api/admin/articles', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: articleData.id, action: 'update', ...articleData }),
        });
      }
      if (res.ok) {
        setEditingArticle(null);
        fetchArticles();
        fetchStats();
      } else {
        alert('Failed to save article.');
      }
    } catch (err) {
      alert('Error saving article.');
    }
  };

  const handleEditChange = (field, value) => {
    setEditingArticle(prev => ({ ...prev, [field]: value }));
  };

  const handleCleanCategory = async (categoryName, displayCategory) => {
    if (!confirm(`⚠️ DANGER: Delete ALL articles in '${displayCategory}'?`)) return;
    const masterKey = prompt(`Enter MASTER PASSWORD for ${displayCategory}:`);
    if (!masterKey) { alert("Cancelled."); return; }

    setCleanupLoading(true);
    setCleanupMessage('');
    setCleanupError('');

    try {
      const response = await fetch('/api/admin/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: categoryName, masterKey }),
      });
      const data = await response.json();
      if (response.ok) {
        setCleanupMessage(data.message);
        fetchArticles();
        fetchStats();
      } else {
        setCleanupError(data.error || 'Failed');
      }
    } catch (err) {
      setCleanupError('Connection error');
    } finally {
      setCleanupLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/admin');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const getModeColor = () => {
    if (mode === 'auto') return 'from-green-600 to-emerald-600';
    if (mode === 'manual') return 'from-yellow-600 to-amber-600';
    return 'from-red-600 to-rose-600';
  };

  const getModeIcon = () => {
    if (mode === 'auto') return '🤖';
    if (mode === 'manual') return '✋';
    return '🛑';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white font-sans">

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-72 bg-slate-900/95 backdrop-blur-xl border-r border-white/10 z-50 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getModeColor()} flex items-center justify-center text-xl shadow-lg`}>
                {getModeIcon()}
              </div>
              <div>
                <h1 className="font-bold text-lg">DailyDhandora</h1>
                <p className="text-xs text-slate-400">Command Center</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
              <X size={20} />
            </button>
          </div>
        </div>

        <nav className="p-4 space-y-2">
          <Link href="/admin/dashboard" className="flex items-center gap-3 px-4 py-3 bg-white/10 rounded-xl text-white font-medium">
            <LayoutDashboard size={20} />
            Dashboard
          </Link>
          <Link href="/admin/analytics" className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all">
            <BarChart3 size={20} />
            Analytics
          </Link>
          <div className="pt-4 border-t border-white/10 mt-4">
            <p className="px-4 text-xs text-slate-500 uppercase tracking-wider mb-3">Controls</p>

            {/* Bot Mode */}
            <div className="px-4 mb-4">
              <p className="text-xs text-slate-400 mb-2">Bot Mode</p>
              <div className="flex bg-slate-800/50 rounded-lg p-1">
                {['auto', 'manual', 'off'].map(m => (
                  <button
                    key={m}
                    onClick={() => updateMode(m)}
                    className={`flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all ${mode === m
                        ? m === 'auto' ? 'bg-green-600 text-white'
                          : m === 'manual' ? 'bg-yellow-500 text-black'
                            : 'bg-red-600 text-white'
                        : 'text-slate-400 hover:text-white'
                      }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <button onClick={toggleImageGen} className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 rounded-xl transition-all">
              <span className="flex items-center gap-3 text-slate-400">
                <ImageIcon size={18} />
                Image Gen
              </span>
              <div className={`w-10 h-5 rounded-full p-0.5 transition-colors ${imageGen ? 'bg-blue-500' : 'bg-slate-700'}`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${imageGen ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </button>

            <button onClick={toggleAudioGen} className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 rounded-xl transition-all">
              <span className="flex items-center gap-3 text-slate-400">
                <Mic size={18} />
                Audio Gen
              </span>
              <div className={`w-10 h-5 rounded-full p-0.5 transition-colors ${audioGen ? 'bg-purple-500' : 'bg-slate-700'}`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${audioGen ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </button>
          </div>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all font-medium">
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-72">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-xl border-b border-white/5">
          <div className="flex items-center justify-between px-6 h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-400 hover:text-white">
                <Menu size={24} />
              </button>
              <h2 className="text-lg font-semibold hidden sm:block">Dashboard</h2>
            </div>

            <div className="flex items-center gap-3">
              <a href="/" target="_blank" className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all text-sm">
                <ExternalLink size={16} />
                <span className="hidden sm:inline">View Site</span>
              </a>
              <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 rounded-lg font-semibold text-sm shadow-lg shadow-orange-500/20 transition-all">
                <Plus size={16} />
                <span className="hidden sm:inline">Write Article</span>
              </button>
            </div>
          </div>
        </header>

        <div className="p-6 max-w-7xl mx-auto">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <Clock size={20} className="text-blue-400" />
                </div>
                <span className="text-blue-400 text-xs font-semibold uppercase tracking-wider">Today</span>
              </div>
              <p className="text-3xl font-bold">{stats.todayCount}</p>
            </div>

            <div className="bg-gradient-to-br from-yellow-500/10 to-amber-600/5 border border-yellow-500/20 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                  <FileText size={20} className="text-yellow-400" />
                </div>
                <span className="text-yellow-400 text-xs font-semibold uppercase tracking-wider">Drafts</span>
              </div>
              <p className="text-3xl font-bold">{stats.draftCount}</p>
            </div>

            <div className="bg-gradient-to-br from-green-500/10 to-emerald-600/5 border border-green-500/20 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <Rocket size={20} className="text-green-400" />
                </div>
                <span className="text-green-400 text-xs font-semibold uppercase tracking-wider">Published</span>
              </div>
              <p className="text-3xl font-bold">{stats.publishedCount}</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500/10 to-violet-600/5 border border-purple-500/20 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <TrendingUp size={20} className="text-purple-400" />
                </div>
                <span className="text-purple-400 text-xs font-semibold uppercase tracking-wider">Views</span>
              </div>
              <p className="text-3xl font-bold">{stats.totalViews.toLocaleString()}</p>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-slate-800/30 p-4 rounded-2xl border border-white/5">
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('draft')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${filter === 'draft' ? 'bg-yellow-500 text-black' : 'bg-white/5 text-slate-400 hover:text-white'}`}
              >
                Drafts ({stats.draftCount})
              </button>
              <button
                onClick={() => setFilter('published')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${filter === 'published' ? 'bg-green-500 text-black' : 'bg-white/5 text-slate-400 hover:text-white'}`}
              >
                Published ({stats.publishedCount})
              </button>
            </div>

            <div className="relative">
              <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="pl-10 pr-8 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-orange-500 appearance-none cursor-pointer min-w-[180px]"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Articles Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-72 bg-slate-800/50 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-20 bg-slate-800/30 rounded-2xl border border-dashed border-white/10">
              <FileText size={48} className="mx-auto text-slate-600 mb-4" />
              <p className="text-slate-400 text-lg">No articles found</p>
              <p className="text-slate-500 text-sm">Try changing filters or create a new article</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {articles.map(article => (
                <div key={article.id} className="group bg-slate-800/40 border border-white/5 rounded-2xl overflow-hidden hover:border-orange-500/30 transition-all hover:shadow-xl hover:shadow-orange-500/5">
                  <div className="relative h-44 w-full overflow-hidden">
                    <Image
                      src={article.imageUrl || '/placeholder.png'}
                      alt="Cover"
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
                    <span className="absolute top-3 right-3 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-wider border border-white/10">
                      {article.category}
                    </span>
                  </div>

                  <div className="p-5">
                    <h3 className="text-base font-bold leading-tight mb-3 text-white/90 group-hover:text-white line-clamp-2">
                      {article.headline}
                    </h3>

                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                      <Clock size={12} />
                      <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                      {article.views > 0 && (
                        <>
                          <span>•</span>
                          <Eye size={12} />
                          <span>{article.views} views</span>
                        </>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {filter === 'draft' && (
                        <button
                          onClick={() => publishArticle(article.id)}
                          className="flex-1 flex items-center justify-center gap-1 bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded-lg text-xs font-bold transition-all"
                        >
                          <Rocket size={14} />
                          Publish
                        </button>
                      )}
                      {!article.audioUrl && (
                        <button
                          onClick={() => generateAudio(article)}
                          className="p-2 bg-white/5 hover:bg-purple-500/20 text-slate-400 hover:text-purple-400 rounded-lg transition-all"
                          title="Generate Audio"
                        >
                          <Mic size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => openEditModal(article)}
                        className="p-2 bg-white/5 hover:bg-blue-500/20 text-slate-400 hover:text-blue-400 rounded-lg transition-all"
                        title="Edit"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => deleteArticle(article.id)}
                        className="p-2 bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-all"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                      <a
                        href={`/article/${article.id}`}
                        target="_blank"
                        className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-all"
                        title="Preview"
                      >
                        <Eye size={16} />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Danger Zone */}
          <div className="mt-12 bg-red-950/30 border border-red-900/30 p-6 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-red-400" size={24} />
              <h2 className="text-xl font-bold text-red-400">Danger Zone</h2>
            </div>
            <p className="text-slate-400 mb-6 text-sm">
              Irreversible actions. Master password required.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { cat: 'नागौर न्यूज़', display: 'Nagaur News', icon: '📰' },
                { cat: 'मंडी भाव', display: 'Mandi Bhav', icon: '🌾' },
                { cat: 'सरकारी योजना', display: 'Schemes', icon: '📜' },
                { cat: 'भर्ती व रिजल्ट', display: 'Jobs', icon: '🎓' },
              ].map(item => (
                <button
                  key={item.cat}
                  onClick={() => handleCleanCategory(item.cat, item.display)}
                  disabled={cleanupLoading}
                  className="flex flex-col items-center gap-2 p-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-red-400 hover:text-red-300 transition-all disabled:opacity-50"
                >
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-xs font-bold uppercase tracking-wider">Delete {item.display}</span>
                </button>
              ))}
            </div>
            {cleanupLoading && <p className="mt-4 text-yellow-400 text-center animate-pulse">Processing...</p>}
            {cleanupMessage && <p className="mt-4 text-green-400 text-center font-bold bg-green-900/20 p-2 rounded-lg">{cleanupMessage}</p>}
            {cleanupError && <p className="mt-4 text-red-400 text-center font-bold bg-red-900/20 p-2 rounded-lg">{cleanupError}</p>}
          </div>
        </div>
      </main>

      {/* Edit Modal */}
      {editingArticle && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <form onSubmit={saveArticle} className="p-6 space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{editingArticle.isNew ? '✨ Create Article' : '✏️ Edit Article'}</h2>
                <button type="button" onClick={() => setEditingArticle(null)} className="text-slate-400 hover:text-white p-2">
                  <X size={20} />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Headline</label>
                <input
                  type="text"
                  value={editingArticle.headline}
                  onChange={(e) => handleEditChange('headline', e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl p-3 text-white focus:border-orange-500 outline-none"
                  placeholder="Enter headline..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Category</label>
                  <select
                    value={editingArticle.category}
                    onChange={(e) => handleEditChange('category', e.target.value)}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl p-3 text-white focus:border-orange-500 outline-none"
                  >
                    <option value="Other">Other</option>
                    <option value="सरकारी योजना">सरकारी योजना</option>
                    <option value="भर्ती व रिजल्ट">भर्ती व रिजल्ट</option>
                    <option value="मंडी भाव">मंडी भाव</option>
                    <option value="शिक्षा विभाग">शिक्षा विभाग</option>
                    <option value="नागौर न्यूज़">नागौर न्यूज़</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Image URL</label>
                  <input
                    type="text"
                    value={editingArticle.imageUrl}
                    onChange={(e) => handleEditChange('imageUrl', e.target.value)}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl p-3 text-white focus:border-orange-500 outline-none text-sm"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Content (HTML)</label>
                <textarea
                  value={editingArticle.content}
                  onChange={(e) => handleEditChange('content', e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl p-3 text-white focus:border-orange-500 outline-none h-64 font-mono text-sm"
                  placeholder="<p>Write your article...</p>"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingArticle(null)}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 font-bold transition-all shadow-lg"
                >
                  {editingArticle.isNew ? 'Publish Now' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}