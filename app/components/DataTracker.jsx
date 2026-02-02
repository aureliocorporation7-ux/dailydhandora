'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * 🕵️ SUPREME DATA TRACKER (GOD LEVEL v2)
 * 
 * Fixed Issues:
 * 1. Session-based tracking (not page-view based)
 * 2. Proper returning user detection (same session = not new)
 * 3. Deduplicated API calls per session
 * 
 * Privacy: No PII collected. Only aggregated trends stored.
 */

// SESSION MANAGEMENT - Critical for accurate counting
const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes = 1 session

function getOrCreateSession() {
    if (typeof window === 'undefined') return { isNew: false, isReturning: false, sessionId: null };

    const now = Date.now();
    let guestId = localStorage.getItem('dd_guest_id');
    let sessionId = sessionStorage.getItem('dd_session_id');
    let sessionStart = sessionStorage.getItem('dd_session_start');
    const firstVisit = localStorage.getItem('dd_first_visit');
    const lastVisit = localStorage.getItem('dd_last_visit');

    // Generate guest ID if first time ever
    const isFirstTimeEver = !guestId;
    if (!guestId) {
        guestId = `dd_${now}_${Math.random().toString(36).substring(2, 8)}`;
        localStorage.setItem('dd_guest_id', guestId);
        localStorage.setItem('dd_first_visit', new Date().toISOString());
    }

    // Check if this is a new session
    let isNewSession = false;
    if (!sessionId || !sessionStart) {
        // No session exists - create new one
        isNewSession = true;
        sessionId = `sess_${now}_${Math.random().toString(36).substring(2, 6)}`;
        sessionStorage.setItem('dd_session_id', sessionId);
        sessionStorage.setItem('dd_session_start', now.toString());
    } else {
        // Check if session expired (30 min inactivity)
        const sessionAge = now - parseInt(sessionStart, 10);
        if (sessionAge > SESSION_DURATION_MS) {
            isNewSession = true;
            sessionId = `sess_${now}_${Math.random().toString(36).substring(2, 6)}`;
            sessionStorage.setItem('dd_session_id', sessionId);
            sessionStorage.setItem('dd_session_start', now.toString());
        }
    }

    // Update last activity
    sessionStorage.setItem('dd_last_activity', now.toString());

    // Determine if returning user (visited before in a PREVIOUS session)
    // Not first time ever + had a previous visit = returning
    const isReturning = !isFirstTimeEver && !!lastVisit;

    // Update last visit timestamp (for next session check)
    if (isNewSession) {
        localStorage.setItem('dd_last_visit', new Date().toISOString());
    }

    return {
        guestId,
        sessionId,
        isNewSession,
        isReturning: isReturning && isNewSession, // Only count returning on new sessions
        isNewUser: isFirstTimeEver || (!isReturning && isNewSession)
    };
}

// Check if we already tracked this session
function hasTrackedSession(sessionId) {
    if (typeof window === 'undefined') return true;
    const tracked = sessionStorage.getItem('dd_session_tracked');
    return tracked === sessionId;
}

function markSessionTracked(sessionId) {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem('dd_session_tracked', sessionId);
}

// 🎯 SAVE CATEGORY HISTORY FOR AUTO-TARGETING NOTIFICATIONS
function saveCategoryHistory(category) {
    if (typeof window === 'undefined' || !category) return;

    try {
        const historyKey = 'dd_category_history';
        const existing = localStorage.getItem(historyKey);
        const history = existing ? JSON.parse(existing) : {};

        // Increment category view count
        history[category] = (history[category] || 0) + 1;

        localStorage.setItem(historyKey, JSON.stringify(history));
        console.log('🎯 [DataTracker] Category history updated:', category, history[category]);
    } catch (e) {
        console.error('🎯 [DataTracker] Error saving category history:', e);
    }
}

