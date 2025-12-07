'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import NotificationBell from '../notifications/NotificationBell';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-white rounded-full blur opacity-50 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative bg-white rounded-full p-2">
                <span className="text-2xl">📰</span>
              </div>
            </div>
            <span className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg">
              DailyDhandora
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className="text-white font-semibold hover:text-yellow-200 transition-colors duration-200 text-lg"
            >
              🏠 होम
            </Link>
            <Link
              href="/categories"
              className="text-white font-semibold hover:text-yellow-200 transition-colors duration-200 text-lg"
            >
              📑 श्रेणियां
            </Link>
            <Link
              href="/about"
              className="text-white font-semibold hover:text-yellow-200 transition-colors duration-200 text-lg"
            >
              ℹ️ हमारे बारे में
            </Link>
            
            {/* Notification Bell */}
            <NotificationBell />
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-4">
            <NotificationBell />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-white hover:text-yellow-200 transition-colors"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden bg-gradient-to-b from-orange-600 to-red-600 border-t border-orange-400">
          <div className="px-4 pt-2 pb-4 space-y-2">
            <Link
              href="/"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-3 text-white font-semibold hover:bg-orange-700 rounded-lg transition-colors text-lg"
            >
              🏠 होम
            </Link>
            <Link
              href="/categories"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-3 text-white font-semibold hover:bg-orange-700 rounded-lg transition-colors text-lg"
            >
              📑 श्रेणियां
            </Link>
            <Link
              href="/about"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-3 text-white font-semibold hover:bg-orange-700 rounded-lg transition-colors text-lg"
            >
              ℹ️ हमारे बारे में
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}