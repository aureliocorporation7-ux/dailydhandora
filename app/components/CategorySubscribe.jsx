'use client';

import { useState, useEffect } from 'react';
import { Bell, Check, Loader2 } from 'lucide-react';
import {
    isNotificationSupported,
    getNotificationPermission
} from '@/lib/fcm';

const CATEGORIES = [
    { id: 'मंडी भाव', label: 'मंडी भाव', emoji: '🌾', color: 'from-green-500 to-emerald-600' },
    { id: 'नागौर न्यूज़', label: 'नागौर न्यूज़', emoji: '📰', color: 'from-blue-500 to-indigo-600' },
    { id: 'शिक्षा विभाग', label: 'शिक्षा विभाग', emoji: '📚', color: 'from-purple-500 to-violet-600' },
    { id: 'सरकारी योजना', label: 'सरकारी योजना', emoji: '🏛️', color: 'from-orange-500 to-red-500' },
    { id: 'भर्ती व रिजल्ट', label: 'भर्ती व रिजल्ट', emoji: '🎓', color: 'from-pink-500 to-rose-600' },
];

/**
 * 🔔 Category Subscription Component
 * 
 * Allows users to select which categories they want notifications for.
 * Saves preferences to localStorage and syncs with Firestore via API.
 */
export default function CategorySubscribe() {
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [pushEnabled, setPushEnabled] = useState(false);

    // Load saved preferences on mount
    useEffect(() => {
        // Check if push is enabled
        if (isNotificationSupported()) {
            setPushEnabled(getNotificationPermission() === 'granted');
        }

        // Load from localStorage
        const saved = localStorage.getItem('subscribedCategories');
        if (saved) {
            try {
                setSelectedCategories(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse saved categories');
            }
        }
    }, []);

    // Toggle category selection
    const toggleCategory = (categoryId) => {
        setSelectedCategories(prev => {
            const newSelection = prev.includes(categoryId)
                ? prev.filter(c => c !== categoryId)
                : [...prev, categoryId];

            // Save to localStorage immediately
            localStorage.setItem('subscribedCategories', JSON.stringify(newSelection));

            return newSelection;
        });
        setIsSaved(false);
    };

    // Sync with server
    const saveToServer = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('fcmToken');
            if (!token) {
                console.log('No FCM token found, saving locally only');
                setIsSaved(true);
                return;
            }

            const response = await fetch('/api/notifications/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    categories: selectedCategories,
                    platform: 'web',
                    userAgent: navigator.userAgent
                })
            });

            if (response.ok) {
                setIsSaved(true);
                setTimeout(() => setIsSaved(false), 3000);
            }
        } catch (error) {
            console.error('Failed to sync categories:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Select All / Deselect All
    const selectAll = () => {
        const allIds = CATEGORIES.map(c => c.id);
        setSelectedCategories(allIds);
        localStorage.setItem('subscribedCategories', JSON.stringify(allIds));
        setIsSaved(false);
    };

    const deselectAll = () => {
        setSelectedCategories([]);
        localStorage.setItem('subscribedCategories', JSON.stringify([]));
        setIsSaved(false);
    };

    return (
        <section className="bg-neutral-900/50 rounded-2xl p-6 border border-neutral-800">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-orange-500" />
                    <h3 className="text-lg font-bold text-white">Category Alerts</h3>
                </div>
                {!pushEnabled && (
                    <span className="text-xs text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded-full">
                        🔔 पहले Notification Enable करें
                    </span>
                )}
            </div>

            <p className="text-gray-400 text-sm mb-4">
                जिन खबरों की Notification चाहिए, वो Select करें:
            </p>

            {/* Category Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {CATEGORIES.map((category) => {
                    const isSelected = selectedCategories.includes(category.id);
                    return (
                        <button
                            key={category.id}
                            onClick={() => toggleCategory(category.id)}
                            className={`relative flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${isSelected
                                    ? `bg-gradient-to-r ${category.color} border-transparent text-white shadow-lg`
                                    : 'bg-neutral-800/50 border-neutral-700 text-gray-300 hover:border-neutral-600'
                                }`}
                        >
                            <span className="text-xl">{category.emoji}</span>
                            <span className="text-sm font-medium truncate">{category.label}</span>
                            {isSelected && (
                                <Check className="w-4 h-4 absolute top-1 right-1" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
                <div className="flex gap-2">
                    <button
                        onClick={selectAll}
                        className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
                    >
                        सभी Select
                    </button>
                    <span className="text-neutral-600">|</span>
                    <button
                        onClick={deselectAll}
                        className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
                    >
                        सब हटाएं
                    </button>
                </div>

                <button
                    onClick={saveToServer}
                    disabled={isLoading || !pushEnabled}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isSaved
                            ? 'bg-green-500 text-white'
                            : pushEnabled
                                ? 'bg-orange-500 hover:bg-orange-600 text-white'
                                : 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
                        }`}
                >
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isSaved ? (
                        <>
                            <Check className="w-4 h-4" />
                            Saved!
                        </>
                    ) : (
                        'Save करें'
                    )}
                </button>
            </div>

            {/* Selected Count */}
            <p className="text-center text-xs text-gray-500 mt-3">
                {selectedCategories.length} / {CATEGORIES.length} categories selected
            </p>
        </section>
    );
}
