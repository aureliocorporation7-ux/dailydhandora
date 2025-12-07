'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import Link from 'next/link';
import NotificationItem from './NotificationItem';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;

    const articlesRef = collection(db, 'articles');
    const q = query(articlesRef, orderBy('createdAt', 'desc'), limit(10));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.().toISOString() || new Date().toISOString(),
      }));
      
      setNotifications(newNotifications);
      
      const lastSeen = localStorage.getItem('lastSeenNotification');
      if (lastSeen) {
        const count = newNotifications.filter(n => 
          new Date(n.createdAt) > new Date(lastSeen)
        ).length;
        setUnreadCount(count);
      } else {
        setUnreadCount(newNotifications.length);
      }
    });

    return () => unsubscribe();
  }, [hasMounted]);

  const markAllAsRead = () => {
    const now = new Date().toISOString();
    localStorage.setItem('lastSeenNotification', now);
    setUnreadCount(0);
  };

  const lastSeen = hasMounted ? localStorage.getItem('lastSeenNotification') : null;
  const unreadNotifications = notifications.filter(n => !lastSeen || new Date(n.createdAt) > new Date(lastSeen));

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 hover:bg-gray-800 rounded-full"
      >
        <span className="material-symbols-outlined">notifications</span>
        {hasMounted && unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-gray-900 rounded-lg shadow-lg border border-gray-800 z-50">
          <div className="p-4 border-b border-gray-800 flex justify-between items-center">
            <h3 className="font-bold">नई पोस्ट ({hasMounted ? unreadCount : 0})</h3>
            {hasMounted && unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-blue-500 text-sm hover:underline"
              >
                सभी को पढ़ा हुआ मार्क करें
              </button>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {hasMounted ? (
              unreadNotifications.length > 0 ? (
                unreadNotifications.map((notif) => (
                  <NotificationItem 
                    key={notif.id}
                    notification={notif}
                    onNotificationClick={() => setShowDropdown(false)}
                  />
                ))
              ) : (
                <p className="p-4 text-center text-gray-400">
                  आप पूरी तरह से अपडेट हैं!
                </p>
              )
            ) : (
              <p className="p-4 text-center text-gray-400">लोड हो रहा है...</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}