'use client';

import { useState, useEffect } from 'react';
import { Activity, RefreshCw, Bot, User, Zap, Trash2, Mic, Rocket, AlertCircle } from 'lucide-react';

const iconMap = {
    bot_scrape: Bot,
    bot_process: Zap,
    admin_publish: Rocket,
    admin_delete: Trash2,
    audio_generated: Mic,
    system_error: AlertCircle,
    default: Activity,
};

const colorMap = {
    bot_scrape: 'text-blue-400 bg-blue-500/10',
    bot_process: 'text-purple-400 bg-purple-500/10',
    admin_publish: 'text-green-400 bg-green-500/10',
    admin_delete: 'text-red-400 bg-red-500/10',
    audio_generated: 'text-pink-400 bg-pink-500/10',
    system_error: 'text-orange-400 bg-orange-500/10',
    default: 'text-slate-400 bg-slate-500/10',
};

export default function ActivityFeed() {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchActivities = async () => {
        setRefreshing(true);
        try {
            const res = await fetch('/api/admin/activity-log');
            const data = await res.json();
            setActivities(data.activities || []);
        } catch (err) {
            console.error('Failed to fetch activities', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchActivities();
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchActivities, 30000);
        return () => clearInterval(interval);
    }, []);

    const getTimeAgo = (timestamp) => {
        if (!timestamp) return '';
        const diff = Date.now() - new Date(timestamp).getTime();
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(mins / 60);

        if (hours > 0) return `${hours}h ago`;
        if (mins > 0) return `${mins}m ago`;
        return 'Just now';
    };

    if (loading) {
        return (
            <div className="bg-slate-800/30 border border-white/5 rounded-2xl p-4 h-80">
                <div className="flex items-center gap-2 mb-4">
                    <Activity size={16} className="text-slate-500" />
                    <span className="text-slate-500 text-sm">Loading activity...</span>
                </div>
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-12 bg-slate-700/30 rounded-lg animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-800/30 border border-white/5 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Activity size={16} className="text-green-400" />
                        <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    </div>
                    <h3 className="font-bold text-white text-sm">Activity Feed</h3>
                </div>
                <button
                    onClick={fetchActivities}
                    disabled={refreshing}
                    className="p-1.5 hover:bg-white/5 rounded-lg transition-all text-slate-400 hover:text-white"
                >
                    <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Activity List */}
            <div className="max-h-80 overflow-y-auto">
                {activities.length === 0 ? (
                    <div className="p-8 text-center">
                        <Activity size={32} className="mx-auto text-slate-600 mb-2" />
                        <p className="text-slate-500 text-sm">No recent activity</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {activities.map((activity, index) => {
                            const Icon = iconMap[activity.type] || iconMap.default;
                            const colors = colorMap[activity.type] || colorMap.default;

                            return (
                                <div
                                    key={activity.id || index}
                                    className="flex items-start gap-3 p-3 hover:bg-white/5 transition-all"
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colors}`}>
                                        <Icon size={14} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white/90 leading-tight line-clamp-2">
                                            {activity.message}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {getTimeAgo(activity.timestamp)}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-white/5 text-center">
                <span className="text-[10px] text-slate-600">Auto-refreshes every 30s</span>
            </div>
        </div>
    );
}
