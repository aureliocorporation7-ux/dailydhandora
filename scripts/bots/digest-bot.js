/**
 * 📰 Daily Digest Bot
 * 
 * Sends a morning digest push notification with top 3 trending news.
 * Runs at 8 AM IST via scheduler.
 */

const { admin, db } = require('../../lib/firebase');
const { sendPushNotification } = require('../services/push-notification');

/**
 * Fetch top articles by views from last 24 hours
 * @param {number} limit - Number of articles to fetch
 * @returns {Promise<Array>}
 */
async function getTopArticles(limit = 3) {
    try {
        if (!db) {
            console.log('📰 [Digest] Firebase not initialized');
            return [];
        }

        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        // Fetch recent published articles sorted by views
        const snapshot = await db.collection('articles')
            .where('status', '==', 'published')
            .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(oneDayAgo))
            .orderBy('createdAt', 'desc')
            .limit(20) // Fetch more, then sort by views
            .get();

        if (snapshot.empty) {
            console.log('📰 [Digest] No recent articles found');
            return [];
        }

        // Sort by views and take top N
        const articles = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => (b.views || 0) - (a.views || 0))
            .slice(0, limit);

        console.log(`📰 [Digest] Found ${articles.length} top articles`);
        return articles;
    } catch (error) {
        console.error('📰 [Digest] Error fetching articles:', error.message);
        return [];
    }
}

/**
 * Format digest message body
 * @param {Array} articles 
 * @returns {string}
 */
function formatDigestBody(articles) {
    if (articles.length === 0) {
        return 'आज की ताज़ा खबरें पढ़ें DailyDhandora पर!';
    }

    // Create short headlines list
    const headlines = articles.map((a, i) => {
        const shortHeadline = a.headline?.substring(0, 40) || 'News Update';
        return `${i + 1}. ${shortHeadline}...`;
    });

    return headlines.join('\n');
}

/**
 * Send daily digest notification
 */
async function sendDailyDigest() {
    console.log('📰 [Digest] Starting Daily Digest...');

    try {
        // Get top articles
        const topArticles = await getTopArticles(3);

        if (topArticles.length === 0) {
            console.log('📰 [Digest] No articles to send, skipping digest');
            return { success: false, reason: 'No articles' };
        }

        // Format notification
        const title = '☀️ Good Morning! आज की Top खबरें';
        const body = formatDigestBody(topArticles);
        const image = topArticles[0]?.imageUrl || null;

        // Send push notification
        const result = await sendPushNotification({
            title,
            body,
            image,
            url: '/',
            articleId: 'daily-digest'
        });

        console.log(`📰 [Digest] ✅ Sent to ${result.sentCount} devices`);
        return result;

    } catch (error) {
        console.error('📰 [Digest] ❌ Error:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Check if current time is around 8 AM IST
 * Used for scheduled runs
 */
function isDigestTime() {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const istTime = new Date(now.getTime() + istOffset);
    const hour = istTime.getUTCHours();
    return hour === 8; // 8 AM IST
}

/**
 * Main run function (called by scheduler)
 */
async function run() {
    console.log('📰 [Digest Bot] Running...');

    // Check if we should send digest (only at 8 AM IST)
    // For manual runs, always execute
    const forceRun = process.env.FORCE_DIGEST === 'true';

    if (!forceRun && !isDigestTime()) {
        console.log('📰 [Digest Bot] Not digest time, skipping...');
        return;
    }

    await sendDailyDigest();
    console.log('📰 [Digest Bot] Completed.');
}

module.exports = { run, sendDailyDigest, getTopArticles };

// Standalone execution
if (require.main === module) {
    process.env.FORCE_DIGEST = 'true';
    run().then(() => {
        console.log('📰 [Digest Bot] Standalone execution complete.');
        process.exit(0);
    }).catch(err => {
        console.error('❌ [Digest Bot] Error:', err.message);
        process.exit(1);
    });
}
