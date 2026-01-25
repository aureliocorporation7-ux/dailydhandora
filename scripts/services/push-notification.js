/**
 * 🔔 Push Notification Service
 * 
 * Server-side utility to send push notifications to all subscribed users.
 * Used by news-bot to auto-notify on new article publish.
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

        // Build notification message
        const message = {
            notification: {
                title,
                body,
                ...(image && { image })
            },
            data: {
                title,
                body,
                url: url || '/',
                articleId: articleId || '',
                timestamp: Date.now().toString()
            },
            webpush: {
                fcmOptions: {
                    link: url || '/'
                },
                notification: {
                    icon: '/icons/icon-192x192.png',
                    badge: '/icons/badge-72x72.png',
                    vibrate: [200, 100, 200],
                    requireInteraction: true,
                    tag: articleId || 'news'
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

        // Batch delete invalid tokens
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
 * Filters by category subscription - only sends to users subscribed to that category
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

        // Fetch all active FCM tokens
        const tokensSnapshot = await db.collection('fcmTokens')
            .where('active', '==', true)
            .get();

        if (tokensSnapshot.empty) {
            console.log('🔔 [Push] No subscribed devices found');
            return { success: true, sentCount: 0, failedCount: 0 };
        }

        // Filter tokens by category subscription
        // Send to users who:
        // 1. Have no category preferences (empty array = all categories)
        // 2. Have subscribed to this specific category
        const eligibleTokens = tokensSnapshot.docs
            .map(doc => doc.data())
            .filter(data => {
                const categories = data.categories || [];
                // Empty = subscribed to all, OR category is in their list
                return categories.length === 0 || categories.includes(category);
            })
            .map(data => data.token);

        if (eligibleTokens.length === 0) {
            console.log(`🔔 [Push] No subscribers for category: ${category}`);
            return { success: true, sentCount: 0, failedCount: 0 };
        }

        console.log(`🔔 [Push] Sending to ${eligibleTokens.length}/${tokensSnapshot.docs.length} devices (category: ${category})`);

        // Build notification message
        const message = {
            notification: {
                title: `${emoji} ${headline.substring(0, 50)}...`,
                body: `DailyDhandora पर नई खबर पढ़ें`,
                ...(imageUrl && { image: imageUrl })
            },
            data: {
                title: `${emoji} ${headline.substring(0, 50)}...`,
                body: `DailyDhandora पर नई खबर पढ़ें`,
                url: `/article/${id}`,
                articleId: id || '',
                category: category || '',
                timestamp: Date.now().toString()
            },
            webpush: {
                fcmOptions: {
                    link: `/article/${id}`
                },
                notification: {
                    icon: '/icons/icon-192x192.png',
                    badge: '/icons/badge-72x72.png',
                    vibrate: [200, 100, 200],
                    requireInteraction: true,
                    tag: id || 'news'
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
