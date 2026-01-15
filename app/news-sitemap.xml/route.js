/**
 * 📰 Google News Sitemap
 * Route: /news-sitemap.xml
 * 
 * Generates a Google News compliant sitemap with:
 * - Articles from last 48 hours
 * - <news:news> tags with publication info
 * - Hindi language support
 */

import { db } from '@/lib/firebase';

export async function GET(request) {
    // Dynamic base URL - works on any domain
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
        process.env.RENDER_EXTERNAL_URL ||
        'https://dailydhandora.onrender.com';
    const publicationName = 'Daily Dhandora';
    const language = 'hi'; // Hindi

    // Calculate 48 hours ago
    const fortyEightHoursAgo = new Date();
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

    try {
        if (!db) {
            console.error('[News Sitemap] Firestore not initialized');
            return new Response(generateEmptySitemap(), {
                headers: { 'Content-Type': 'application/xml' }
            });
        }

        // Fetch articles from last 48 hours
        const snapshot = await db
            .collection('articles')
            .where('status', '==', 'published')
            .where('createdAt', '>=', fortyEightHoursAgo)
            .orderBy('createdAt', 'desc')
            .limit(1000) // Google News allows up to 1000
            .get();

        const articles = snapshot.docs.map(doc => {
            const data = doc.data();
            const pubDate = data.createdAt?.toDate?.() || new Date();

            return {
                id: doc.id,
                title: escapeXml(data.headline || data.title || 'News Update'),
                pubDate: pubDate.toISOString(),
                category: escapeXml(data.category || 'News'),
            };
        });

        console.log(`[News Sitemap] Generated with ${articles.length} articles`);

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${articles.map(article => `  <url>
    <loc>${baseUrl}/article/${article.id}</loc>
    <news:news>
      <news:publication>
        <news:name>${publicationName}</news:name>
        <news:language>${language}</news:language>
      </news:publication>
      <news:publication_date>${article.pubDate}</news:publication_date>
      <news:title>${article.title}</news:title>
    </news:news>
  </url>`).join('\n')}
</urlset>`;

        return new Response(xml, {
            headers: {
                'Content-Type': 'application/xml',
                'Cache-Control': 'public, max-age=3600, s-maxage=1800', // 1 hour browser, 30 min CDN
            }
        });

    } catch (error) {
        console.error('[News Sitemap] Error:', error);
        return new Response(generateEmptySitemap(), {
            headers: { 'Content-Type': 'application/xml' }
        });
    }
}

function generateEmptySitemap() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
</urlset>`;
}

function escapeXml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
