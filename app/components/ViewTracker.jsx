'use client';

import { useEffect, useRef } from 'react';

export default function ViewTracker({ id }) {
  const hasFired = useRef(false);

  useEffect(() => {
    if (hasFired.current) return;
    hasFired.current = true;

    const incrementView = async () => {
      console.log(`👀 Tracking View for Article: ${id}`);
      try {
        const res = await fetch('/api/articles/view', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
          keepalive: true 
        });
        
        if (res.ok) {
            console.log("✅ View Counted Successfully");
        } else {
            console.error("❌ View Count Failed", await res.json());
        }
      } catch (err) {
        console.error('Failed to track view', err);
      }
    };

    incrementView();
  }, [id]);

  return null; 
}
