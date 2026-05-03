// �� DIVINE LEVEL Firebase Messaging Service Worker
// Handles background push notifications for DailyDhandora
// Version: 3.0 - Supreme Divine Edition

// Import Firebase scripts (compat version for SW)
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase configuration
firebase.initializeApp({
    apiKey: "AIzaSyA32xhmw1KRGA07bxmWr8GHNDuL2qMt-BY",
    authDomain: "dailydhandora.firebaseapp.com",
    projectId: "dailydhandora",
    storageBucket: "dailydhandora.appspot.com",
    messagingSenderId: "303609550188",
    appId: "1:303609550188:web:9492e42403eff0d57d0f49"
});

const messaging = firebase.messaging();

console.log('🔔 [FCM SW] Service Worker initialized successfully');

// Handle background messages (app not in focus)
messaging.onBackgroundMessage((payload) => {
    console.log('🔔 [FCM SW] Background message received:', payload);

    // Extract notification data from both notification and data fields
    const notificationTitle = payload.notification?.title || payload.data?.title || 'DailyDhandora';
    const notificationBody = payload.notification?.body || payload.data?.body || 'नई खबर आई है!';
    const notificationImage = payload.notification?.image || payload.data?.image || null;
    const url = payload.data?.url || '/';
    const articleId = payload.data?.articleId || 'news-' + Date.now();

    const notificationOptions = {
        body: notificationBody,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        image: notificationImage,
        tag: articleId,
        renotify: true,
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200, 100, 300],
        silent: false,
        data: {
            url: url,
            articleId: articleId,
            timestamp: Date.now()
        },
        actions: [
            { action: 'open', title: '📰 पढ़ें', icon: '/icon-192x192.png' },
            { action: 'close', title: '❌ बाद में' }
        ]
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('🔔 [FCM SW] Notification clicked:', event.action, event.notification.data);
    event.notification.close();

    if (event.action === 'close') return;

    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // First try to focus an existing window with the exact URL
            for (let client of windowClients) {
                if (client.url.includes(urlToOpen) && 'focus' in client) {
                    return client.focus();
                }
            }
            // Then try to navigate any existing window
            for (let client of windowClients) {
                if ('navigate' in client && 'focus' in client) {
                    return client.navigate(urlToOpen).then(() => client.focus());
                }
            }
            // Otherwise open new window
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
    console.log('🔔 [FCM SW] Notification dismissed:', event.notification.data?.articleId);
});

// Handle push event (fallback for non-FCM pushes, and FCM when onBackgroundMessage fails)
self.addEventListener('push', (event) => {
    console.log('🔔 [FCM SW] Push event received (fallback handler)');

    if (!event.data) {
        console.log('🔔 [FCM SW] Push with no data');
        return;
    }

    try {
        const data = event.data.json();
        console.log('🔔 [FCM SW] Push data:', data);

        // FCM wraps in fcm or data key - extract properly
        const notification = data.notification || data.data || data;
        const title = notification.title || 'DailyDhandora';
        const body = notification.body || 'नई खबर आई है!';
        const image = notification.image || null;
        const url = notification.url || data.url || '/';
        const articleId = notification.articleId || data.articleId || data.tag || 'news-' + Date.now();

        const options = {
            body: body,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            image: image,
            tag: articleId,
            renotify: true,
            requireInteraction: true,
            vibrate: [200, 100, 200, 100, 200, 100, 300],
            silent: false,
            data: {
                url: url,
                articleId: articleId,
                timestamp: Date.now()
            },
            actions: [
                { action: 'open', title: '📰 पढ़ें', icon: '/icon-192x192.png' },
                { action: 'close', title: '❌ बाद में' }
            ]
        };

        event.waitUntil(
            self.registration.showNotification(title, options)
        );
    } catch (e) {
        console.log('🔔 [FCM SW] Push text:', event.data.text());
        // Try showing as plain text
        try {
            const text = event.data.text();
            if (text && text.length > 0 && text.length < 200) {
                event.waitUntil(
                    self.registration.showNotification('DailyDhandora', {
                        body: text,
                        icon: '/icon-192x192.png',
                        badge: '/icon-192x192.png',
                        tag: 'push-' + Date.now()
                    })
                );
            }
        } catch (e2) {}
    }
});

// Service worker install event
self.addEventListener('install', (event) => {
    console.log('🔔 [FCM SW] Service Worker installing...');
    self.skipWaiting();
});

// Service worker activate event
self.addEventListener('activate', (event) => {
    console.log('🔔 [FCM SW] Service Worker activated!');
    event.waitUntil(clients.claim());
});

// Log confirmation
console.log('🔔 [FCM SW] Divine Level Service Worker loaded and ready!');