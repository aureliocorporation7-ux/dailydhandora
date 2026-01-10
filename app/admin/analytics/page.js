'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    LayoutDashboard,
    BarChart3,
    LogOut,
    Menu,
    X,
    RefreshCw,
    TrendingUp,
    Eye,
    FileText,
    ExternalLink
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase-client';
import { useRouter } from 'next/navigation';

export default function AnalyticsDashboard() {
    const router = useRouter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        setRefreshing(true);
        try {
            const res = await fetch('/api/admin/analytics');
            const data = await res.json();
            setData(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push('/admin');
        } catch (err) {
            console.error('Logout error:', err);
        }
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
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-violet-600 flex items-center justify-center text-xl shadow-lg">
                                📊
                            </div>
                            <div>
                                <h1 className="font-bold text-lg">DailyDhandora</h1>
                                <p className="text-xs text-slate-400">Analytics</p>
                            </div>
                        </div>
                        <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <nav className="p-4 space-y-2">
                    <Link href="/admin/dashboard" className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all">
                        <LayoutDashboard size={20} />
                        Dashboard
                    </Link>
                    <Link href="/admin/analytics" className="flex items-center gap-3 px-4 py-3 bg-white/10 rounded-xl text-white font-medium">
                        <BarChart3 size={20} />
                        Analytics
                    </Link>
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
                            <div>
                                <h2 className="text-lg font-semibold">Analytics & Insights</h2>
                                <p className="text-xs text-slate-400 hidden sm:block">Real-time performance metrics</p>
                            </div>
                        </div>

                        <button
                            onClick={fetchData}
                            disabled={refreshing}
                            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all text-sm disabled:opacity-50"
                        >
                            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                    </div>
                </header>

                <div className="p-6 max-w-7xl mx-auto">
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
                            {[1, 2, 3].map(i => <div key={i} className="h-36 bg-slate-800/50 rounded-2xl" />)}
                        </div>
                    ) : (
                        <>
                            {/* Stats Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-2xl p-6">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                            <FileText size={24} className="text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="text-blue-400 text-xs font-semibold uppercase tracking-wider">Total Articles</p>
                                            <p className="text-3xl font-bold">{data?.totalArticles?.toLocaleString() || 0}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-purple-500/10 to-violet-600/5 border border-purple-500/20 rounded-2xl p-6">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                                            <Eye size={24} className="text-purple-400" />
                                        </div>
                                        <div>
                                            <p className="text-purple-400 text-xs font-semibold uppercase tracking-wider">Total Views</p>
                                            <p className="text-3xl font-bold">{data?.totalViews?.toLocaleString() || 0}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-green-500/10 to-emerald-600/5 border border-green-500/20 rounded-2xl p-6">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                                            <TrendingUp size={24} className="text-green-400" />
                                        </div>
                                        <div>
                                            <p className="text-green-400 text-xs font-semibold uppercase tracking-wider">Top Story</p>
                                            <p className="text-lg font-bold line-clamp-1">{data?.topArticles?.[0]?.headline || "No data"}</p>
                                            <p className="text-green-400 text-xs font-mono">{data?.topArticles?.[0]?.views || 0} views</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Viral News Table */}
                            <div className="bg-slate-800/30 border border-white/5 rounded-2xl overflow-hidden">
                                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">🔥</span>
                                        <h2 className="text-xl font-bold">Viral News (Top 20)</h2>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider">
                                            <tr>
                                                <th className="p-4 w-12">#</th>
                                                <th className="p-4">Headline</th>
                                                <th className="p-4 w-32">Category</th>
                                                <th className="p-4 w-24 text-right">Views</th>
                                                <th className="p-4 w-32 text-right">Published</th>
                                                <th className="p-4 w-16"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {data?.topArticles?.map((article, index) => (
                                                <tr key={article.id} className="hover:bg-white/5 transition-colors group">
                                                    <td className="p-4 text-slate-500 font-mono font-bold">
                                                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                                                    </td>
                                                    <td className="p-4 font-medium text-white/90 group-hover:text-white">
                                                        <span className="line-clamp-1">{article.headline}</span>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="px-3 py-1 bg-white/5 rounded-full text-xs text-slate-300 border border-white/5">
                                                            {article.category}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right font-bold text-green-400 font-mono">
                                                        {article.views.toLocaleString()}
                                                    </td>
                                                    <td className="p-4 text-right text-slate-500 text-xs">
                                                        {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : 'N/A'}
                                                    </td>
                                                    <td className="p-4">
                                                        <a
                                                            href={`/article/${article.id}`}
                                                            target="_blank"
                                                            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg inline-flex text-slate-400 hover:text-white transition-all"
                                                        >
                                                            <ExternalLink size={14} />
                                                        </a>
                                                    </td>
                                                </tr>
                                            ))}
                                            {(!data?.topArticles || data.topArticles.length === 0) && (
                                                <tr>
                                                    <td colSpan="6" className="p-12 text-center text-slate-500">
                                                        <Eye size={48} className="mx-auto mb-4 opacity-30" />
                                                        <p>No views recorded yet</p>
                                                        <p className="text-xs mt-1">Share your articles to get more views!</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
