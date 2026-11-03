export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    'https://dailydhandora.in';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/'],
      },
      // 🤖 AI Mode & Search Crawlers (Google AI, OpenAI, Perplexity)
      {
        userAgent: ['Googlebot', 'Googlebot-News', 'Google-Extended', 'GPTBot', 'PerplexityBot', 'Bingbot'],
        allow: '/',
        disallow: ['/api/', '/admin/'],
      },
    ],
    sitemap: [
      `${baseUrl}/sitemap.xml`,
      `${baseUrl}/news-sitemap.xml`,
    ],
  };
}
