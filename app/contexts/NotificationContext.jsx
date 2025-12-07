'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase-client';

const NotificationContext = createContext();

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastChecked, setLastChecked] = useState(null);

  // On initial load, get the last checked timestamp from localStorage
  useEffect(() => {
    const storedTimestamp = localStorage.getItem('lastNotificationCheck');
    if (storedTimestamp) {
      setLastChecked(new Timestamp(parseInt(storedTimestamp, 10), 0));
    } else {
      // If it's the user's first visit, set the timestamp to now.
      // They won't get a flood of old articles as "new".
      const now = Timestamp.now();
      localStorage.setItem('lastNotificationCheck', now.seconds.toString());
      setLastChecked(now);
    }
  }, []);

  // This is the real-time listener for new articles
  useEffect(() => {
    // Don't run the query until we have the lastChecked timestamp from localStorage
    if (!lastChecked) {
      return;
    }

    const articlesRef = collection(db, 'articles');
    // We query for articles created after the user last checked, ordered by creation time
    const q = query(
      articlesRef,
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newArticles = [];
      snapshot.forEach(doc => {
        const article = { id: doc.id, ...doc.data() };
        // Ensure createdAt is a valid Timestamp object before comparing
        if (article.createdAt && article.createdAt.seconds > lastChecked.seconds) {
          newArticles.push(article);
        }
      });
      
      setNotifications(newArticles);
      setUnreadCount(newArticles.length);
    });

    // Cleanup the listener when the component unmounts
    return () => unsubscribe();
  }, [lastChecked]);

  const markAllAsRead = () => {
    const now = Timestamp.now();
    localStorage.setItem('lastNotificationCheck', now.seconds.toString());
    setLastChecked(now);
    setNotifications([]);
    setUnreadCount(0);
  };

  const value = {
    notifications,
    unreadCount,
    markAllAsRead,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
