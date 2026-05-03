/**
 * 🔔 Firebase Cloud Messaging (FCM) Client Utilities
 *
 * Handles:
 * - Requesting notification permission
 * - Getting FCM token
 * - Storing token in Firestore
 * - Handling foreground messages
 */

import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from './firebase-client';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

let messagingInstance = null;

/**
 * Get Firebase Messaging instance (lazy initialization)
 */
const getMessagingInstance = () => {
    if (typeof window === 'undefined') return null;

    if (!messagingInstance) {
        try {
            messagingInstance = getMessaging(app);
        } catch (error) {
            console.error('❌ FCM: Failed to initialize messaging:', error);
            return null;
        }
    }
    return messagingInstance;
};

/**
 * Check if notifications are supported
 */
export const isNotificationSupported = () => {
    return typeof window !== 'undefined' &&
        'Notification' in window &&
        'serviceWorker' in navigator &&
        'PushManager' in window;
};

/**
 * Get current notification permission status
 */
export const getNotificationPermission = () => {
    if (!isNotificationSupported()) return 'unsupported';
    return Notification.permission;
};

/**
 * Request notification permission from user
 */
export const requestNotificationPermission = async () => {
    if (!isNotificationSupported()) {
        console.warn('🔔 FCM: Notifications not supported in this browser');
        return 'unsupported';
    }

    try {
        // First check if we already have permission
        if (Notification.permission === 'granted') return 'granted';
        if (Notification.permission === 'denied') return 'denied';

        const permission = await Notification.requestPermission();
        console.log('🔔 FCM: Permission result:', permission);
        return permission;
    } catch (error) {
        console.error('❌ FCM: Permission request failed:', error);
        return 'denied';
    }
};

/**
 * Register the FCM service worker and wait for it to be active
 */
const registerFCMServiceWorker = async () => {
    try {
        // Unregister any old or stale SW registrations first
        const allRegs = await navigator.serviceWorker.getRegistrations();
        for (const reg of allRegs) {
            // Keep the FCM SW, unregister old ones on different scope
            if (reg.active?.scriptURL?.includes('firebase-messaging-sw.js')) {
                // If we already have an FCM SW, just use it
                if (reg.active) {
                    console.log('🔔 FCM: Using existing active FCM Service Worker');
                    return reg;
                }
            }
        }

        // Register with explicit scope
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
            scope: '/',
            updateViaCache: 'none'
        });

        console.log('🔔 FCM: Service Worker registered, waiting for activation...');

        // Wait for the service worker to be ready
        const readyReg = await navigator.serviceWorker.ready;

        // If installing or waiting, wait for it to become active
        if (registration.installing || registration.waiting) {
            await new Promise((resolve) => {
                const sw = registration.installing || registration.waiting;
                sw.addEventListener('statechange', function handler() {
                    if (sw.state === 'activated') {
                        sw.removeEventListener('statechange', handler);
                        resolve();
                    }
                });
                setTimeout(resolve, 5000);
            });
        }

        console.log('🔔 FCM: Service Worker is now active');
        return registration;
    } catch (error) {
        console.error('❌ FCM: Service Worker registration failed:', error);
        throw error;
    }
};

/**
 * Get FCM token for this device
 */
export const getFCMToken = async () => {
    const messaging = getMessagingInstance();
    if (!messaging) return null;

    try {
        // Make sure VAPID key is set
        if (!VAPID_KEY) {
            console.error('❌ FCM: VAPID_KEY is not set! NEXT_PUBLIC_FIREBASE_VAPID_KEY env var is missing.');
            return null;
        }

        const swRegistration = await registerFCMServiceWorker();

        const token = await getToken(messaging, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: swRegistration
        });

        if (token) {
            console.log('🔔 FCM: Token obtained successfully:', token.substring(0, 20) + '...');
            return token;
        } else {
            console.log('🔔 FCM: No token available');
            return null;
        }
    } catch (error) {
        console.error('❌ FCM: Error getting token:', error);
        return null;
    }
};

/**
 * Save FCM token to Firestore via API
 */
export const saveTokenToFirestore = async (token, categories = [], guestId = null) => {
    if (!token) return false;

    try {
        const response = await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token,
                platform: typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches ? 'pwa' : 'web',
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
                categories,
                guestId
            })
        });

        const data = await response.json();
        console.log('🔔 FCM: Token saved via API:', data.success);
        return true;
    } catch (error) {
        console.error('❌ FCM: Failed to save token:', error);
        return false;
    }
};

/**
 * Full subscription flow: Permission -> Token -> Save
 */
export const subscribeToNotifications = async (categories = [], guestId = null) => {
    if (!isNotificationSupported()) {
        return { success: false, error: 'Notifications not supported' };
    }

    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
        return { success: false, error: 'Permission denied' };
    }

    const token = await getFCMToken();
    if (!token) {
        return { success: false, error: 'Failed to get token' };
    }

    await saveTokenToFirestore(token, categories, guestId);

    return { success: true, token };
};

/**
 * Setup foreground message handler (when app is open)
 */
export const setupForegroundMessageHandler = (callback) => {
    const messaging = getMessagingInstance();
    if (!messaging) return () => { };

    const unsubscribe = onMessage(messaging, (payload) => {
        console.log('🔔 FCM: Foreground message received:', payload);

        const notification = {
            title: payload.notification?.title || payload.data?.title || 'DailyDhandora',
            body: payload.notification?.body || payload.data?.body || 'नई खबर आई है!',
            image: payload.notification?.image || payload.data?.image,
            url: payload.data?.url || '/',
            articleId: payload.data?.articleId
        };

        // Show browser notification (even in foreground)
        if (Notification.permission === 'granted') {
            try {
                new Notification(notification.title, {
                    body: notification.body,
                    icon: '/icon-192x192.png',
                    image: notification.image,
                    tag: notification.articleId || 'foreground',
                    vibrate: [200, 100, 200],
                    requireInteraction: true,
                    data: { url: notification.url }
                });
            } catch (e) {
                console.log('🔔 FCM: Foreground notification error:', e);
            }
        }

        if (callback) callback(notification);
    });

    return unsubscribe;
};