// 🔔 DIVINE LEVEL Firebase Messaging Service Worker
// Handles background push notifications for DailyDhandora
// Version: 2.0 - Supreme Divine Edition

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
    const title = payload.notification?.title || payload.data?.title || 'DailyDhandora';
    const body = payload.notification?.body || payload.data?.body || 'नई खबर आई है!';
    const image = payload.notification?.image || payload.data?.image || null;
    const url = payload.data?.url || '/';
    const articleId = payload.data?.articleId || 'news-' + Date.now();

    const notificationOptions = {
        body: body,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png', // Fallback to main icon as specific badge missing
        image: image,
        tag: articleId, // Prevents duplicate notifications
        renotify: true, // Vibrate even if same tag
        requireInteraction: true, // Don't auto-dismiss
        vibrate: [200, 100, 200, 100, 200], // Pattern
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

    // Show notification
    return self.registration.showNotification(title, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('🔔 [FCM SW] Notification clicked:', event.action, event.notification.data);

    // Close the notification
    event.notification.close();

    // If user clicked close, do nothing
    if (event.action === 'close') {
        return;
    }

    // Get the URL to open
    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Try to find an existing window/tab
            for (let client of windowClients) {
                // If found a window with the URL, focus it
                if (client.url.includes(urlToOpen) && 'focus' in client) {
                    return client.focus();
                }
            }

            // If any window exists, navigate it to the URL
            for (let client of windowClients) {
                if ('navigate' in client && 'focus' in client) {
                    return client.navigate(urlToOpen).then(() => client.focus());
                }
            }

            // Otherwise open a new window
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

// Handle push event (fallback for non-FCM pushes)
self.addEventListener('push', (event) => {
    console.log('🔔 [FCM SW] Push event received');

    if (!event.data) {
        console.log('🔔 [FCM SW] Push with no data');
        return;
    }

    try {
        const data = event.data.json();
        console.log('🔔 [FCM SW] Push data:', data);

        // Only show notification if FCM didn't handle it
        // (This is a fallback for edge cases)
    } catch (e) {
        console.log('🔔 [FCM SW] Push text:', event.data.text());
    }
});

// Service worker install event
self.addEventListener('install', (event) => {
    console.log('🔔 [FCM SW] Service Worker installing...');
    // Take over immediately
    self.skipWaiting();
});

// Service worker activate event
self.addEventListener('activate', (event) => {
    console.log('🔔 [FCM SW] Service Worker activated!');
    // Claim all clients immediately
    event.waitUntil(clients.claim());
});

// Log confirmation
console.log('🔔 [FCM SW] Divine Level Service Worker loaded and ready!');
