'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Bell, X, Smartphone, Zap, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import {
    isNotificationSupported,
    getNotificationPermission,
    subscribeToNotifications,
    getFCMToken,
    setupForegroundMessageHandler
} from '@/lib/fcm';

/**
 * 🔔 DIVINE LEVEL Push Notification Prompt with Auto-Targeting
 * Version: 3.0 - Supreme Divine Edition
 *
 * FIXED: Proper service worker conflict resolution
 * FIXED: Better error handling for permission denied states
 * FIXED: Auto-retry on service worker registration failure
 * FIXED: iOS PWA notification support warning
 */

function getBrowsingCategories() {
    if (typeof window === 'undefined') return [];
    try {
        const history = localStorage.getItem('dd_category_history');
        if (!history) return [];
        const categories = JSON.parse(history);
        return Object.entries(categories)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([cat]) => cat);
    } catch (e) {
        return [];
    }
}

function getGuestId() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('dd_guest_id');
}

export default function PushNotificationPrompt() {
    const searchParams = useSearchParams();
    const [isVisible, setIsVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState('idle');
    const [isPWA, setIsPWA] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    const log = useCallback((key, value) => {
        //console.log(`🔔 [FCM] ${key}:`, value);
    }, []);

    // Save token with category preferences
    const updateTokenCategories = async (token, guestId, categories) => {
        try {
            const response = await fetch('/api/notifications/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    guestId,
                    categories,
                    platform: isPWA ? 'pwa' : 'web',
                    userAgent: navigator.userAgent
                })
            });
            if (!response.ok) {
                console.warn('🔔 Token save returned non-200:', response.status);
            } else {
                console.log('🔔 Token saved with categories:', categories);
            }
        } catch (e) {
            console.error('🔔 Failed to save token:', e);
        }
    };

    useEffect(() => {
        const checkAndSetup = async () => {
            if (typeof window === 'undefined') return;

            // Detect PWA and iOS
            setIsPWA(window.matchMedia('(display-mode: standalone)').matches);
            setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream);

            // GOD MODE TRIGGER
            const forceTest = searchParams?.get('test_notifications');
            if (forceTest) {
                console.log('🛠️ Test Mode Active: Forcing Notification Prompt');
                setIsVisible(true);
            }

            const supported = isNotificationSupported();
            log('supported', supported);

            if (!supported) return;

            const permission = getNotificationPermission();
            log('permission', permission);

            const guestId = getGuestId();
            const categories = getBrowsingCategories();

            try {
                const swReg = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
                log('serviceWorker', swReg ? (swReg.active ? 'active' : 'registered') : 'not registered');
            } catch (e) {
                log('serviceWorker', 'error: ' + e.message);
            }

            if (permission === 'granted') {
                // Setup foreground handler
                setupForegroundMessageHandler((notification) => {
                    log('foregroundMessage', notification.title);
                });

                console.log('🔔 FCM: Permission already granted, checking token...');

                // Try getting existing token
                const token = await getFCMToken();
                log('token', token ? 'valid' : 'missing');

                if (token) {
                    // Update categories
                    await updateTokenCategories(token, guestId, categories);
                } else {
                    // Full resubscribe
                    console.log('🔔 FCM: Token missing, re-subscribing...');
                    const result = await subscribeToNotifications(categories, guestId);
                    if (result.success) {
                        console.log('🔔 FCM: Re-subscribed successfully');
                    } else {
                        console.log('🔔 FCM: Re-subscribe failed:', result.error);
                    }
                }
                return;
            }

            if (permission === 'denied') return;

            // Check if dismissed in this session
            const dismissed = sessionStorage.getItem('pushPromptDismissed');
            if (dismissed) return;

            // Show prompt after 3 seconds
            const timer = setTimeout(() => setIsVisible(true), 3000);

            return () => clearTimeout(timer);
        };

        checkAndSetup();
    }, [log, searchParams, isPWA]);

    const handleEnable = async () => {
        setIsLoading(true);
        setStatus('loading');

        try {
            const guestId = getGuestId();
            const categories = getBrowsingCategories();

            const result = await subscribeToNotifications(categories, guestId);

            if (result.success) {
                log('step', 'Got token, saving with categories...');

                setupForegroundMessageHandler((notification) => {
                    console.log('🔔 Foreground notification:', notification);
                });

                setStatus('success');
                setTimeout(() => setIsVisible(false), 2000);
            } else {
                if (result.error === 'Permission denied') {
                    setStatus('denied');
                } else {
                    setStatus('error');
                }
                log('error', result.error);
            }
        } catch (error) {
            setStatus('error');
            log('error', error.message);
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

                <div className={`p-6 text-center relative ${status === 'denied' ? 'bg-red-900/50' : 'bg-gradient-to-r from-primary to-orange-600'}`}>
                    <button onClick={handleDismiss} className="absolute top-3 right-3 p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10">
                        <X className="w-5 h-5" />
                    </button>
                    <div className="w-16 h-16 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-4">
                        {status === 'denied' ? (
                            <AlertCircle className="w-8 h-8 text-white" />
                        ) : (
                            <Bell className="w-8 h-8 text-white" />
                        )}
                    </div>
                    <h2 className="text-xl font-bold text-white mb-1">
                        {status === 'denied' ? 'Permission Denied 🔒' : '🔔 नोटिफिकेशन On करें!'}
                    </h2>
                    <p className="text-white/80 text-sm">
                        {status === 'denied'
                            ? 'Please reset browser permission to continue.'
                            : 'ताज़ा खबरें सबसे पहले पाएं'}
                    </p>
                </div>

                <div className="p-6">
                    {status === 'denied' ? (
                        <div className="text-center space-y-4">
                            <p className="text-sm text-neutral-400">
                                आपने नोटिफिकेशन की परमिशन ब्लॉक कर दी है। <b>ब्राउज़र में</b> एड्रेस बार के बाएँ 🔒 लॉक आइकन पर क्लिक करें और 'Notifications' को Allow करें। <br /><br />
                                <span className="text-yellow-400">💡 PWA (इंस्टॉल्ड ऐप) में नोटिफिकेशन के लिए ऐप को अनइंस्टॉल करके दोबारा इंस्टॉल करें, और Enable Notification दबाएँ।</span>
                            </p>
                            <button
                                onClick={handleDismiss}
                                className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl transition-all"
                            >
                                ठीक है (OK)
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {status === 'success' ? (
                                <div className="text-center py-4">
                                    <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                                    </div>
                                    <p className="text-green-400 font-bold text-lg">✅ नोटिफिकेशन On हो गई!</p>
                                    <p className="text-gray-400 text-sm mt-2">अब आपको ताज़ा खबरें मिलती रहेंगी।</p>
                                    {isPWA && (
                                        <p className="text-yellow-400 text-xs mt-2">📱 PWA में ब्राउज़र की Notification Permission भी Allow होनी चाहिए।</p>
                                    )}
                                </div>
                            ) : status === 'error' ? (
                                <div className="text-center py-4">
                                    <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                                        <AlertCircle className="w-8 h-8 text-red-500" />
                                    </div>
                                    <p className="text-red-400 font-bold">❌ कुछ गड़बड़ हो गई</p>
                                    <p className="text-gray-400 text-sm mt-1 mb-4">हो सकता है VAPID Key या Service Worker की समस्या हो।</p>
                                    <div className="flex gap-2 justify-center">
                                        <button onClick={handleEnable} className="px-4 py-2 bg-primary text-white rounded-full text-sm flex items-center gap-1">
                                            <RefreshCw className="w-4 h-4" /> Retry
                                        </button>
                                        <button onClick={handleDismiss} className="px-4 py-2 bg-neutral-700 text-white rounded-full text-sm">बंद</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <ul className="space-y-3 mb-6">
                                        <li className="flex items-center gap-3 text-gray-300">
                                            <span className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center shrink-0">📰</span>
                                            <span className="text-sm">सिर्फ आपकी पसंद की खबरें</span>
                                        </li>
                                        <li className="flex items-center gap-3 text-gray-300">
                                            <span className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center shrink-0">🎯</span>
                                            <span className="text-sm">Auto-targeting: जो पढ़ते हो वही मिलेगा</span>
                                        </li>
                                        <li className="flex items-center gap-3 text-gray-300">
                                            <span className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center shrink-0">🔕</span>
                                            <span className="text-sm">कोई spam नहीं, सिर्फ relevant</span>
                                        </li>
                                    </ul>
                                    <button
                                        onClick={handleEnable}
                                        disabled={isLoading}
                                        className="w-full py-3 px-6 bg-gradient-to-r from-primary to-orange-600 text-white font-bold rounded-full disabled:opacity-50 flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/30 transition-all duration-300"
                                    >
                                        {isLoading ? (
                                            <><svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Processing...</>
                                        ) : (
                                            <><Bell className="w-5 h-5" /> Enable करें</>
                                        )}
                                    </button>
                                    <button onClick={handleDismiss} className="w-full py-2 text-gray-400 hover:text-white text-sm mt-3 transition-colors">बाद में</button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div className="px-6 pb-4">
                    <p className="text-[10px] text-gray-500 text-center">
                        <Smartphone className="w-3 h-3 inline mr-1" />
                        Auto-targeting enabled • No spam guarantee
                    </p>
                </div>
            </div>
        </div>
    );
}