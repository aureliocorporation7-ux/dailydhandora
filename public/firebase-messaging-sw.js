// Firebase Messaging Service Worker
// Handles background push notifications for DailyDhandora

// Import Firebase scripts (compat version for SW)
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase configuration (same as client-side)
firebase.initializeApp({
    apiKey: "AIzaSyA32xhmw1KRGA07bxmWr8GHNDuL2qMt-BY",
    authDomain: "dailydhandora.firebaseapp.com",
    projectId: "dailydhandora",
    storageBucket: "dailydhandora.appspot.com",
    messagingSenderId: "303609550188",
    appId: "1:303609550188:web:9492e42403eff0d57d0f49"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('🔔 [FCM SW] Background message received:', payload);

    const notificationTitle = payload.notification?.title || payload.data?.title || 'DailyDhandora';
    const notificationOptions = {
        body: payload.notification?.body || payload.data?.body || 'नई खबर आई है!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        image: payload.notification?.image || payload.data?.image || null,
        tag: payload.data?.articleId || 'default',
        renotify: true,
        requireInteraction: true,
        vibrate: [200, 100, 200],
        data: {
            url: payload.data?.url || '/',
            articleId: payload.data?.articleId || null
        },
        actions: [
            { action: 'open', title: '📰 पढ़ें' },
            { action: 'close', title: '❌ बंद करें' }
        ]
    };

    // Show notification
    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('🔔 [FCM SW] Notification clicked:', event.action);

    event.notification.close();

    if (event.action === 'close') {
        return;
    }

    // Open the article URL
    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Check if there's already a window open with the target URL
            for (let client of windowClients) {
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            // If no window is open, open a new one
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

// Handle push event as fallback (for custom push scenarios)
self.addEventListener('push', (event) => {
    if (event.data) {
        try {
            const data = event.data.json();
            // FCM will handle this via onBackgroundMessage, but this is a fallback
            console.log('🔔 [FCM SW] Push event data:', data);
        } catch (e) {
            console.log('🔔 [FCM SW] Push with text:', event.data.text());
        }
    }
});

console.log('🔔 [FCM SW] Firebase Messaging Service Worker loaded');
