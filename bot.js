if (process.env.CI) {
    require('dotenv').config({ path: '.env' });
} else {
    require('dotenv').config({ path: '.env.local', override: true });
}

const mandiBot = require('./scripts/bots/mandi-bot');
const newsBot = require('./scripts/bots/news-bot');
const schemeBot = require('./scripts/bots/scheme-bot');
const eduBot = require('./scripts/bots/edu-bot');
const apiBot = require('./scripts/bots/api-bot'); // NEW: Official Orders Bot

// 🛡️ MEMORY GUARD: ensure only one bot runs at a time (Mutex)
let isGlobalBotRunning = false;

// 🛡️ HEARTBEAT SYSTEM: Tracks when bots last ran
const botStatus = {
    news: { lastRun: Date.now(), intervalMs: 15 * 60 * 1000, name: 'News Bot' },
    mandi: { lastRun: Date.now(), intervalMs: 24 * 60 * 60 * 1000, name: 'Mandi Bot' },
    scheme: { lastRun: Date.now(), intervalMs: 24 * 60 * 60 * 1000, name: 'Scheme Bot' },
    edu: { lastRun: Date.now(), intervalMs: 30 * 60 * 1000, name: 'Edu Bot' },
    api: { lastRun: Date.now(), intervalMs: 60 * 60 * 1000, name: 'API Bot' } // NEW: 1 hour interval
};

/**
 * Wrapper to run a bot and update its heartbeat.
 * Enforces Mutex to protect 512MB RAM cap.
 */
async function runBotSafe(botKey, botFunction) {
    if (isGlobalBotRunning) {
        console.log(`🔒 [Scheduler] Locked! Another bot is running. Skipping ${botStatus[botKey].name}...`);
        return;
    }

    isGlobalBotRunning = true;
    const botInfo = botStatus[botKey];
    console.log(`⏰ [Scheduler] Running ${botInfo.name}...`);

    // Explicit Garbage Collection Hint (if available)
    if (global.gc) {
        try { global.gc(); } catch (e) { /* ignore */ }
    }

    try {
        await botFunction.run();
        botStatus[botKey].lastRun = Date.now(); // ❤️ Update Heartbeat
        console.log(`✅ [Scheduler] ${botInfo.name} Completed.`);
    } catch (e) {
        console.error(`❌ [Scheduler] ${botInfo.name} Failed:`, e.message);
    } finally {
        isGlobalBotRunning = false;
        console.log(`🔓 [Scheduler] Unlocked.`);
    }
}

async function runAllBots() {
    console.log('🚀 [Bot] Triggering ALL Bots (Sequential)...');
    // Run sequentially to respect Mutex
    await runBotSafe('api', apiBot);   // NEW: API Bot runs FIRST (fastest)
    await runBotSafe('mandi', mandiBot);
    await runBotSafe('news', newsBot);
    await runBotSafe('scheme', schemeBot);
    await runBotSafe('edu', eduBot);
    console.log('✅ [Bot] Initial Execution Finished.');
}

console.log("🤖 DailyDhandora Bot Service Starting with Mutex Guard...");

// 1. Initial Run (Staggered start)
setTimeout(() => {
    runAllBots();
}, 10000);

// 2. Schedule Standard Intervals
// Note: Even if they trigger at same time, Mutex will block concurrent execution
setInterval(() => runBotSafe('api', apiBot), botStatus.api.intervalMs);     // NEW
setInterval(() => runBotSafe('mandi', mandiBot), botStatus.mandi.intervalMs);
setInterval(() => runBotSafe('news', newsBot), botStatus.news.intervalMs);
setInterval(() => runBotSafe('scheme', schemeBot), botStatus.scheme.intervalMs);
setInterval(() => runBotSafe('edu', eduBot), botStatus.edu.intervalMs);

// 3. 🛡️ THE WATCHDOG (Self-Healing Mechanism)
// Checks every 5 minutes if any bot is stuck or dead.
setInterval(() => {
    const now = Date.now();
    console.log(`🐶 [Watchdog] Checking bot health...`);

    // Force unlock if stuck for > 20 mins
    // (Assuming no single bot run should take 20 mins)
    // Actually we can check if isGlobalBotRunning is true for too long?
    // Implementation: Just check lastRun. use tolerance.

    Object.keys(botStatus).forEach(key => {
        const bot = botStatus[key];
        // Tolerance: If 15 minutes past due, assume dead/stuck.
        const tolerance = 15 * 60 * 1000;

        if (now - bot.lastRun > (bot.intervalMs + tolerance)) {
            console.error(`🚨 [Watchdog] CRITICAL: ${bot.name} looks stuck! Last run: ${new Date(bot.lastRun).toLocaleTimeString()}. Force Restarting...`);

            // If the global lock is stuck because a bot crashed without 'finally', fix it.
            // But we have 'finally', so this is rare.
            // We'll just try to run it.
            runBotSafe(key, { news: newsBot, mandi: mandiBot, scheme: schemeBot, edu: eduBot, api: apiBot }[key]);
        }
    });
}, 5 * 60 * 1000); // Check every 5 minutes

// Keep-Alive Log
setInterval(() => {
    console.log(`💓 System Pulse: News Bot last active ${Math.floor((Date.now() - botStatus.news.lastRun) / 60000)}m ago. Lock status: ${isGlobalBotRunning}`);
}, 10 * 60 * 1000);
