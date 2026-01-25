require('dotenv').config({ path: './.env.local' });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    imgOptTimeoutInSeconds: 120,
  },
  images: {
    unoptimized: true,
    qualities: [50, 75],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'pixabay.com',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: 'placeholder.com',
      },
      {
        protocol: 'https',
        hostname: 'image.pollinations.ai',
      },
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
      },
    ],
  },
  output: 'standalone',
};

const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  // disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    runtimeCaching: [
      // 📰 ARTICLE PAGES - Offline Support (50 articles)
      {
        urlPattern: /\/article\/[a-zA-Z0-9_-]+$/,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'article-pages',
          expiration: {
            maxEntries: 50, // Last 50 articles offline
            maxAgeSeconds: 60 * 60 * 24, // 24 hours
          },
        },
      },
      // 🏠 HOMEPAGE - Fast reload
      {
        urlPattern: /^https?:\/\/[^/]+\/?$/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'homepage',
          networkTimeoutSeconds: 10,
          expiration: {
            maxEntries: 1,
            maxAgeSeconds: 60 * 60, // 1 hour
          },
        },
      },
      // 📂 CATEGORY PAGES - Offline browsing
      {
        urlPattern: /\/category\/[^/]+$/,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'category-pages',
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 60 * 60, // 1 hour
          },
        },
      },
      // 🎙️ TTS API Audio Cache (Edge/Google TTS) - 6 hours
      {
        urlPattern: /^https?:\/\/.*\/api\/tts/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'tts-audio-cache',
          expiration: {
            maxEntries: 30,
            maxAgeSeconds: 60 * 60 * 6, // 6 hours
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      // Cloudinary Audio (ElevenLabs permanent) - 30 days
      {
        urlPattern: /^https:\/\/res\.cloudinary\.com\/.*\.mp3$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'audio-cache',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
          },
        },
      },
      // 🖼️ IMAGES - StaleWhileRevalidate for fast load
      {
        urlPattern: /^https:\/\/(i\.ibb\.co|firebasestorage\.googleapis\.com|pixabay\.com|via\.placeholder\.com|placeholder\.com|image\.pollinations\.ai)\/.*/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'image-cache',
          expiration: {
            maxEntries: 200, // More images for offline
            maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
          },
        },
      },
      // 📦 STATIC RESOURCES
      {
        urlPattern: /\.(?:js|css)$/,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'static-resources',
        },
      },
      // 🔤 FONTS - Cache for performance
      {
        urlPattern: /\.(?:woff|woff2|ttf|otf|eot)$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'font-cache',
          expiration: {
            maxEntries: 20,
            maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
          },
        },
      },
    ],
  },
});


module.exports = withPWA(nextConfig);