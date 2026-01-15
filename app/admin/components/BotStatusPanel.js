'use client';

import { useState, useEffect } from 'react';
import { Bot, Clock, CheckCircle, XCircle, Loader2, RefreshCw, Zap } from 'lucide-react';

const BOTS = [
    { id: 'news', name: 'News Bot', icon: '📰', color: 'blue' },
    { id: 'mandi', name: 'Mandi Bot', icon: '🌾', color: 'yellow' },
    { id: 'edu', name: 'Edu Bot', icon: '🎓', color: 'purple' },
    { id: 'scheme', name: 'Scheme Bot', icon: '📜', color: 'green' },
];

const colorMap = {
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', glow: 'shadow-blue-500/20' },
    yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', glow: 'shadow-yellow-500/20' },
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', glow: 'shadow-purple-500/20' },
    green: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', glow: 'shadow-green-500/20' },
};

export default function BotStatusPanel({ onForceRun }) {
    const [status, setStatus] = useState({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchStatus = async () => {
        setRefreshing(true);
        try {
            const res = await fetch('/api/admin/bot-status');
            const data = await res.json();
            setStatus(data || {});
        } catch (err) {
            console.error('Failed to fetch bot status', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        // Auto-refresh every 60 seconds
        const interval = setInterval(fetchStatus, 60000);
        return () => clearInterval(interval);
    }, []);

    const getTimeAgo = (timestamp) => {
        if (!timestamp) return 'Never';
        const diff = Date.now() - new Date(timestamp).getTime();
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(mins / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (mins > 0) return `${mins}m ago`;
        return 'Just now';
    };

    const isRecent = (timestamp) => {
        if (!timestamp) return false;
        const diff = Date.now() - new Date(timestamp).getTime();
        return diff < 3600000; // Within 1 hour
    };

    if (loading) {
        return (
            <div className="bg-slate-800/30 border border-white/5 rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-3 h-3 bg-slate-600 rounded-full animate-pulse" />
                    <h3 className="text-slate-400 font-medium">Loading Bot Status...</h3>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-24 bg-slate-700/30 rounded-xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-800/30 border border-white/5 rounded-2xl p-6 mb-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-3 h-3 bg-green-500 rounded-full" />
                        <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping opacity-75" />
                    </div>
                    <h3 className="font-bold text-white">Bot Status</h3>
                    <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-full">LIVE</span>
                </div>
                <button
                    onClick={fetchStatus}
                    disabled={refreshing}
                    className="p-2 hover:bg-white/5 rounded-lg transition-all text-slate-400 hover:text-white"
                >
                    <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Bot Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {BOTS.map(bot => {
                    const botStatus = status[bot.id] || {};
                    const colors = colorMap[bot.color];
                    const lastRun = botStatus.lastRun;
                    const articlesGenerated = botStatus.articlesGenerated || 0;
                    const isSuccess = botStatus.status === 'success';
                    const hasError = botStatus.status === 'error';
                    const recent = isRecent(lastRun);

                    return (
                        <div
                            key={bot.id}
                            className={`relative ${colors.bg} ${colors.border} border rounded-xl p-4 transition-all hover:shadow-lg ${colors.glow} group`}
                        >
                            {/* Status Indicator */}
                            <div className="absolute top-3 right-3">
                                {recent && isSuccess && (
                                    <div className="flex items-center gap-1">
                                        <CheckCircle size={14} className="text-green-400" />
                                    </div>
                                )}
                                {hasError && (
                                    <XCircle size={14} className="text-red-400" />
                                )}
                                {!recent && !hasError && (
                                    <Clock size={14} className="text-slate-500" />
                                )}
                            </div>

                            {/* Bot Icon */}
                            <div className="text-2xl mb-2">{bot.icon}</div>

                            {/* Bot Name */}
                            <h4 className={`font-bold text-sm ${colors.text}`}>{bot.name}</h4>

                            {/* Last Run */}
                            <p className="text-xs text-slate-500 mt-1">
                                {getTimeAgo(lastRun)}
                            </p>

                            {/* Articles Count */}
                            {articlesGenerated > 0 && (
                                <div className="mt-2 flex items-center gap-1">
                                    <Zap size={12} className={colors.text} />
                                    <span className={`text-xs font-bold ${colors.text}`}>
                                        {articlesGenerated} new
                                    </span>
                                </div>
                            )}

                            {/* Error Message */}
                            {hasError && botStatus.error && (
                                <p className="text-[10px] text-red-400 mt-1 line-clamp-1">
                                    {botStatus.error}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
