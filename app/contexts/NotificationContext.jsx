'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase-client'; // ← FIXED: Use client SDK

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastSeenTimestamp, setLastSeenTimestamp] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load last seen timestamp from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = localStorage.getItem('lastSeenArticleTimestamp');
    if (stored) {
      setLastSeenTimestamp(new Date(stored));
    } else {
      const now = new Date();
      setLastSeenTimestamp(now);
      localStorage.setItem('lastSeenArticleTimestamp', now.toISOString());
    }
    setIsLoading(false);
  }, []);

  // Subscribe to real-time article updates
  useEffect(() => {
    if (!lastSeenTimestamp || isLoading) return;

    const articlesRef = collection(db, 'articles');
    const q = query(
      articlesRef,
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const articles = [];
        const lastSeen = lastSeenTimestamp;

        snapshot.forEach((doc) => {
          const data = doc.data();
          const articleDate = data.createdAt?.toDate();

          if (articleDate && articleDate > lastSeen) {
            articles.push({
              id: doc.id,
              ...data,
              createdAt: articleDate,
              isUnread: true,
            });
          }
        });

        setNotifications(articles);
        setUnreadCount(articles.length);
      },
      (error) => {
        console.error('Notification snapshot error:', error);
      }
    );

    return () => unsubscribe();
  }, [lastSeenTimestamp, isLoading]);

  const markAllAsRead = () => {
    if (typeof window === 'undefined') return;
    const now = new Date();
    setLastSeenTimestamp(now);
    localStorage.setItem('lastSeenArticleTimestamp', now.toISOString());
    setUnreadCount(0);
    setNotifications([]);
  };

  const markAsRead = (articleId) => {
    setNotifications((prev) => prev.filter((n) => n.id !== articleId));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAllAsRead,
        markAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
