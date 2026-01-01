'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
            <div>
                <Link href="/admin/dashboard" className="text-gray-400 hover:text-white mb-2 inline-block text-sm">← Back to Dashboard</Link>
                <h1 className="text-3xl font-bold">Analytics & Insights 📊</h1>
                <p className="text-gray-400 text-sm mt-1">Real-time performance of DailyDhandora news.</p>
            </div>
            <button onClick={() => window.location.reload()} className="bg-neutral-800 hover:bg-neutral-700 px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                Refresh Data 🔄
            </button>
        </div>

        {loading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
                {[1,2,3,4].map(i => <div key={i} className="h-32 bg-white/5 rounded-xl"></div>)}
             </div>
        ) : (
            <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/10 border border-blue-500/20 p-6 rounded-xl">
                        <h3 className="text-blue-400 text-sm font-bold uppercase tracking-wider mb-2">Total Articles</h3>
                        <p className="text-4xl font-bold">{data?.totalArticles?.toLocaleString()}</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/10 border border-purple-500/20 p-6 rounded-xl">
                        <h3 className="text-purple-400 text-sm font-bold uppercase tracking-wider mb-2">Total Views (Top 20)</h3>
                        <p className="text-4xl font-bold">{data?.totalViews?.toLocaleString()}</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-900/40 to-green-800/10 border border-green-500/20 p-6 rounded-xl">
                        <h3 className="text-green-400 text-sm font-bold uppercase tracking-wider mb-2">Top Viral Story</h3>
                        <p className="text-lg font-bold line-clamp-2">{data?.topArticles?.[0]?.headline || "No data yet"}</p>
                        <p className="text-green-400 text-xs mt-1 font-mono">{data?.topArticles?.[0]?.views || 0} views</p>
                    </div>
                </div>

                {/* Viral News Table */}
                <div className="bg-[#0f0f0f] border border-white/5 rounded-xl overflow-hidden">
                    <div className="p-6 border-b border-white/5">
                        <h2 className="text-xl font-bold">🔥 Viral News (Top 20)</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="p-4">#</th>
                                    <th className="p-4">Headline</th>
                                    <th className="p-4">Category</th>
                                    <th className="p-4 text-right">Views</th>
                                    <th className="p-4 text-right">Published</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {data?.topArticles?.map((article, index) => (
                                    <tr key={article.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-4 text-gray-500 font-mono">{index + 1}</td>
                                        <td className="p-4 font-medium text-white/90 group-hover:text-blue-400">
                                            <Link href={`/article/${article.id}`} target="_blank">
                                                {article.headline}
                                            </Link>
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 bg-white/5 rounded text-xs text-gray-300 border border-white/5">
                                                {article.category}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right font-bold text-green-400 font-mono">
                                            {article.views.toLocaleString()}
                                        </td>
                                        <td className="p-4 text-right text-gray-500 text-xs">
                                            {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : 'N/A'}
                                        </td>
                                    </tr>
                                ))}
                                {(!data?.topArticles || data.topArticles.length === 0) && (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-gray-500">No views recorded yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </>
        )}
      </div>
    </div>
  );
}
