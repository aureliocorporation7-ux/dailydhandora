'use client';

import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import Link from 'next/link';
import Image from 'next/image';

export default function NotificationBell() {
  const { notifications, unreadCount, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleMarkReadAndClose = () => {
    markAllAsRead();
    setIsOpen(false);
  };

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTimeAgo = (timestamp) => {
    if (!timestamp || !timestamp.seconds) return '';
    const date = timestamp.toDate();
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'अभी-अभी';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} मिनट पहले`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} घंटे पहले`;
    return `${Math.floor(seconds / 86400)} दिन पहले`;
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={toggleDropdown}
        className="flex items-center justify-center rounded-full h-10 w-10 text-primary hover:bg-neutral-900 transition-colors relative"
        aria-label="Notifications"
      >
        <span className="material-symbols-outlined text-2xl">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl z-50">
          <div className="flex items-center justify-between p-3 border-b border-neutral-800">
            <h3 className="font-bold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkReadAndClose} className="text-sm text-primary hover:underline">
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map(article => (
                <Link key={article.id} href={`/article/${article.id}`} onClick={() => setIsOpen(false)}>
                  <div className="p-3 border-b border-neutral-800 hover:bg-neutral-800 transition-colors flex items-start gap-3">
                    <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0 bg-neutral-800 relative">
                      {article.imageUrl && (
                        <Image
                          src={article.imageUrl}
                          alt={article.title}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-semibold line-clamp-2 text-sm">{article.title}</p>
                      <p className="text-neutral-400 text-xs mt-1" suppressHydrationWarning>
                        {formatTimeAgo(article.createdAt)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-8 text-center">
                <p className="text-neutral-400">You're all caught up!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
