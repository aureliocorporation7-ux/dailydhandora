import { Inter } from 'next/font/google';
import { Suspense } from 'react';
import './globals.css';
import { NotificationProvider } from './contexts/NotificationContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import GoogleAdsScript from './components/GoogleAdsScript';
import PushNotificationPrompt from './components/PushNotificationPrompt';
import DataTracker from './components/DataTracker';

const inter = Inter({ subsets: ['latin'] });

// 🔍 SEO: Base URL
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://dailydhandora.in';

export const metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'DailyDhandora - नागौर की ताज़ा ख़बरें, मंडी भाव, सरकारी योजना',
    template: '%s | DailyDhandora',
  },
  description: 'नागौर और राजस्थान की सबसे तेज़ हिंदी समाचार वेबसाइट। ताज़ा मंडी भाव, शिक्षा विभाग, सरकारी योजना, भर्ती रिजल्ट — सब एक जगह।',
  manifest: '/manifest.json',
  keywords: ['नागौर न्यूज़', 'नागौर समाचार', 'नागौर मंडी भाव', 'nagaur news today', 'nagaur mandi bhav', 'राजस्थान समाचार', 'शिक्षा विभाग', 'सरकारी योजना', 'भर्ती रिजल्ट', 'Nagaur News', 'Rajasthan News Hindi', 'DailyDhandora'],
  icons: {
    icon: '/favicon.ico',
    apple: '/icon-192x192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'DailyDhandora',
  },
  openGraph: {
    title: 'DailyDhandora - नागौर की ताज़ा ख़बरें, मंडी भाव, सरकारी योजना',
    description: 'नागौर और राजस्थान की सबसे तेज़ हिंदी समाचार वेबसाइट। ताज़ा मंडी भाव, शिक्षा विभाग, सरकारी योजना, भर्ती रिजल्ट।',
    type: 'website',
    locale: 'hi_IN',
    siteName: 'DailyDhandora',
    url: baseUrl,
    images: [{
      url: `${baseUrl}/logo-512.webp`,
      width: 512,
      height: 512,
      alt: 'DailyDhandora Logo',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DailyDhandora - नागौर की ताज़ा ख़बरें',
    description: 'नागौर और राजस्थान की सबसे तेज़ हिंदी समाचार वेबसाइट',
    images: [`${baseUrl}/logo-512.webp`],
  },
  alternates: {
    canonical: baseUrl,
    languages: {
      'hi-IN': baseUrl,
    },
  },
  verification: {
    // TODO: Add Google Search Console verification code here
    // google: 'your-google-site-verification-code',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport = {
  themeColor: '#ff9900',
  width: 'device-width',
  initialScale: 1,
};

// 🔍 SEO: Organization + WebSite Schema (Global)

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'NewsMediaOrganization',
  name: 'DailyDhandora',
  url: baseUrl,
  logo: `${baseUrl}/logo-512.webp`,
  sameAs: [
    'https://whatsapp.com/channel/0029Vb2keLhKAwEq3zBNP308',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    availableLanguage: ['Hindi', 'English']
  }
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'DailyDhandora',
  url: baseUrl,
  potentialAction: {
    '@type': 'SearchAction',
    target: `${baseUrl}/search?q={search_term_string}`,
    'query-input': 'required name=search_term_string'
  },
  inLanguage: 'hi-IN'
};

export default function RootLayout({ children }) {
  return (
    <html lang="hi" className="dark" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
        {/* 🔍 SEO: Global Schemas */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body className={`${inter.className} bg-neutral-950 text-white`} suppressHydrationWarning>
        <GoogleAdsScript />
        <NotificationProvider>
          <Navbar />
          <main className="min-h-screen">
            {children}
          </main>
          <Footer />
          <DataTracker />
          <div className="fixed z-50">
            <Suspense fallback={null}>
              <PushNotificationPrompt />
            </Suspense>
          </div>
        </NotificationProvider>
      </body>
    </html>
  );
}