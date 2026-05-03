/**
 * 🔔 Push Notification Service - Supreme Divine Edition
 *
 * Server-side utility to send push notifications to all subscribed users.
 * Used by news-bot to auto-notify on new article publish.
 * FIXED: Correct icon paths and notification structure for PWA/mobile.
 */

const { admin, db } = require('../../lib/firebase');

/**
 * Send push notification to all subscribed devices
 *
 * @param {Object} options
 * @param {string} options.title - Notification title
 * @param {string} options.body - Notification body
 * @param {string} [options.image] - Optional image URL
 * @param {string} [options.url] - URL to open on click
 * @param {string} [options.articleId] - Article ID for tagging
 * @returns {Promise<{success: boolean, sentCount: number, failedCount: number}>}
 */
async function sendPushNotification({ title, body, image, url, articleId }) {
    try {
        if (!db) {
            console.log('🔔 [Push] Firebase not initialized, skipping notification');
            return { success: false, sentCount: 0, failedCount: 0 };
        }

        // Fetch all active FCM tokens
        const tokensSnapshot = await db.collection('fcmTokens')
            .where('active', '==', true)
            .get();

        if (tokensSnapshot.empty) {
            console.log('🔔 [Push] No subscribed devices found');
            return { success: true, sentCount: 0, failedCount: 0 };
        }

        const tokens = tokensSnapshot.docs.map(doc => doc.data().token);
        console.log(`🔔 [Push] Sending to ${tokens.length} devices...`);

        // Build notification message - FIXED: Using data-only message for reliable delivery
        // Data-only messages always trigger the push event in SW, regardless of browser state
        const message = {
            data: {
                title: title,
                body: body,
                url: url || '/',
                articleId: articleId || '',
                image: image || '',
                timestamp: Date.now().toString()
            },
            webpush: {
                fcmOptions: {
                    link: url || '/'
                },
                headers: {
                    Urgency: 'high'
                },
                notification: {
                    title: title,
                    body: body,
                    icon: '/icon-192x192.png',
                    badge: '/icon-192x192.png',
                    image: image || undefined,
                    vibrate: [200, 100, 200, 100, 200, 100, 300],
                    requireInteraction: true,
                    tag: articleId || 'news',
                    renotify: true,
                    silent: false
                }
            }
        };

        // Send to all tokens
        const response = await admin.messaging().sendEachForMulticast({
            tokens,
            ...message
        });

        console.log(`🔔 [Push] ✅ Success: ${response.successCount}, Failed: ${response.failureCount}`);

        // Clean up invalid tokens
        const tokensToRemove = [];
        response.responses.forEach((resp, idx) => {
            if (!resp.success) {
                const errorCode = resp.error?.code;
                if (errorCode === 'messaging/registration-token-not-registered' ||
                    errorCode === 'messaging/invalid-registration-token') {
                    tokensToRemove.push(tokens[idx]);
                }
            }
        });

        if (tokensToRemove.length > 0) {
            const batch = db.batch();
            tokensToRemove.forEach(token => {
                batch.delete(db.collection('fcmTokens').doc(token));
            });
            await batch.commit();
            console.log(`🔔 [Push] Removed ${tokensToRemove.length} stale tokens`);
        }

        return {
            success: true,
            sentCount: response.successCount,
            failedCount: response.failureCount
        };

    } catch (error) {
        console.error('🔔 [Push] ❌ Error:', error.message);
        return { success: false, sentCount: 0, failedCount: 0, error: error.message };
    }
}

/**
 * Send notification for a new article
 * Filters by category subscription
 *
 * @param {Object} article
 * @param {string} article.headline - Article headline
 * @param {string} article.id - Article ID
 * @param {string} [article.imageUrl] - Article image URL
 * @param {string} [article.category] - Article category
 */
async function notifyNewArticle({ headline, id, imageUrl, category }) {
    try {
        if (!db) {
            console.log('🔔 [Push] Firebase not initialized, skipping notification');
            return { success: false, sentCount: 0, failedCount: 0 };
        }

        const categoryEmoji = {
            'मंडी भाव': '🌾',
            'नागौर न्यूज़': '📰',
            'शिक्षा विभाग': '📚',
            'सरकारी योजना': '🏛️',
            'भर्ती व रिजल्ट': '🎓'
        };

        const emoji = categoryEmoji[category] || '📰';
        const truncatedHeadline = headline ? headline.substring(0, 80) : 'नई खबर';
        const notifTitle = `${emoji} ${truncatedHeadline}`;
        const notifBody = `DailyDhandora पर नई खबर पढ़ें`;

        // Fetch all active FCM tokens
        const tokensSnapshot = await db.collection('fcmTokens')
            .where('active', '==', true)
            .get();

        if (tokensSnapshot.empty) {
            console.log('🔔 [Push] No subscribed devices found');
            return { success: true, sentCount: 0, failedCount: 0 };
        }

        // Filter tokens by category subscription
        const eligibleTokens = tokensSnapshot.docs
            .map(doc => doc.data())
            .filter(data => {
                const categories = data.categories || [];
                return categories.length === 0 || categories.includes(category);
            })
            .map(data => data.token);

        if (eligibleTokens.length === 0) {
            console.log(`🔔 [Push] No subscribers for category: ${category}`);
            return { success: true, sentCount: 0, failedCount: 0 };
        }

        console.log(`🔔 [Push] Sending to ${eligibleTokens.length}/${tokensSnapshot.docs.length} devices (category: ${category})`);

        // Build message - using data + webpush.notification dual delivery for reliability
        const message = {
            data: {
                title: notifTitle,
                body: notifBody,
                url: `/article/${id}`,
                articleId: id || '',
                image: imageUrl || '',
                category: category || '',
                timestamp: Date.now().toString()
            },
            webpush: {
                fcmOptions: {
                    link: `/article/${id}`
                },
                headers: {
                    Urgency: 'high'
                },
                notification: {
                    title: notifTitle,
                    body: notifBody,
                    icon: '/icon-192x192.png',
                    badge: '/icon-192x192.png',
                    image: imageUrl || undefined,
                    vibrate: [200, 100, 200, 100, 200, 100, 300],
                    requireInteraction: true,
                    tag: id || 'news',
                    renotify: true,
                    silent: false
                }
            }
        };

        // Send to eligible tokens
        const response = await admin.messaging().sendEachForMulticast({
            tokens: eligibleTokens,
            ...message
        });

        console.log(`🔔 [Push] ✅ Success: ${response.successCount}, Failed: ${response.failureCount}`);

        // Clean up invalid tokens
        const tokensToRemove = [];
        response.responses.forEach((resp, idx) => {
            if (!resp.success) {
                const errorCode = resp.error?.code;
                if (errorCode === 'messaging/registration-token-not-registered' ||
                    errorCode === 'messaging/invalid-registration-token') {
                    tokensToRemove.push(eligibleTokens[idx]);
                }
            }
        });

        if (tokensToRemove.length > 0) {
            const batch = db.batch();
            tokensToRemove.forEach(token => {
                batch.delete(db.collection('fcmTokens').doc(token));
            });
            await batch.commit();
            console.log(`🔔 [Push] Removed ${tokensToRemove.length} stale tokens`);
        }

        return {
            success: true,
            sentCount: response.successCount,
            failedCount: response.failureCount
        };

    } catch (error) {
        console.error('🔔 [Push] ❌ Error:', error.message);
        return { success: false, sentCount: 0, failedCount: 0, error: error.message };
    }
}

module.exports = {
    sendPushNotification,
    notifyNewArticle
};