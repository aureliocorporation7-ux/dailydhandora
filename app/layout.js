import { Inter } from 'next/font/google';
import './globals.css';
import { NotificationProvider } from './contexts/NotificationContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'DailyDhandora - ताज़ा खबरें हिंदी में',
  description: 'भारत की सबसे तेज़ हिंदी समाचार वेबसाइट',
  icons: {
    icon: '/favicon.ico',
  },
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
        <NotificationProvider>
          <main>{children}</main>
        </NotificationProvider>
      </body>
    </html>
  );
}