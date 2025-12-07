'use client';

import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import { Bell, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function NotificationBell() {
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleMarkAllRead = () => {
    markAllAsRead();
    setIsOpen(false);
  };

  const handleNotificationClick = (articleId) => {
    markAsRead(articleId);
    setIsOpen(false);
  };

  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'अभी-अभी';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} मिनट पहले`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} घंटे पहले`;
    return `${Math.floor(seconds / 86400)} दिन पहले`;
  };

  return (
    <div className="relative" ref={dropdownRef} suppressHydrationWarning>
      {/* Bell Icon Button - Styled for Navbar */}
      <button
        onClick={toggleDropdown}
        className="relative p-2 text-white hover:text-yellow-200 transition-colors duration-200 rounded-full hover:bg-white/10"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6" />
        
        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-orange-600 bg-white rounded-full min-w-[20px] shadow-lg animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 max-h-[600px] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-red-50">
            <div>
              <h3 className="text-lg font-bold text-gray-900">🔔 नोटिफिकेशन</h3>
              {unreadCount > 0 && (
                <p className="text-sm text-gray-600">{unreadCount} नए आर्टिकल</p>
              )}
            </div>
            
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-sm text-orange-600 hover:text-orange-700 font-medium transition-colors"
              >
                सभी पढ़ा मार्क करें
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto max-h-[500px] custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Bell className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium mb-1">कोई नया आर्टिकल नहीं</p>
                <p className="text-sm text-gray-500">जब नए आर्टिकल पब्लिश होंगे, आपको यहाँ दिखेंगे</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <Link
                    key={notification.id}
                    href={`/article/${notification.id}`}
                    onClick={() => handleNotificationClick(notification.id)}
                    className="block hover:bg-orange-50 transition-colors duration-150"
                  >
                    <div className="p-4 flex gap-3">
                      {/* Article Image */}
                      <div className="flex-shrink-0">
                        <div className="w-16 h-16 relative rounded-lg overflow-hidden bg-gray-200">
                          {notification.imageUrl ? (
                            <Image
                              src={notification.imageUrl}
                              alt={notification.title}
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              📰
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1">
                          {notification.title}
                        </p>
                        
                        {notification.category && (
                          <span className="inline-block px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 rounded mb-1">
                            {notification.category}
                          </span>
                        )}
                        
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                          {formatTimeAgo(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-center">
              <Link
                href="/"
                onClick={() => setIsOpen(false)}
                className="text-sm text-orange-600 hover:text-orange-700 font-medium transition-colors"
              >
                सभी आर्टिकल देखें →
              </Link>
            </div>
          )}
        </div>
      )}


    </div>
  );
}