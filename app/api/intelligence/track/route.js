import { NextResponse } from 'next/server';
import { db, admin } from '@/lib/firebase';

/**
 * 🕵️ SUPREME INTELLIGENCE TRACK API (GOD LEVEL v2)
 * 
 * Handles 3 types of tracking:
 * 1. session_start - New session (only counted once per 30min)
 * 2. page_intel - Category-specific intelligence per page
 * 3. engagement - Time spent and bounce detection
 * 
 * Privacy: No PII stored. Only aggregated counters.
 */

// Get today's date in YYYY-MM-DD format (IST)
function getTodayIST() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

// Increment helper
const increment = (n = 1) => admin.firestore.FieldValue.increment(n);

export async function POST(request) {
    try {
        let body;
        const contentType = request.headers.get('content-type');

        // Handle both JSON and sendBeacon (text/plain)
        if (contentType?.includes('text/plain')) {
            const text = await request.text();
            body = JSON.parse(text);
        } else {
            body = await request.json();
        }

        const { type, guestId, sessionId, isNewUser, isReturning, category, categoryIntel, timeSpent, bounced } = body;

        const today = getTodayIST();
        const docRef = db.collection('daily_intelligence').doc(today);

        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(docRef);

            // Initialize document if doesn't exist
            if (!doc.exists) {
                transaction.set(docRef, {
                    date: today,
                    traffic: {
                        total_sessions: 0,
                        returning_users: 0,
                        new_users: 0,
                        bounces: 0,
                        total_time_spent: 0,
                        total_page_views: 0
                    },
                    mandi_intelligence: {
                        crops: {},
                        total_views: 0
                    },
                    career_intelligence: {
                        exams: {},
                        stages: {},
                        total_views: 0
                    },
                    scheme_intelligence: {
                        intents: {},
                        total_views: 0
                    },
                    education_intelligence: {
                        topics: {},
                        total_views: 0
                    },
                    news_intelligence: {
                        total_views: 0
                    },
                    category_distribution: {},
                    tracked_sessions: [], // For dedup
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }

            const data = doc.exists ? doc.data() : {};
            const updates = {};

            // ==========================================
            // SESSION START - Only count unique sessions
            // ==========================================
            if (type === 'session_start') {
                // Check if this session was already counted
                const trackedSessions = data.tracked_sessions || [];

                if (!trackedSessions.includes(sessionId)) {
                    // New unique session - count it!
                    updates['traffic.total_sessions'] = increment();

                    if (isNewUser) {
                        updates['traffic.new_users'] = increment();
                    }
                    if (isReturning) {
                        updates['traffic.returning_users'] = increment();
                    }

                    // Add to tracked sessions (keep last 500 for dedup)
                    const newTracked = [...trackedSessions.slice(-499), sessionId];
                    updates['tracked_sessions'] = newTracked;
                }
            }

            // ==========================================
            // PAGE INTEL - Category-specific tracking
            // ==========================================
            if (type === 'page_intel' && categoryIntel) {
                updates['traffic.total_page_views'] = increment();

                // Category distribution
                if (category) {
                    const safeCategory = category.replace(/\./g, '_');
                    updates[`category_distribution.${safeCategory}`] = increment();
                }

                // 🌾 MANDI INTELLIGENCE
                if (categoryIntel.type === 'mandi') {
                    updates['mandi_intelligence.total_views'] = increment();
                    if (categoryIntel.crop) {
                        updates[`mandi_intelligence.crops.${categoryIntel.crop}`] = increment();
                    }
                }

                // 🎓 CAREER INTELLIGENCE
                if (categoryIntel.type === 'career') {
                    updates['career_intelligence.total_views'] = increment();
                    if (categoryIntel.exam) {
                        updates[`career_intelligence.exams.${categoryIntel.exam}`] = increment();
                    }
                    if (categoryIntel.stage) {
                        updates[`career_intelligence.stages.${categoryIntel.stage}`] = increment();
                    }
                }

                // 🏛️ SCHEME INTELLIGENCE
                if (categoryIntel.type === 'scheme') {
                    updates['scheme_intelligence.total_views'] = increment();
                    if (categoryIntel.intent) {
                        updates[`scheme_intelligence.intents.${categoryIntel.intent}`] = increment();
                    }
                }

                // 📚 EDUCATION INTELLIGENCE
                if (categoryIntel.type === 'education') {
                    updates['education_intelligence.total_views'] = increment();
                    if (categoryIntel.topic) {
                        updates[`education_intelligence.topics.${categoryIntel.topic}`] = increment();
                    }
                }

                // 📰 NEWS INTELLIGENCE
                if (category === 'नागौर न्यूज़') {
                    updates['news_intelligence.total_views'] = increment();
                }
            }

            // ==========================================
            // ENGAGEMENT TRACKING
            // ==========================================
            if (type === 'engagement') {
                if (timeSpent && timeSpent > 0) {
                    updates['traffic.total_time_spent'] = increment(timeSpent);
                }
                if (bounced) {
                    updates['traffic.bounces'] = increment();
                }
            }

            // Apply all updates atomically
            if (Object.keys(updates).length > 0) {
                transaction.update(docRef, updates);
            }
        });

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error) {
        console.error('[Intelligence Track] Error:', error.message);
        return NextResponse.json({ success: false }, { status: 200 });
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
