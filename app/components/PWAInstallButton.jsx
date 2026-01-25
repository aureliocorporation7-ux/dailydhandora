'use client';

import { useState, useEffect } from 'react';
import { Download, Smartphone } from 'lucide-react';

export default function PWAInstallButton() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        // Check if device is iOS
        const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        setIsIOS(isIosDevice);

        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsVisible(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // For debugging/demo purposes in dev mode if PWA is forced
        if (process.env.NODE_ENV === 'development') {
            setIsVisible(true);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstallClick = async () => {
        if (isIOS) {
            // Show a nice modal or tooltip for iOS users (Add to Home Screen)
            // For now, let's alert or we could build a specific iOS instructional modal
            alert("iOS पर ऐप इंस्टॉल करने के लिए: 'Share' बटन दबाएं और 'Add to Home Screen' चुनें।");
            return;
        }

        if (!deferredPrompt) {
            // Fallback or dev mode behavior
            console.log("Install prompt not available");
            return;
        }

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        setDeferredPrompt(null);
        setIsVisible(false);
    };

    if (!isVisible && !isIOS) return null;

    return (
        <>
            {/* Mobile: Sleek Icon Button with Glow */}
            <button
                onClick={handleInstallClick}
                className="lg:hidden relative group flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-neutral-800 to-neutral-900 border border-white/10 hover:border-primary/50 shadow-lg shadow-black/50 transition-all duration-300"
                aria-label="Install App"
            >
                <div className="absolute inset-0 rounded-full bg-primary/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <Smartphone className="w-5 h-5 text-primary group-hover:scale-110 transition-transform duration-300" />
            </button>

            {/* Desktop: Premium Gradient Pill */}
            <button
                onClick={handleInstallClick}
                className="hidden lg:flex items-center space-x-2 bg-gradient-to-r from-neutral-900 to-neutral-800 hover:from-primary hover:to-orange-600 text-white border border-white/10 hover:border-transparent px-4 py-2 rounded-full transition-all duration-300 shadow-lg group relative overflow-hidden"
                aria-label="Install App"
            >
                {/* Shimmer Effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent z-10"></div>

                <Download className="w-4 h-4 text-primary group-hover:text-white transition-colors duration-300" />
                <span className="text-sm font-medium tracking-wide group-hover:font-semibold">Install App</span>
            </button>
        </>
    );
}
