'use client';

import { useEffect, useState } from 'react';

/**
 * 🎯 Google AdSense Script Injector
 * Fetches AdSense ID from admin settings and injects script dynamically
 */
export default function GoogleAdsScript() {
    const [adsId, setAdsId] = useState('');
    const [enabled, setEnabled] = useState(false);

    useEffect(() => {
        // Fetch Google Ads settings from API
        async function fetchSettings() {
            try {
                const res = await fetch('/api/admin/settings');
                const data = await res.json();
                if (data.googleAdsId && data.googleAdsEnabled) {
                    setAdsId(data.googleAdsId);
                    setEnabled(true);
                }
            } catch (err) {
                console.log('[GoogleAds] Settings fetch failed');
            }
        }
        fetchSettings();
    }, []);

    useEffect(() => {
        if (!enabled || !adsId) return;

        // Check if script already added
        if (document.querySelector(`script[src*="adsbygoogle"]`)) return;

        // Inject AdSense script
        const script = document.createElement('script');
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsId}`;
        script.async = true;
        script.crossOrigin = 'anonymous';
        document.head.appendChild(script);

        console.log(`[GoogleAds] Script injected with ID: ${adsId}`);
    }, [adsId, enabled]);

    // This component doesn't render anything visible
    return null;
}
