'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import NotificationBell from '../NotificationBell';
import PWAInstallButton from '../PWAInstallButton';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { name: '🏠 होम', path: '/' },
    { name: '🌾 मंडी भाव', path: '/category/mandi-bhav' },
    { name: '📰 नागौर न्यूज़', path: '/category/nagaur-news' },
    { name: '📚 शिक्षा विभाग', path: '/category/education-dept' },
    { name: '🏛️ सरकारी योजना', path: '/category/schemes' },
    { name: '🎓 भर्ती व रिजल्ट', path: '/category/bharti-result' },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-neutral-950/80 backdrop-blur-md border-b border-white/10 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative h-12 w-12 sm:h-14 sm:w-14">
              <img
                src="/logo.png"
                alt="DailyDhandora Logo"
                className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-lg"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent group-hover:from-primary group-hover:to-orange-400 transition-all duration-300 leading-none">
                DailyDhandora
              </span>
              <span className="text-[10px] text-primary font-bold tracking-widest mt-0.5 uppercase block">
                नागौर का अपना डिजिटल पोर्टल
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            {menuItems.map((item, idx) => (
              <Link
                key={idx}
                href={item.path}
                className="text-white/70 hover:text-primary font-medium transition-colors duration-200 text-sm tracking-wide hover:bg-white/5 px-3 py-2 rounded-lg"
              >
                {item.name}
              </Link>
            ))}

            {/* Notification Bell */}
            <div className="border-l border-white/10 pl-6 flex items-center space-x-4">
              <PWAInstallButton />
              <NotificationBell />
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center space-x-2">
            <PWAInstallButton />
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
        <div className="lg:hidden bg-neutral-900 border-t border-neutral-800 shadow-2xl absolute w-full left-0">
          <div className="px-4 pt-4 pb-6 space-y-3">
            {menuItems.map((item, idx) => (
              <Link
                key={idx}
                href={item.path}
                onClick={() => setIsOpen(false)}
                className="block px-4 py-3 text-white hover:bg-neutral-800 rounded-lg"
              >
                {item.name}
              </Link>
            ))}
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
