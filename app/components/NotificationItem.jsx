'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function NotificationItem({ notification, onNotificationClick }) {
  const [formattedDate, setFormattedDate] = useState('');

  useEffect(() => {
    // This effect runs only on the client, ensuring no mismatch
    setFormattedDate(new Date(notification.createdAt).toLocaleDateString('hi-IN'));
  }, [notification.createdAt]);

  return (
    <Link
      href={`/article/${notification.id}`}
      onClick={onNotificationClick}
      className="block p-4 hover:bg-gray-800 border-b border-gray-800"
    >
      <p className="font-semibold text-sm">{notification.title}</p>
      {formattedDate ? (
        <p className="text-xs text-gray-400 mt-1">
          {formattedDate}
        </p>
      ) : (
        // Render a placeholder on the server and initial client render
        <div className="w-24 h-4 bg-neutral-700 rounded animate-pulse mt-1"></div>
      )}
    </Link>
  );
}
