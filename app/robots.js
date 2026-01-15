export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    'https://dailydhandora.onrender.com';

  return {
    rules: [
      {
        userAgent: '*',
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
