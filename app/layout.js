import { Inter } from 'next/font/google';
import './globals.css';
import { NotificationProvider } from './contexts/NotificationContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import GoogleAdsScript from './components/GoogleAdsScript';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'DailyDhandora - ताज़ा खबरें हिंदी में',
  description: 'भारत की सबसे तेज़ हिंदी समाचार वेबसाइट',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/icon-192x192.png',  // iOS PWA icon
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'DailyDhandora',
  },
};

export const viewport = {
  themeColor: '#ff9900',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="hi" className="dark" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
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
        </NotificationProvider>
      </body>
    </html>
  );
}