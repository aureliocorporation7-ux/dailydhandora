'use client';

import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '@/app/contexts/NotificationContext';
import { Bell, X } from 'lucide-react';
import Link from 'next/link';
import NotificationItem from './NotificationItem';
import {
  isNotificationSupported,
  getNotificationPermission,
  subscribeToNotifications
} from '@/lib/fcm';

export default function NotificationBell() {
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [showEnableGuide, setShowEnableGuide] = useState(false);
  const [pushStatus, setPushStatus] = useState('unknown');
  const dropdownRef = useRef(null);

  // Check push permission status on mount
  useEffect(() => {
    if (isNotificationSupported()) {
      setPushStatus(getNotificationPermission());
    } else {
      setPushStatus('unsupported');
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowEnableGuide(false);
      }
    }

    if (isOpen || showEnableGuide) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, showEnableGuide]);

  const toggleDropdown = async () => {
    const currentPermission = isNotificationSupported() ? getNotificationPermission() : 'unsupported';

    // If permission is denied, show the enable guide
    if (currentPermission === 'denied') {
      setShowEnableGuide(true);
      setPushStatus('denied');
      return;
    }

    // If not granted yet, try to subscribe
    if (currentPermission === 'default') {
      console.log('🔔 Bell: Requesting push permission...');
      const result = await subscribeToNotifications();
      if (result.success) {
        setPushStatus('granted');
        console.log('🔔 Bell: Push subscription successful!');
      } else {
        const newPermission = getNotificationPermission();
        setPushStatus(newPermission);
        // If denied after prompt, show guide
        if (newPermission === 'denied') {
          setShowEnableGuide(true);
          return;
        }
      }
    }
    // If permission was denied before but now granted
    else if (currentPermission === 'granted' && pushStatus !== 'granted') {
      console.log('🔔 Bell: Permission now granted! Subscribing...');
      const result = await subscribeToNotifications();
      if (result.success) {
        setPushStatus('granted');
      }
    }

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

  const closeEnableGuide = () => {
    setShowEnableGuide(false);
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

      {/* Enable Notifications Guide Modal */}
      {showEnableGuide && (
        <div className="fixed left-2 right-2 top-[70px] lg:absolute lg:left-auto lg:right-0 lg:top-full lg:mt-2 w-auto lg:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-primary to-orange-600 p-6 text-center relative">
            <button
              onClick={closeEnableGuide}
              className="absolute top-3 right-3 p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-white" />
            </div>

            <h2 className="text-xl font-bold text-white mb-1">
              🔔 नोटिफिकेशन Block हैं
            </h2>
            <p className="text-white/80 text-sm">
              Enable करने के लिए नीचे देखें
            </p>
          </div>

          {/* Content - Steps */}
          <div className="p-6">
            <p className="text-gray-600 text-sm mb-4">
              आपने पहले नोटिफिकेशन Block कर दिए थे। Enable करने के लिए:
            </p>

            <div className="space-y-3">
              {/* Step 1 */}
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
                <div>
                  <p className="text-gray-800 font-medium text-sm">Address bar में 🔒 Lock icon पर Click करें</p>
                  <p className="text-gray-500 text-xs mt-0.5">URL के बायीं तरफ दिखता है</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
                <div>
                  <p className="text-gray-800 font-medium text-sm">"Site settings" पर Click करें</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
                <div>
                  <p className="text-gray-800 font-medium text-sm">Notifications → <span className="text-green-600 font-bold">Allow</span> करें</p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">4</span>
                <div>
                  <p className="text-gray-800 font-medium text-sm">Page Refresh करें और 🔔 फिर से Click करें</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 mt-4 border-t">
              <button
                onClick={closeEnableGuide}
                className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
              >
                समझ गया 👍
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dropdown Panel */}
      {isOpen && !showEnableGuide && (
        <div className="fixed left-2 right-2 top-[70px] lg:absolute lg:left-auto lg:right-0 lg:top-full lg:mt-2 w-auto lg:w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 max-h-[80vh] lg:max-h-[600px] overflow-hidden">
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
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClick={() => handleNotificationClick(notification.id)}
                  />
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