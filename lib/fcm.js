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
    return Notification.permission; // 'granted', 'denied', 'default'
};

/**
 * Request notification permission from user
 * @returns {Promise<'granted'|'denied'|'default'>}
 */
export const requestNotificationPermission = async () => {
    if (!isNotificationSupported()) {
        console.warn('🔔 FCM: Notifications not supported in this browser');
        return 'unsupported';
    }

    try {
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
        // First, check if SW is already registered
        const existingReg = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');

        if (existingReg && existingReg.active) {
            console.log('🔔 FCM: Using existing active Service Worker');
            return existingReg;
        }

        // Register the service worker
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
            scope: '/'
        });

        console.log('🔔 FCM: Service Worker registered, waiting for activation...');

        // Wait for the service worker to be ready
        await navigator.serviceWorker.ready;

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
                // Safety timeout
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
 * @returns {Promise<string|null>}
 */
export const getFCMToken = async () => {
    const messaging = getMessagingInstance();
    if (!messaging) return null;

    try {
        // Register FCM-specific service worker first
        const swRegistration = await registerFCMServiceWorker();

        const token = await getToken(messaging, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: swRegistration
        });

        if (token) {
            console.log('🔔 FCM: Token obtained successfully');
            return token;
        } else {
            console.log('🔔 FCM: No token available, requesting permission may be needed');
            return null;
        }
    } catch (error) {
        console.error('❌ FCM: Error getting token:', error);
        return null;
    }
};

/**
 * Save FCM token to Firestore for later push targeting
 * @param {string} token 
 */
/**
 * Save FCM token to Firestore via API
 * @param {string} token 
 */
export const saveTokenToFirestore = async (token) => {
    if (!token) return false;

    try {
        await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token,
                platform: typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches ? 'pwa' : 'web',
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
            })
        });

        console.log('🔔 FCM: Token saved via API');
        return true;
    } catch (error) {
        console.error('❌ FCM: Failed to save token:', error);
        return false;
    }
};

/**
 * Full subscription flow: Permission -> Token -> Save
 * @returns {Promise<{success: boolean, token?: string, error?: string}>}
 */
export const subscribeToNotifications = async () => {
    // Step 1: Check support
    if (!isNotificationSupported()) {
        return { success: false, error: 'Notifications not supported' };
    }

    // Step 2: Request permission
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
        return { success: false, error: 'Permission denied' };
    }

    // Step 3: Get Token
    const token = await getFCMToken();
    if (!token) {
        return { success: false, error: 'Failed to get token' };
    }

    // Step 4: Save to Firestore
    await saveTokenToFirestore(token);

    return { success: true, token };
};

/**
 * Setup foreground message handler (when app is open)
 * @param {Function} callback - Called with notification data when message received
 */
export const setupForegroundMessageHandler = (callback) => {
    const messaging = getMessagingInstance();
    if (!messaging) return () => { };

    const unsubscribe = onMessage(messaging, (payload) => {
        console.log('🔔 FCM: Foreground message received:', payload);

        // Extract notification data
        const notification = {
            title: payload.notification?.title || payload.data?.title || 'DailyDhandora',
            body: payload.notification?.body || payload.data?.body || 'नई खबर आई है!',
            image: payload.notification?.image || payload.data?.image,
            url: payload.data?.url || '/',
            articleId: payload.data?.articleId
        };

        // Show browser notification (even in foreground)
        if (Notification.permission === 'granted') {
            new Notification(notification.title, {
                body: notification.body,
                icon: '/icon-192x192.png',
                image: notification.image,
                tag: notification.articleId || 'foreground',
                data: { url: notification.url }
            });
        }

        // Also call the callback for in-app handling
        if (callback) callback(notification);
    });

    return unsubscribe;
};
