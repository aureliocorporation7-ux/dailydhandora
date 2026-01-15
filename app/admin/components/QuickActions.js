'use client';

import { useState } from 'react';
import {
    Rocket,
    Mic,
    Trash2,
    RefreshCw,
    Loader2,
    ChevronUp,
    ChevronDown,
    Zap
} from 'lucide-react';

export default function QuickActions({ onRefresh }) {
    const [expanded, setExpanded] = useState(true);
    const [loading, setLoading] = useState({});
    const [results, setResults] = useState({});

    const executeAction = async (action, label) => {
        if (!confirm(`Execute "${label}"? This action cannot be undone.`)) return;

        setLoading(prev => ({ ...prev, [action]: true }));
        setResults(prev => ({ ...prev, [action]: null }));

        try {
            const res = await fetch('/api/admin/quick-actions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action }),
            });
            const data = await res.json();

            if (res.ok) {
                setResults(prev => ({ ...prev, [action]: { success: true, message: data.message } }));
                if (onRefresh) onRefresh();
            } else {
                setResults(prev => ({ ...prev, [action]: { success: false, message: data.error } }));
            }
        } catch (err) {
            setResults(prev => ({ ...prev, [action]: { success: false, message: 'Connection error' } }));
        } finally {
            setLoading(prev => ({ ...prev, [action]: false }));
            // Clear result after 5 seconds
            setTimeout(() => {
                setResults(prev => ({ ...prev, [action]: null }));
            }, 5000);
        }
    };

    const actions = [
        {
            id: 'publish-all',
            label: 'Publish All Drafts',
            icon: Rocket,
            color: 'green',
            description: 'Instantly publish all draft articles'
        },
        {
            id: 'generate-audio',
            label: 'Generate Missing Audio',
            icon: Mic,
            color: 'purple',
            description: 'Create audio for articles without TTS'
        },
        {
            id: 'clear-old-drafts',
            label: 'Clear Old Drafts (7d+)',
            icon: Trash2,
            color: 'red',
            description: 'Delete drafts older than 7 days'
        },
        {
            id: 'force-bot-run',
            label: 'Force Bot Cycle',
            icon: RefreshCw,
            color: 'blue',
            description: 'Trigger immediate bot execution'
        },
    ];

    const colorClasses = {
        green: 'bg-green-500/10 hover:bg-green-500/20 border-green-500/30 text-green-400',
        purple: 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30 text-purple-400',
        red: 'bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-400',
        blue: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30 text-blue-400',
    };

    return (
        <div className="bg-slate-800/30 border border-white/5 rounded-2xl overflow-hidden mb-6">
            {/* Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-all"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                        <Zap size={16} className="text-white" />
                    </div>
                    <div className="text-left">
                        <h3 className="font-bold text-white text-sm">Quick Actions</h3>
                        <p className="text-xs text-slate-500">One-click batch operations</p>
                    </div>
                </div>
                {expanded ? (
                    <ChevronUp size={20} className="text-slate-400" />
                ) : (
                    <ChevronDown size={20} className="text-slate-400" />
                )}
            </button>

            {/* Actions Grid */}
            {expanded && (
                <div className="p-4 pt-0 grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {actions.map(action => {
                        const Icon = action.icon;
                        const isLoading = loading[action.id];
                        const result = results[action.id];

                        return (
                            <div key={action.id} className="relative">
                                <button
                                    onClick={() => executeAction(action.id, action.label)}
                                    disabled={isLoading}
                                    className={`w-full flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${colorClasses[action.color]} disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    {isLoading ? (
                                        <Loader2 size={20} className="animate-spin" />
                                    ) : (
                                        <Icon size={20} />
                                    )}
                                    <span className="text-xs font-bold text-center leading-tight">
                                        {action.label}
                                    </span>
                                </button>

                                {/* Result Toast */}
                                {result && (
                                    <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-full z-10 px-3 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap ${result.success ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                                        }`}>
                                        {result.message}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
