const axios = require('axios');

// Load environment variables if not already loaded
if (!process.env.BLOGGER_BLOG_ID) {
    if (process.env.CI) {
        require('dotenv').config({ path: '.env' });
    } else {
        require('dotenv').config({ path: '.env.local', override: true });
    }
}

const BLOGGER_CLIENT_ID = process.env.BLOGGER_CLIENT_ID;
const BLOGGER_CLIENT_SECRET = process.env.BLOGGER_CLIENT_SECRET;
const BLOGGER_REFRESH_TOKEN = process.env.BLOGGER_REFRESH_TOKEN;
const BLOGGER_BLOG_ID = process.env.BLOGGER_BLOG_ID;

/**
 * Checks if all required Blogger API environment variables are configured.
 * Logs exactly which variables are missing if configuration is incomplete.
 * @returns {boolean}
 */
function isConfigured() {
    const missing = [];
    if (!BLOGGER_CLIENT_ID) missing.push('BLOGGER_CLIENT_ID');
    if (!BLOGGER_CLIENT_SECRET) missing.push('BLOGGER_CLIENT_SECRET');
    if (!BLOGGER_REFRESH_TOKEN) missing.push('BLOGGER_REFRESH_TOKEN');
    if (!BLOGGER_BLOG_ID) missing.push('BLOGGER_BLOG_ID');

    if (missing.length > 0) {
        console.log(`⚠️ [Blogger Service] Configuration incomplete. Missing: ${missing.join(', ')}`);
        return false;
    }
    return true;
}

/**
 * Generates a fresh Google OAuth2 Access Token using the Refresh Token.
 * @returns {Promise<string>}
 */
