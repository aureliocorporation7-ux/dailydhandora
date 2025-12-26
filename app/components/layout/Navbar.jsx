'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import NotificationBell from '../NotificationBell';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-neutral-950/80 backdrop-blur-md border-b border-white/10 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <span className="text-2xl transform group-hover:scale-110 transition-transform duration-300">📰</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent group-hover:from-primary group-hover:to-orange-400 transition-all duration-300">
              DailyDhandora
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {['होम', 'श्रेणियां', 'हमारे बारे में', 'संपर्क'].map((item, idx) => {
                const paths = ['/', '/categories', '/about', '/contact'];
                return (
                    <Link 
                        key={idx} 
                        href={paths[idx]} 
                        className="text-white/70 hover:text-primary font-medium transition-colors duration-200 text-sm tracking-wide hover:bg-white/5 px-3 py-2 rounded-lg"
                    >
                        {item}
                    </Link>
                )
            })}
            
            {/* Notification Bell */}
            <div className="border-l border-white/10 pl-6">
                <NotificationBell />
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-4">
            <NotificationBell />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-white/70 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden bg-neutral-900 border-t border-neutral-800 shadow-2xl absolute w-full left-0">
          <div className="px-4 pt-4 pb-6 space-y-3">
            <Link href="/" onClick={() => setIsOpen(false)} className="block px-4 py-3 text-white hover:bg-neutral-800 rounded-lg">
              🏠 होम
            </Link>
            <Link href="/categories" onClick={() => setIsOpen(false)} className="block px-4 py-3 text-white hover:bg-neutral-800 rounded-lg">
              📑 श्रेणियां
            </Link>
            <Link href="/about" onClick={() => setIsOpen(false)} className="block px-4 py-3 text-white hover:bg-neutral-800 rounded-lg">
              ℹ️ हमारे बारे में
            </Link>
            <Link href="/contact" onClick={() => setIsOpen(false)} className="block px-4 py-3 text-white hover:bg-neutral-800 rounded-lg">
              📞 संपर्क करें
            </Link>
            <Link href="/privacy" onClick={() => setIsOpen(false)} className="block px-4 py-3 text-gray-400 hover:bg-neutral-800 rounded-lg text-sm">
              🔒 प्राइवेसी पालिसी
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}