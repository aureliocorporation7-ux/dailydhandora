import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

/**
 * 🏛️ INTELLIGENCE DASHBOARD API
 * 
 * Returns aggregated business intelligence for admin dashboard.
 * Provides: Traffic trends, Category insights, Top metrics
 */

// Get date in YYYY-MM-DD format (IST)
function getDateIST(daysAgo = 0) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const days = parseInt(searchParams.get('days') || '7', 10);

        // Fetch last N days of intelligence data
        const dates = [];
        for (let i = 0; i < days; i++) {
            dates.push(getDateIST(i));
        }

        const docs = await Promise.all(
            dates.map(date => db.collection('daily_intelligence').doc(date).get())
        );

        const dailyData = docs
            .filter(doc => doc.exists)
            .map(doc => ({ date: doc.id, ...doc.data() }));

        // ==========================================
        // AGGREGATE CALCULATIONS
        // ==========================================

        const todayData = dailyData.find(d => d.date === getDateIST(0)) || {};

        // Traffic Summary
        const traffic = {
            today: {
                sessions: todayData.traffic?.total_sessions || 0,
                new_users: todayData.traffic?.new_users || 0,
                returning: todayData.traffic?.returning_users || 0,
                bounces: todayData.traffic?.bounces || 0,
                avgTimeSpent: todayData.traffic?.total_time_spent && todayData.traffic?.total_sessions
                    ? Math.round(todayData.traffic.total_time_spent / todayData.traffic.total_sessions)
                    : 0
            },
            weekly: {
                sessions: dailyData.reduce((sum, d) => sum + (d.traffic?.total_sessions || 0), 0),
                new_users: dailyData.reduce((sum, d) => sum + (d.traffic?.new_users || 0), 0),
                returning: dailyData.reduce((sum, d) => sum + (d.traffic?.returning_users || 0), 0)
            }
        };

        // 🌾 Mandi Intelligence (Aggregated crops)
        const cropCounts = {};
        dailyData.forEach(d => {
            if (d.mandi_intelligence?.crops) {
                Object.entries(d.mandi_intelligence.crops).forEach(([crop, count]) => {
                    cropCounts[crop] = (cropCounts[crop] || 0) + count;
                });
            }
        });
        const topCrops = Object.entries(cropCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, views]) => ({ name, views }));

        // 🎓 Career Intelligence (Aggregated exams & stages)
        const examCounts = {};
        const stageCounts = {};
        dailyData.forEach(d => {
            if (d.career_intelligence?.exams) {
                Object.entries(d.career_intelligence.exams).forEach(([exam, count]) => {
                    examCounts[exam] = (examCounts[exam] || 0) + count;
                });
            }
            if (d.career_intelligence?.stages) {
                Object.entries(d.career_intelligence.stages).forEach(([stage, count]) => {
                    stageCounts[stage] = (stageCounts[stage] || 0) + count;
                });
            }
        });
        const topExams = Object.entries(examCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, views]) => ({ name, views }));

        // 🏛️ Scheme Intelligence (Aggregated intents)
        const intentCounts = {};
        dailyData.forEach(d => {
            if (d.scheme_intelligence?.intents) {
                Object.entries(d.scheme_intelligence.intents).forEach(([intent, count]) => {
                    intentCounts[intent] = (intentCounts[intent] || 0) + count;
                });
            }
        });
        const topIntents = Object.entries(intentCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

        // Category Distribution (Today)
        const categoryDist = todayData.category_distribution || {};

        // Daily Trend (for chart)
        const dailyTrend = dailyData.reverse().map(d => ({
            date: d.date,
            sessions: d.traffic?.total_sessions || 0,
            mandi: d.mandi_intelligence?.total_views || 0,
            career: d.career_intelligence?.total_views || 0,
            scheme: d.scheme_intelligence?.total_views || 0,
            news: d.news_intelligence?.total_views || 0
        }));

        return NextResponse.json({
            traffic,
            mandi: {
                topCrops,
                totalViews: dailyData.reduce((sum, d) => sum + (d.mandi_intelligence?.total_views || 0), 0)
            },
            career: {
                topExams,
                stages: stageCounts,
                totalViews: dailyData.reduce((sum, d) => sum + (d.career_intelligence?.total_views || 0), 0)
            },
            scheme: {
                topIntents,
                totalViews: dailyData.reduce((sum, d) => sum + (d.scheme_intelligence?.total_views || 0), 0)
            },
            categoryDistribution: categoryDist,
            dailyTrend,
            lastUpdated: new Date().toISOString()
        });

    } catch (error) {
        console.error('[Intelligence Dashboard] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
