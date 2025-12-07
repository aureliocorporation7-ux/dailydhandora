/** @type {import('next').NextConfig} */
  const nextConfig = {
    // WebAssembly configuration
    webpack: (config, { isServer, webpack }) => {
      // Enable WebAssembly
      config.experiments = {
        ...config.experiments,
        asyncWebAssembly: true,
        layers: true,
      };

      // Handle .wasm files
      config.module.rules.push({
        test: /\.wasm$/,
        type: 'webassembly/async',
      });

      // Ignore node-specific modules in client bundle
      if (!isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
          net: false,
          tls: false,
          crypto: false,
          path: false,
          os: false,
          stream: false,
        };
      }

      // Ignore farmhash warnings (optional)
      config.ignoreWarnings = [
        { module: /node_modules\/farmhash-modern/ },
      ];

      return config;
    },

    // Image configuration
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'lh3.googleusercontent.com',
          pathname: '/**',
        },
        {
          protocol: 'https',
          hostname: '**.gstatic.com',
          pathname: '/**',
        },
        {
          protocol: 'https',
          hostname: 'news.google.com',
          pathname: '/**',
        },
        {
          protocol: 'https',
          hostname: 'pixabay.com',
          pathname: '/get/**',
        },
        {
          protocol: 'https',
          hostname: '**.pixabay.com',
          pathname: '/**',
        },
        {
          protocol: 'https',
          hostname: 'placehold.co',
          pathname: '/**',
        },
        {
          protocol: 'https',
          hostname: 'lh3.googleusercontent.com',
          pathname: '/**',
        },

      ],
      formats: ['image/avif', 'image/webp'],
      deviceSizes: [640, 750, 828, 1080, 1200, 1920],
      imageSizes:[16, 32, 48, 64, 96, 128, 256, 384]
    },

    // React configuration
    reactStrictMode: true,

    // Disable powered by header
    poweredByHeader: false,

    // Experimental features (if needed)
    experimental: {
      esmExternals: 'loose',
    },
  };

  module.exports = nextConfig;