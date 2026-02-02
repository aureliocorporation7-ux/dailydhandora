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
    Download,
    Eye,
    Users,
    Clock,
    Wheat,
    GraduationCap,
    Building2,
    Newspaper,
    ArrowUpRight,
    Flame,
    PieChart as PieIcon
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase-client';
import { useRouter } from 'next/navigation';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell,
    PieChart,
    Pie,
    Legend
} from 'recharts';

export default function IntelligenceDashboard() {
    const router = useRouter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [mounted, setMounted] = useState(false);

    const fetchData = async () => {
        setRefreshing(true);
        try {
            const res = await fetch('/api/intelligence/dashboard?days=7');
            const json = await res.json();
            setData(json);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        setMounted(true);
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

    // 📥 Download Report Handler
    const handleDownloadReport = () => {
        if (!data) return;

        const report = {
            generatedAt: new Date().toISOString(),
            traffic: data.traffic,
            categoryIntel: {
                mandi: data.mandi.totalViews,
                career: data.career.totalViews,
                scheme: data.scheme.totalViews
            },
            trends: data.dailyTrend
        };

        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `intelligence-report-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Prepare chart data
    const categoryData = data ? [
        { name: 'Mandi', value: data.mandi.totalViews || 0, color: '#f59e0b' },
        { name: 'Career', value: data.career.totalViews || 0, color: '#3b82f6' },
        { name: 'Schemes', value: data.scheme.totalViews || 0, color: '#22c55e' },
        { name: 'News', value: data.news?.totalViews || 0, color: '#ef4444' }
    ] : [];

    // Stage name formatting
    const formatStage = (stage) => {
        const map = {
            'result_seeker': '🔍 रिजल्ट',
            'aspirant_early': '📚 सिलेबस',
            'exam_ready': '📝 प्रवेश पत्र',
            'job_seeker': '💼 नौकरी'
        };
        return map[stage] || stage;
    };

    // Intent name formatting
    const formatIntent = (intent) => {
        const map = {
            'loan_seeker': '🏦 लोन',
            'subsidy_seeker': '💰 सब्सिडी',
            'housing_seeker': '🏠 आवास',
            'general_scheme': '📋 योजना'
        };
        return map[intent] || intent;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white font-sans">

            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={`fixed top-0 left-0 h-full w-72 bg-slate-900/95 backdrop-blur-xl border-r border-white/10 z-50 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
                <div className="p-6 border-b border-white/10 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-xl shadow-lg">
                                🏛️
                            </div>
                            <div>
                                <h1 className="font-bold text-lg">DailyDhandora</h1>
                                <p className="text-xs text-slate-400">Intelligence Hub</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                            aria-label="Close menu"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <nav className="p-4 space-y-2 flex-1 overflow-y-auto dark-scrollbar">
                    <p className="px-4 text-xs text-slate-500 uppercase tracking-wider mb-2">Navigation</p>

                    <Link
                        href="/admin/dashboard?view=content"
                        onClick={() => setSidebarOpen(false)}
                        className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all"
                    >
                        <LayoutDashboard size={20} />
                        Content
                    </Link>

                    <Link
                        href="/admin/dashboard?view=ai-settings"
                        onClick={() => setSidebarOpen(false)}
                        className="flex items-center gap-3 px-4 py-3.5 hover:bg-purple-500/10 rounded-xl text-slate-400 hover:text-purple-400 transition-all"
                    >
                        <span className="text-lg">🧠</span>
                        <span>AI Brain</span>
                    </Link>

                    <Link
                        href="/admin/analytics"
                        onClick={() => setSidebarOpen(false)}
                        className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all"
                    >
                        <BarChart3 size={20} />
                        Analytics
                    </Link>

                    <Link href="/admin/intelligence" className="flex items-center gap-3 px-4 py-3.5 bg-emerald-500/10 rounded-xl text-emerald-400 font-medium border border-emerald-500/20">
                        <span className="text-lg">🏛️</span>
                        <span>Business Intel</span>
                    </Link>
                </nav>

                <div className="p-4 border-t border-white/10 shrink-0">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all font-medium active:scale-[0.98]"
                        aria-label="Logout"
                    >
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
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                aria-label="Open menu"
                            >
                                <Menu size={24} />
                            </button>
                            <div>
                                <h2 className="text-lg font-semibold flex items-center gap-2">
                                    🏛️ Business Intelligence
                                </h2>
                                <p className="text-xs text-slate-400 hidden sm:block">Data Empire Dashboard (Supreme Edition)</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleDownloadReport}
                                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all text-sm border border-white/10"
                            >
                                <Download size={16} />
                                Export Report
                            </button>

                            <button
                                onClick={fetchData}
                                disabled={refreshing}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-all text-sm disabled:opacity-50 border border-emerald-500/20"
                            >
                                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                                Refresh
                            </button>
                        </div>
                    </div>
                </header>

                <div className="p-6 max-w-7xl mx-auto">
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
                            {[1, 2, 3, 4].map(i => <div key={i} className="h-36 bg-slate-800/50 rounded-2xl" />)}
                        </div>
                    ) : (
                        <>
                            {/* Traffic Stats */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                <div className="bg-gradient-to-br from-blue-500/10 to-indigo-600/5 border border-blue-500/20 rounded-2xl p-5">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                            <Users size={20} className="text-blue-400" />
                                        </div>
                                    </div>
                                    <p className="text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">Today's Sessions</p>
                                    <p className="text-3xl font-bold">{data?.traffic?.today?.sessions?.toLocaleString() || 0}</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Week: {data?.traffic?.weekly?.sessions?.toLocaleString() || 0}
                                    </p>
                                </div>

                                <div className="bg-gradient-to-br from-green-500/10 to-emerald-600/5 border border-green-500/20 rounded-2xl p-5">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                                            <ArrowUpRight size={20} className="text-green-400" />
                                        </div>
                                    </div>
                                    <p className="text-green-400 text-xs font-semibold uppercase tracking-wider mb-1">New Users</p>
                                    <p className="text-3xl font-bold">{data?.traffic?.today?.new_users?.toLocaleString() || 0}</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Returning: {data?.traffic?.today?.returning || 0}
                                    </p>
                                </div>

                                <div className="bg-gradient-to-br from-purple-500/10 to-violet-600/5 border border-purple-500/20 rounded-2xl p-5">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                                            <Clock size={20} className="text-purple-400" />
                                        </div>
                                    </div>
                                    <p className="text-purple-400 text-xs font-semibold uppercase tracking-wider mb-1">Avg Time</p>
                                    <p className="text-3xl font-bold">{data?.traffic?.today?.avgTimeSpent || 0}s</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Bounce: {data?.traffic?.today?.bounces || 0}
                                    </p>
                                </div>

                                <div className="bg-gradient-to-br from-orange-500/10 to-red-600/5 border border-orange-500/20 rounded-2xl p-5">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
                                            <Flame size={20} className="text-orange-400" />
                                        </div>
                                    </div>
                                    <p className="text-orange-400 text-xs font-semibold uppercase tracking-wider mb-1">Weekly Intel</p>
                                    <p className="text-3xl font-bold">{(
                                        (data?.mandi?.totalViews || 0) +
                                        (data?.career?.totalViews || 0) +
                                        (data?.scheme?.totalViews || 0)
                                    ).toLocaleString()}</p>
                                    <p className="text-xs text-slate-500 mt-1">Category views tracked</p>
                                </div>
                            </div>

                            {/* 📈 Charts Section (Supreme Upgrade) */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                                {/* Main Traffic Chart */}
                                <div className="lg:col-span-2 bg-slate-800/30 border border-slate-700/50 rounded-2xl p-5 h-[350px] flex flex-col">
                                    <div className="flex items-center justify-between mb-4 shrink-0">
                                        <h3 className="flex items-center gap-2 font-bold text-lg">
                                            <TrendingUp size={20} className="text-blue-400" />
                                            Traffic Trends
                                        </h3>
                                        <select className="bg-slate-900 border border-slate-700 rounded-lg text-xs px-2 py-1 outline-none">
                                            <option>Last 7 Days</option>
                                        </select>
                                    </div>
                                    <div className="flex-1 w-full min-h-0 relative">
                                        {mounted ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={data?.dailyTrend || []}>
                                                    <defs>
                                                        <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                        </linearGradient>
                                                        <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} />
                                                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                                                        itemStyle={{ color: '#e2e8f0' }}
                                                    />
                                                    <Area type="monotone" dataKey="sessions" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSessions)" name="Sessions" />
                                                    <Area type="monotone" dataKey="new_users" stroke="#10b981" fillOpacity={1} fill="url(#colorNew)" name="New Users" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                                                Loading Chart...
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Category Distribution Pie */}
                                <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-5 h-[350px] flex flex-col">
                                    <div className="flex items-center justify-between mb-4 shrink-0">
                                        <h3 className="flex items-center gap-2 font-bold text-lg">
                                            <PieIcon size={20} className="text-purple-400" />
                                            Category Split
                                        </h3>
                                    </div>
                                    <div className="flex-1 w-full min-h-0 relative">
                                        {mounted ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={categoryData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={80}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                    >
                                                        {categoryData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                                                        itemStyle={{ color: '#e2e8f0' }}
                                                    />
                                                    <Legend verticalAlign="bottom" height={36} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                                                Loading Chart...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Intelligence Cards Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

                                {/* 🌾 Mandi Intelligence */}
                                <div className="bg-slate-800/30 border border-amber-500/20 rounded-2xl overflow-hidden">
                                    <div className="p-5 border-b border-white/5 bg-amber-500/5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                                                <Wheat size={20} className="text-amber-400" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white">🌾 Mandi Intelligence</h3>
                                                <p className="text-xs text-slate-400">Crop demand tracking</p>
                                            </div>
                                            <span className="ml-auto bg-amber-500/20 text-amber-400 text-xs px-2 py-1 rounded-full font-bold">
                                                {data?.mandi?.totalViews || 0} views
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-5">
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Top Demanded Crops</p>
                                        {data?.mandi?.topCrops?.length > 0 ? (
                                            <div className="space-y-3">
                                                {data.mandi.topCrops.map((crop, i) => (
                                                    <div key={crop.name} className="flex items-center gap-3">
                                                        <span className="w-6 h-6 bg-amber-500/20 rounded-full flex items-center justify-center text-xs font-bold text-amber-400">
                                                            {i + 1}
                                                        </span>
                                                        <span className="flex-1 font-medium text-white capitalize">{crop.name}</span>

                                                        {/* Mini Bar */}
                                                        <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-amber-500"
                                                                style={{ width: `${Math.min(100, (crop.views / (data.mandi.topCrops[0].views || 1)) * 100)}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-amber-400 font-mono text-sm w-8 text-right">{crop.views}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-slate-500 text-center py-4">No data yet</p>
                                        )}
                                    </div>
                                </div>

                                {/* 🎓 Career Intelligence */}
                                <div className="bg-slate-800/30 border border-blue-500/20 rounded-2xl overflow-hidden">
                                    <div className="p-5 border-b border-white/5 bg-blue-500/5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                                <GraduationCap size={20} className="text-blue-400" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white">🎓 Career Intelligence</h3>
                                                <p className="text-xs text-slate-400">Exam & job tracking</p>
                                            </div>
                                            <span className="ml-auto bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded-full font-bold">
                                                {data?.career?.totalViews || 0} views
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-5">
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Trending Exams</p>
                                        {data?.career?.topExams?.length > 0 ? (
                                            <div className="space-y-3">
                                                {data.career.topExams.map((exam, i) => (
                                                    <div key={exam.name} className="flex items-center gap-3">
                                                        <span className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-xs font-bold text-blue-400">
                                                            {i + 1}
                                                        </span>
                                                        <span className="flex-1 font-medium text-white capitalize">{exam.name}</span>
                                                        <span className="text-blue-400 font-mono text-sm">{exam.views}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-slate-500 text-center py-4">No data yet</p>
                                        )}

                                        {/* User Stages */}
                                        {data?.career?.stages && Object.keys(data.career.stages).length > 0 && (
                                            <>
                                                <p className="text-xs text-slate-500 uppercase tracking-wider mt-5 mb-3">User Stages</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {Object.entries(data.career.stages).map(([stage, count]) => (
                                                        <span key={stage} className="bg-blue-500/10 text-blue-300 text-xs px-3 py-1 rounded-full border border-blue-500/20">
                                                            {formatStage(stage)} <span className="text-blue-200 font-bold ml-1">{count}</span>
                                                        </span>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* 🏛️ Scheme Intelligence */}
                                <div className="bg-slate-800/30 border border-green-500/20 rounded-2xl overflow-hidden">
                                    <div className="p-5 border-b border-white/5 bg-green-500/5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                                                <Building2 size={20} className="text-green-400" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white">🏛️ Scheme Intelligence</h3>
                                                <p className="text-xs text-slate-400">Financial intent tracking</p>
                                            </div>
                                            <span className="ml-auto bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full font-bold">
                                                {data?.scheme?.totalViews || 0} views
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-5">
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">User Intents</p>
                                        {data?.scheme?.topIntents?.length > 0 ? (
                                            <div className="space-y-3">
                                                {data.scheme.topIntents.map((intent, i) => (
                                                    <div key={intent.name} className="flex items-center gap-3">
                                                        <span className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center text-xs font-bold text-green-400">
                                                            {i + 1}
                                                        </span>
                                                        <span className="flex-1 font-medium text-white">{formatIntent(intent.name)}</span>
                                                        <span className="text-green-400 font-mono text-sm">{intent.count}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-slate-500 text-center py-4">No data yet</p>
                                        )}
                                    </div>
                                </div>

                            </div>

                            {/* Data Empire Info */}
                            <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-6">
                                <div className="flex items-start gap-4">
                                    <div className="text-4xl animate-pulse">🏛️</div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-2">Data Empire Status: Active</h3>
                                        <p className="text-slate-400 text-sm">
                                            Your invisible intelligence system is now tracking user behavior patterns.
                                            No personal data is collected - only aggregated trends for business insights.
                                        </p>
                                        <div className="flex flex-wrap gap-4 mt-4 text-xs">
                                            <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20">✅ Fingerprinting Active</span>
                                            <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20">✅ Category Intel Active</span>
                                            <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20">✅ Intent Detection Active</span>
                                            <span className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full border border-purple-500/20">✅ Auto-Targeting Live</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