async function getAccessToken() {
    if (!isConfigured()) {
        throw new Error('Blogger API environment variables are not fully configured.');
    }

    try {
        const params = new URLSearchParams();
        params.append('client_id', BLOGGER_CLIENT_ID);
        params.append('client_secret', BLOGGER_CLIENT_SECRET);
        params.append('refresh_token', BLOGGER_REFRESH_TOKEN);
        params.append('grant_type', 'refresh_token');

        const response = await axios.post('https://oauth2.googleapis.com/token', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        if (response.data && response.data.access_token) {
            return response.data.access_token;
        } else {
            throw new Error('Access token not found in OAuth response.');
        }
    } catch (error) {
        const errorData = error.response ? JSON.stringify(error.response.data) : error.message;
        console.error('❌ [Blogger Service] OAuth token refresh failed:', errorData);
        throw new Error(`Failed to refresh Blogger access token: ${error.message}`);
    }
}

/**
 * Formats structured article content into blogger-friendly clean HTML.
 * Wraps paragraphs, handles headings, lists, embeds the image, and adds a footer backlink.
 * @param {string} headline 
 * @param {string} content 
 * @param {string} imageUrl 
 * @returns {string} HTML content
 */
function formatContentForBlogger(headline, content, imageUrl) {
    let html = '';

    // Embed article image at the top of the post
    if (imageUrl) {
        html += `<div style="text-align: center; margin-bottom: 25px;">
            <img src="${imageUrl}" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" alt="${headline}" />
        </div>\n`;
    }

    let formattedBody = content || '';

    // If the body doesn't look like it has HTML paragraphs already, wrap newlines
    if (!formattedBody.includes('<p>') && !formattedBody.includes('<P>')) {
        const paragraphs = formattedBody.split(/\n\n+/);
        formattedBody = paragraphs.map(p => {
            const trimmed = p.trim();
            if (!trimmed) return '';
            
            // If paragraph already starts with heading or list tags, keep as is
            if (trimmed.startsWith('<h') || trimmed.startsWith('<li') || trimmed.startsWith('<ul') || trimmed.startsWith('<ol')) {
                return trimmed;
            }
            
            // Convert single newlines inside paragraphs to breaks, wrap in styled <p> tag
            return `<p style="font-size: 16px; line-height: 1.6; color: #333333; margin-bottom: 16px;">${trimmed.replace(/\n/g, '<br />')}</p>`;
        }).join('\n');
    }

    html += formattedBody;

    // Append branded footer with backlink to DailyDhandora
    html += `\n<hr style="border: 0; border-top: 1px solid #eeeeee; margin: 35px 0;" />
    <p style="text-align: center; font-size: 15px; color: #666666;">
        ताज़ा ख़बरों और विस्तृत जानकारी के लिए हमारे आधिकारिक न्यूज़ पोर्टल 
        <a href="https://dailydhandora.com" style="color: #FF5A5F; text-decoration: none; font-weight: bold;">DailyDhandora</a> 
        पर जाएँ।
    </p>`;

    return html;
}

/**
 * Publishes a new article or updates an existing one on Google Blogger.
 * @param {Object} article - Firestore article data.
 * @param {string} articleId - Firestore document ID.
 * @param {Object} [firestoreDb] - Firestore Admin SDK DB connection for auto-saving links.
 * @returns {Promise<{postId: string, url: string} | null>}
 */
async function publishToBlogger(article, articleId, firestoreDb = null) {
    console.log(`📡 [Blogger Service] Sync triggered for Article ID: "${articleId || 'NEW'}" | Headline: "${article.headline?.substring(0, 50)}..."`);

    if (!isConfigured()) {
        console.log('⚠️ [Blogger Service] Skipping Blogger publish: credentials are not set.');
        return null;
    }

    if (article.status !== 'published') {
        console.log(`ℹ️ [Blogger Service] Skipping Blogger publish. Status is '${article.status}' (not 'published').`);
        return null;
    }

    try {
        const accessToken = await getAccessToken();
        const formattedHtml = formatContentForBlogger(article.headline, article.content, article.imageUrl);

        // Prep the Blogger labels (only use the main category label for menu filters)
        const labels = [];
        if (article.category) {
            const cleanCategory = article.category.trim();
            if (cleanCategory) {
                labels.push(cleanCategory);
            }
        }

        // Prep the Blogger payload
        const postData = {
            kind: 'blogger#post',
            title: article.headline,
            content: formattedHtml,
            labels: labels
        };

        let response;
        const bloggerPostId = article.bloggerPostId;

        if (bloggerPostId) {
            // Update existing post
            console.log(`🔄 [Blogger Service] Updating existing Blogger post: ${bloggerPostId}...`);
            const url = `https://www.googleapis.com/blogger/v3/blogs/${BLOGGER_BLOG_ID}/posts/${bloggerPostId}`;
            response = await axios.put(url, postData, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log(`✅ [Blogger Service] Blogger post updated: ${response.data.url}`);
        } else {
            // Create new post
            console.log(`🆕 [Blogger Service] Publishing new Blogger post for: "${article.headline}"...`);
            const url = `https://www.googleapis.com/blogger/v3/blogs/${BLOGGER_BLOG_ID}/posts/`;
            response = await axios.post(url, postData, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log(`✅ [Blogger Service] Blogger post published successfully: ${response.data.url}`);
        }

        const bloggerInfo = {
            bloggerPostId: response.data.id,
            bloggerPostUrl: response.data.url
        };

        // Save back to firestore if database instance is provided
        if (firestoreDb && articleId) {
            await firestoreDb.collection('articles').doc(articleId).update(bloggerInfo);
            console.log(`📝 [Blogger Service] Saved Blogger ID and URL to Firestore article ${articleId}`);
        }

        return bloggerInfo;
    } catch (error) {
        const errorData = error.response ? JSON.stringify(error.response.data) : error.message;
        console.error('❌ [Blogger Service] Error publishing to Blogger:', errorData);
        // Do not throw so we don't break main news bots execution
        return null;
    }
}

module.exports = {
    isConfigured,
    getAccessToken,
    publishToBlogger
};
