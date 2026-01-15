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
      {
        urlPattern: /^https:\/\/(i\.ibb\.co|firebasestorage\.googleapis\.com|pixabay\.com|via\.placeholder\.com|placeholder\.com|image\.pollinations\.ai)\/.*/,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'image-cache',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
          },
        },
      },
      {
        urlPattern: /\.(?:js|css)$/,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'static-resources',
        },
      },
    ],
  },
});

module.exports = withPWA(nextConfig);