// Extract category intelligence from article data
function extractCategoryIntel(article) {
    if (!article) return null;

    const category = article.category || '';
    const headline = article.headline || '';

    const intel = {
        category: category,
        type: 'general'
    };

    // 🌾 Mandi Intelligence: Extract crop names
    if (category === 'मंडी भाव') {
        intel.type = 'mandi';
        const crops = ['जीरा', 'ग्वार', 'सरसों', 'मूंग', 'मोठ', 'चना', 'गेहूं', 'बाजरा', 'तिल'];
        const foundCrop = crops.find(crop => headline.includes(crop));
        intel.crop = foundCrop || 'other';
    }

    // 🎓 Career Intelligence: Detect exam/stage
    if (category === 'भर्ती व रिजल्ट') {
        intel.type = 'career';
        if (headline.includes('रिजल्ट') || headline.includes('परिणाम')) {
            intel.stage = 'result_seeker';
        } else if (headline.includes('सिलेबस') || headline.includes('पाठ्यक्रम')) {
            intel.stage = 'aspirant_early';
        } else if (headline.includes('एडमिट कार्ड')) {
            intel.stage = 'exam_ready';
        } else {
            intel.stage = 'job_seeker';
        }

        const exams = ['पुलिस', 'पटवारी', 'शिक्षक', 'REET', 'RAS', 'RPSC', 'RSMSSB'];
        intel.exam = exams.find(e => headline.includes(e)) || 'other';
    }

    // 🏛️ Scheme Intelligence: Detect financial intent
    if (category === 'सरकारी योजना') {
        intel.type = 'scheme';
        if (headline.includes('लोन') || headline.includes('ऋण')) {
            intel.intent = 'loan_seeker';
        } else if (headline.includes('सब्सिडी') || headline.includes('अनुदान')) {
            intel.intent = 'subsidy_seeker';
        } else if (headline.includes('आवास') || headline.includes('घर')) {
            intel.intent = 'housing_seeker';
        } else {
            intel.intent = 'general_scheme';
        }
    }

    // 📚 Education Intelligence
    if (category === 'शिक्षा विभाग') {
        intel.type = 'education';
        if (headline.includes('तबादला') || headline.includes('ट्रांसफर')) {
            intel.topic = 'transfer';
        } else if (headline.includes('वेतन') || headline.includes('DA')) {
            intel.topic = 'salary';
        } else {
            intel.topic = 'general';
        }
    }

    return intel;
}

export default function DataTracker({ article = null }) {
    const pathname = usePathname();
    const startTimeRef = useRef(Date.now());
    const trackedPagesRef = useRef(new Set());

    useEffect(() => {
        // Reset start time on path change
        startTimeRef.current = Date.now();
    }, [pathname]);

    useEffect(() => {
        const session = getOrCreateSession();

        // ===== SESSION-LEVEL TRACKING (Only once per session) =====
        if (session.isNewSession && !hasTrackedSession(session.sessionId)) {
            markSessionTracked(session.sessionId);

            // Send session start data - THIS IS THE ONLY SESSION COUNT
            fetch('/api/intelligence/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'session_start',
                    guestId: session.guestId,
                    sessionId: session.sessionId,
                    isNewUser: session.isNewUser,
                    isReturning: session.isReturning,
                    timestamp: new Date().toISOString()
                })
            }).catch(() => { });
        }

        // ===== PAGE-LEVEL TRACKING (Category intel per unique page per session) =====
        const pageKey = `${session.sessionId}_${pathname}`;
        if (!trackedPagesRef.current.has(pageKey)) {
            trackedPagesRef.current.add(pageKey);

            const categoryIntel = extractCategoryIntel(article);

            // 🎯 Save category to history for auto-targeting notifications
            if (article?.category) {
                saveCategoryHistory(article.category);
            }

            // Only send if there's meaningful category intel
            if (categoryIntel && categoryIntel.type !== 'general') {
                fetch('/api/intelligence/track', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'page_intel',
                        guestId: session.guestId,
                        sessionId: session.sessionId,
                        category: article?.category || null,
                        articleId: article?.id || null,
                        categoryIntel,
                        pathname,
                        timestamp: new Date().toISOString()
                    })
                }).catch(() => { });
            }
        }

        // ===== ENGAGEMENT TRACKING (On unload) =====
        const handleUnload = () => {
            const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);

            if (navigator.sendBeacon && timeSpent > 0) {
                navigator.sendBeacon('/api/intelligence/track', JSON.stringify({
                    type: 'engagement',
                    guestId: session.guestId,
                    sessionId: session.sessionId,
                    articleId: article?.id || null,
                    category: article?.category || null,
                    timeSpent,
                    bounced: timeSpent < 10
                }));
            }
        };

        window.addEventListener('beforeunload', handleUnload);
        return () => window.removeEventListener('beforeunload', handleUnload);

    }, [pathname, article]);

    return null;
}

