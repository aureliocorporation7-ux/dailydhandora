'use client';

import { useState, useEffect } from 'react';
import { Bell, X, Smartphone, Zap } from 'lucide-react';
import {
    isNotificationSupported,
    getNotificationPermission,
    subscribeToNotifications
} from '@/lib/fcm';

/**
 * 🔔 Push Notification Permission Prompt
 * 
 * Shows a beautiful modal to ask users to enable push notifications.
 * - Only shows once per session (or until dismissed)
 * - Respects 'denied' permission
 * - Auto-hides if already subscribed
 */
export default function PushNotificationPrompt() {
    const [isVisible, setIsVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState('idle'); // idle, loading, success, error

    useEffect(() => {
        // Check if we should show the prompt
        const checkPermission = async () => {
            // Don't show on server
            if (typeof window === 'undefined') return;

            // Check if notifications are supported
            if (!isNotificationSupported()) {
                console.log('🔔 Prompt: Notifications not supported');
                return;
            }

            // Check current permission
            const permission = getNotificationPermission();

            // Don't show if already granted or denied
            if (permission === 'granted' || permission === 'denied') {
                console.log('🔔 Prompt: Permission already', permission);
                return;
            }

            // Check if user dismissed previously (session storage)
            const dismissed = sessionStorage.getItem('pushPromptDismissed');
            if (dismissed) {
                console.log('🔔 Prompt: Dismissed this session');
                return;
            }

            // Show prompt after a delay (better UX)
            setTimeout(() => {
                setIsVisible(true);
            }, 3000); // Show after 3 seconds
        };

        checkPermission();
    }, []);

    const handleEnable = async () => {
        setIsLoading(true);
        setStatus('loading');

        try {
            const result = await subscribeToNotifications();

            if (result.success) {
                setStatus('success');
                setTimeout(() => setIsVisible(false), 2000);
            } else {
                setStatus('error');
                console.error('🔔 Prompt: Subscription failed:', result.error);
            }
        } catch (error) {
            setStatus('error');
            console.error('🔔 Prompt: Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDismiss = () => {
        sessionStorage.setItem('pushPromptDismissed', 'true');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-4 duration-300">

                {/* Header with gradient */}
                <div className="bg-gradient-to-r from-primary to-orange-600 p-6 text-center relative">
                    <button
                        onClick={handleDismiss}
                        className="absolute top-3 right-3 p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="w-16 h-16 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-4">
                        <Bell className="w-8 h-8 text-white" />
                    </div>

                    <h2 className="text-xl font-bold text-white mb-1">
                        🔔 नोटिफिकेशन On करें!
                    </h2>
                    <p className="text-white/80 text-sm">
                        ताज़ा खबरें सबसे पहले पाएं
                    </p>
                </div>

                {/* Content */}
                <div className="p-6">
                    {status === 'success' ? (
                        <div className="text-center py-4">
                            <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                                <Zap className="w-8 h-8 text-green-500" />
                            </div>
                            <p className="text-green-400 font-bold text-lg">✅ नोटिफिकेशन On हो गई!</p>
                            <p className="text-gray-400 text-sm mt-2">अब आपको ताज़ा खबरें मिलती रहेंगी।</p>
                        </div>
                    ) : status === 'error' ? (
                        <div className="text-center py-4">
                            <p className="text-red-400 font-bold">❌ कुछ गड़बड़ हो गई</p>
                            <p className="text-gray-400 text-sm mt-2">बाद में फिर कोशिश करें।</p>
                            <button
                                onClick={handleDismiss}
                                className="mt-4 px-6 py-2 bg-neutral-700 text-white rounded-full text-sm"
                            >
                                बंद करें
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Benefits List */}
                            <ul className="space-y-3 mb-6">
                                <li className="flex items-center gap-3 text-gray-300">
                                    <span className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                                        📰
                                    </span>
                                    <span className="text-sm">नागौर की Breaking News तुरंत</span>
                                </li>
                                <li className="flex items-center gap-3 text-gray-300">
                                    <span className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                                        🌾
                                    </span>
                                    <span className="text-sm">मंडी भाव अपडेट्स सबसे पहले</span>
                                </li>
                                <li className="flex items-center gap-3 text-gray-300">
                                    <span className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                                        🏛️
                                    </span>
                                    <span className="text-sm">सरकारी योजनाओं की जानकारी</span>
                                </li>
                            </ul>

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleEnable}
                                    disabled={isLoading}
                                    className="w-full py-3 px-6 bg-gradient-to-r from-primary to-orange-600 text-white font-bold rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isLoading ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <Bell className="w-5 h-5" />
                                            नोटिफिकेशन Enable करें
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={handleDismiss}
                                    className="w-full py-2 text-gray-400 hover:text-white text-sm transition-colors"
                                >
                                    बाद में
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer Note */}
                <div className="px-6 pb-4">
                    <p className="text-[10px] text-gray-500 text-center">
                        <Smartphone className="w-3 h-3 inline mr-1" />
                        आप कभी भी Settings से बंद कर सकते हैं
                    </p>
                </div>
            </div>
        </div>
    );
}
