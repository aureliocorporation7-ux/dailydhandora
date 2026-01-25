'use client';

import { useState, useEffect } from 'react';

/**
 * 📱 MULTI-PLATFORM SHARE BUTTONS
 * 
 * Features:
 * - WhatsApp, Telegram, Twitter/X, Copy Link
 * - Pre-formatted viral messages
 * - UTM tracking for analytics
 * - Copy success feedback
 */
export default function ShareButtons({ article, layout = 'horizontal' }) {
    const [copied, setCopied] = useState(false);
    const [shareUrl, setShareUrl] = useState('');

    useEffect(() => {
        setShareUrl(`${window.location.href}?utm_source=share&utm_medium=social`);
    }, []);

    const headline = article.title || article.headline || 'ताज़ा खबर';

    // 📲 WHATSAPP SHARE
    const shareWhatsApp = () => {
        const viralMessage = `🔴 *${headline}*

📰 DailyDhandora से ताज़ा खबर

👉 पढ़ें: ${shareUrl}?utm_source=whatsapp

📲 रोज़ ताज़ा खबरों के लिए DailyDhandora Install करें!`;

        window.open(`https://wa.me/?text=${encodeURIComponent(viralMessage)}`, '_blank');
    };

    // ✈️ TELEGRAM SHARE
    const shareTelegram = () => {
        const text = encodeURIComponent(`🔴 ${headline}`);
        const url = encodeURIComponent(`${shareUrl}?utm_source=telegram`);
        window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
    };

    // 🐦 TWITTER/X SHARE
    const shareTwitter = () => {
        const text = encodeURIComponent(`🔴 ${headline}\n\n📰 via @DailyDhandora`);
        const url = encodeURIComponent(`${shareUrl}?utm_source=twitter`);
        window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
    };

    // 📋 COPY LINK
    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(`${shareUrl}?utm_source=copy`);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = shareUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // 📤 NATIVE SHARE (Mobile)
    const nativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: headline,
                    text: `📰 ${headline} - DailyDhandora से ताज़ा खबर`,
                    url: `${shareUrl}?utm_source=native`
                });
            } catch (err) {
                // User cancelled share
            }
        }
    };

    const buttonClasses = "flex items-center justify-center gap-2 rounded-xl font-bold py-3 px-4 transition-all hover:scale-105 shadow-md";

    if (layout === 'vertical') {
        return (
            <div className="flex flex-col gap-3 w-full">
                <button onClick={shareWhatsApp} className={`${buttonClasses} bg-[#25D366] text-white hover:bg-[#128C7E]`}>
                    <WhatsAppIcon /> WhatsApp
                </button>
                <button onClick={shareTelegram} className={`${buttonClasses} bg-[#0088cc] text-white hover:bg-[#006699]`}>
                    <TelegramIcon /> Telegram
                </button>
                <button onClick={shareTwitter} className={`${buttonClasses} bg-black text-white hover:bg-neutral-800`}>
                    <TwitterIcon /> Twitter/X
                </button>
                <button onClick={copyLink} className={`${buttonClasses} bg-neutral-700 text-white hover:bg-neutral-600`}>
                    <CopyIcon /> {copied ? '✅ Copied!' : 'Copy Link'}
                </button>
            </div>
        );
    }

    // Horizontal layout (default)
    return (
        <div className="flex items-center gap-2 flex-wrap">
            {/* Native Share Button (Mobile Only) */}
            {typeof navigator !== 'undefined' && navigator.share && (
                <button
                    onClick={nativeShare}
                    className="flex items-center gap-2 rounded-full bg-primary text-white font-bold px-5 py-3 hover:bg-primary/80 transition-all shadow-lg"
                >
                    <ShareIcon /> शेयर करें
                </button>
            )}

            {/* WhatsApp - Primary */}
            <button
                onClick={shareWhatsApp}
                className="flex items-center gap-2 rounded-full bg-[#25D366] text-white font-bold px-5 py-3 hover:bg-[#128C7E] transition-all shadow-lg hover:scale-105"
                title="WhatsApp पर शेयर करें"
            >
                <WhatsAppIcon />
                <span className="hidden sm:inline">WhatsApp</span>
            </button>

            {/* Telegram */}
            <button
                onClick={shareTelegram}
                className="flex items-center justify-center rounded-full bg-[#0088cc] text-white p-3 hover:bg-[#006699] transition-all shadow-lg hover:scale-105"
                title="Telegram पर शेयर करें"
            >
                <TelegramIcon />
            </button>

            {/* Twitter/X */}
            <button
                onClick={shareTwitter}
                className="flex items-center justify-center rounded-full bg-black text-white p-3 hover:bg-neutral-800 transition-all shadow-lg hover:scale-105"
                title="Twitter/X पर शेयर करें"
            >
                <TwitterIcon />
            </button>

            {/* Copy Link */}
            <button
                onClick={copyLink}
                className={`flex items-center justify-center rounded-full p-3 transition-all shadow-lg hover:scale-105 ${copied ? 'bg-green-600 text-white' : 'bg-neutral-700 text-white hover:bg-neutral-600'}`}
                title={copied ? 'Copied!' : 'Link Copy करें'}
            >
                {copied ? <CheckIcon /> : <CopyIcon />}
            </button>
        </div>
    );
}

// 🎨 ICONS
const WhatsAppIcon = () => (
    <svg fill="currentColor" height="20" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.371-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01s-.521.074-.792.372c-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"></path></svg>
);

const TelegramIcon = () => (
    <svg fill="currentColor" height="20" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
);

const TwitterIcon = () => (
    <svg fill="currentColor" height="18" viewBox="0 0 24 24" width="18" xmlns="http://www.w3.org/2000/svg"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
);

const CopyIcon = () => (
    <svg fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg"><rect height="13" rx="2" ry="2" width="13" x="9" y="9" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
);

const CheckIcon = () => (
    <svg fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg"><polyline points="20 6 9 17 4 12" /></svg>
);

const ShareIcon = () => (
    <svg fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" x2="15.42" y1="13.51" y2="17.49" /><line x1="15.41" x2="8.59" y1="6.51" y2="10.49" /></svg>
);
