'use client';

import { useState, useEffect } from 'react';
import { DollarSign, Save, ToggleLeft, ToggleRight } from 'lucide-react';

/**
 * 💰 Google Ads Settings Component
 * Allows admins to configure AdSense ID from the dashboard
 */
export default function GoogleAdsSettings() {
    const [adsId, setAdsId] = useState('');
    const [enabled, setEnabled] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/admin/settings');
            const data = await res.json();
            setAdsId(data.googleAdsId || '');
            setEnabled(data.googleAdsEnabled || false);
        } catch (err) {
            console.error('Failed to fetch ads settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage('');
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ googleAdsId: adsId, googleAdsEnabled: enabled })
            });
            if (res.ok) {
                setMessage('✅ Saved successfully!');
                setTimeout(() => setMessage(''), 3000);
            } else {
                setMessage('❌ Save failed');
            }
        } catch (err) {
            setMessage('❌ Error saving');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="animate-pulse h-32 bg-white/5 rounded-xl" />;
    }

    return (
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <DollarSign className="text-green-400" size={20} />
                Google AdSense Settings
            </h3>

            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between mb-4 p-3 bg-white/5 rounded-xl">
                <span className="text-slate-300">Enable Ads</span>
                <button
                    onClick={() => setEnabled(!enabled)}
                    className="transition-colors"
                >
                    {enabled ? (
                        <ToggleRight className="text-green-400" size={32} />
                    ) : (
                        <ToggleLeft className="text-slate-500" size={32} />
                    )}
                </button>
            </div>

            {/* AdSense Publisher ID Input */}
            <div className="mb-4">
                <label className="block text-sm text-slate-400 mb-2">
                    Publisher ID (e.g., ca-pub-1234567890)
                </label>
                <input
                    type="text"
                    value={adsId}
                    onChange={(e) => setAdsId(e.target.value)}
                    placeholder="ca-pub-XXXXXXXXXXXXXXXX"
                    className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50"
                />
            </div>

            {/* Save Button */}
            <button
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white font-medium rounded-xl transition-colors"
            >
                <Save size={18} />
                {saving ? 'Saving...' : 'Save Settings'}
            </button>

            {/* Status Message */}
            {message && (
                <p className={`mt-3 text-sm text-center ${message.includes('✅') ? 'text-green-400' : 'text-red-400'}`}>
                    {message}
                </p>
            )}

            {/* Info */}
            <p className="mt-4 text-xs text-slate-500 text-center">
                Enable ads only after AdSense approval
            </p>
        </div>
    );
}
