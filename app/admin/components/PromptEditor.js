'use client';

import { useState, useEffect } from 'react';
import { Save, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

const TABS = [
    { id: 'PROMPT_SYSTEM_NEWS', label: '🤖 Persona (System)', desc: 'The core personality and strict rules (No Source Mention, etc).' },
    { id: 'PROMPT_USER_NEWS', label: '📰 News Task', desc: 'The template for processing a single news article.' },
    { id: 'PROMPT_USER_MANDI', label: '🌾 Mandi Task', desc: 'The template for extracting Mandi rates.' },
];

export default function PromptEditor() {
    const [prompts, setPrompts] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState(TABS[0].id);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchPrompts();
    }, []);

    const fetchPrompts = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/prompts');
            const data = await res.json();
            setPrompts(data || {});
        } catch (err) {
            console.error('Failed to load prompts', err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (val) => {
        setPrompts(prev => ({ ...prev, [activeTab]: val }));
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage('');
        try {
            const res = await fetch('/api/admin/prompts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(prompts),
            });
            if (res.ok) {
                setMessage('✅ Saved Successfully!');
                setTimeout(() => setMessage(''), 3000);
            } else {
                setMessage('❌ Save Failed');
            }
        } catch (err) {
            setMessage('❌ Error Saving');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-10 text-center text-slate-500 animate-pulse">Loading Brain Configuration...</div>;

    return (
        <div className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            {/* Header */}
            <div className="p-6 border-b border-white/10 bg-slate-900/50">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <span className="text-2xl">🧠</span> AI Brain Settings
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                    Edit the prompts that drive the AI. Changes apply instantly to the next run.
                </p>
            </div>

            <div className="flex flex-col lg:flex-row min-h-[500px]">
                {/* Sidebar Tabs */}
                <div className="w-full lg:w-64 border-r border-white/10 bg-slate-950/30">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full text-left px-5 py-4 border-b border-white/5 transition-colors ${activeTab === tab.id
                                    ? 'bg-blue-600/10 text-blue-400 border-l-4 border-l-blue-500'
                                    : 'text-slate-400 hover:bg-white/5 hover:text-white border-l-4 border-l-transparent'
                                }`}
                        >
                            <div className="font-bold text-sm">{tab.label}</div>
                        </button>
                    ))}
                </div>

                {/* Editor Area */}
                <div className="flex-1 flex flex-col bg-slate-800/20">
                    {/* Tab Info */}
                    <div className="p-4 bg-black/20 border-b border-white/5 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-white text-sm">
                                Editing: {TABS.find(t => t.id === activeTab)?.label}
                            </h3>
                            <p className="text-xs text-slate-500">
                                {TABS.find(t => t.id === activeTab)?.desc}
                            </p>
                        </div>
                        {message && (
                            <div className={`text-xs font-bold px-3 py-1 rounded-full ${message.includes('✅') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {message}
                            </div>
                        )}
                    </div>

                    {/* Textarea */}
                    <div className="flex-1 p-0 relative">
                        <textarea
                            value={prompts[activeTab] || ''}
                            onChange={(e) => handleChange(e.target.value)}
                            className="w-full h-full min-h-[400px] bg-slate-900/50 text-slate-300 font-mono text-sm p-5 resize-none outline-none focus:bg-slate-900 focus:text-white transition-colors"
                            placeholder="// Enter prompt instructions here..."
                        />
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 border-t border-white/10 flex justify-end gap-3 bg-slate-900/50">
                        <button
                            onClick={fetchPrompts}
                            className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 text-sm font-semibold transition-all flex items-center gap-2"
                        >
                            <RefreshCw size={16} /> Revert
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-sm font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : <><Save size={16} /> Save Changes</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
