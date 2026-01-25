'use client';

import { useEffect, useState } from 'react';

/**
 * 📲 ENHANCED WHATSAPP SHARE BUTTON
 * Features:
 * - Viral message format with emojis
 * - Pre-formatted headline + URL
 * - UTM tracking for analytics
 */
export default function WhatsAppShareButton({ article, variant = 'full' }) {
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    // Build base URL with UTM tracking
    const articleUrl = `${window.location.href}?utm_source=whatsapp&utm_medium=share&utm_campaign=viral`;

    // 🔥 VIRAL MESSAGE FORMAT
    const viralMessage = `🔴 *${article.title || article.headline}*

📰 DailyDhandora से ताज़ा खबर

👉 पूरी खबर पढ़ें:
${articleUrl}

📲 रोज़ ताज़ा खबरों के लिए DailyDhandora PWA Install करें!`;

    const text = encodeURIComponent(viralMessage);
    setShareUrl(`https://wa.me/?text=${text}`);
  }, [article.title, article.headline]);

  const handleClick = () => {
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  // Compact variant for article cards
  if (variant === 'compact') {
    return (
      <button
        onClick={handleClick}
        className="flex items-center justify-center gap-2 rounded-full bg-[#25D366] text-white font-bold px-4 py-2 text-sm hover:bg-[#128C7E] transition-all shadow-lg hover:scale-105"
        title="WhatsApp पर शेयर करें"
      >
        <svg fill="currentColor" height="18" viewBox="0 0 24 24" width="18" xmlns="http://www.w3.org/2000/svg"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.371-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01s-.521.074-.792.372c-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"></path></svg>
        <span>शेयर</span>
      </button>
    );
  }

  // Full variant for article page
  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white font-bold py-4 text-lg hover:from-[#128C7E] hover:to-[#075E54] transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]"
    >
      <svg fill="currentColor" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.371-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01s-.521.074-.792.372c-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"></path></svg>
      <span>📲 WhatsApp पर शेयर करें</span>
    </button>
  );
}
