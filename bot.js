if (process.env.CI) {
  require('dotenv').config({ path: '.env' });
} else {
  require('dotenv').config({ path: '.env.local', override: true });
}

const mandiBot = require('./scripts/bots/mandi-bot');
const newsBot = require('./scripts/bots/news-bot');
const schemeBot = require('./scripts/bots/scheme-bot');

// 🛡️ HEARTBEAT SYSTEM: Tracks when bots last ran
const botStatus = {
    news: { lastRun: Date.now(), intervalMs: 15 * 60 * 1000, name: 'News Bot' },
    mandi: { lastRun: Date.now(), intervalMs: 24 * 60 * 60 * 1000, name: 'Mandi Bot' },
    scheme: { lastRun: Date.now(), intervalMs: 24 * 60 * 60 * 1000, name: 'Scheme Bot' }
};

/**
 * Wrapper to run a bot and update its heartbeat.
 */
async function runBotSafe(botKey, botFunction) {
    const botInfo = botStatus[botKey];
    console.log(`⏰ [Scheduler] Running ${botInfo.name}...`);
    try {
        await botFunction.run();
        botStatus[botKey].lastRun = Date.now(); // ❤️ Update Heartbeat
        console.log(`✅ [Scheduler] ${botInfo.name} Completed.`);
    } catch (e) {
        console.error(`❌ [Scheduler] ${botInfo.name} Failed:`, e.message);
    }
}

async function runAllBots() {
    console.log('🚀 [Bot] Triggering ALL Bots (Initial Run)...');
    await runBotSafe('mandi', mandiBot);
    await runBotSafe('news', newsBot);
    await runBotSafe('scheme', schemeBot);
    console.log('✅ [Bot] Initial Execution Finished.');
}

console.log("🤖 DailyDhandora Bot Service Starting with Self-Healing Watchdog...");

// 1. Initial Run
setTimeout(() => {
    runAllBots();
}, 5000); 

// 2. Schedule Standard Intervals
setInterval(() => runBotSafe('mandi', mandiBot), botStatus.mandi.intervalMs);
setInterval(() => runBotSafe('news', newsBot), botStatus.news.intervalMs);
setInterval(() => runBotSafe('scheme', schemeBot), botStatus.scheme.intervalMs);

// 3. 🛡️ THE WATCHDOG (Self-Healing Mechanism)
// Checks every 5 minutes if any bot is stuck or dead.
setInterval(() => {
    const now = Date.now();
    console.log(`🐶 [Watchdog] Checking bot health...`);

    Object.keys(botStatus).forEach(key => {
        const bot = botStatus[key];
        // Tolerance: If 10 minutes past due, assume dead and restart.
        const tolerance = 10 * 60 * 1000; 
        
        if (now - bot.lastRun > (bot.intervalMs + tolerance)) {
            console.error(`🚨 [Watchdog] CRITICAL: ${bot.name} looks stuck! Last run: ${new Date(bot.lastRun).toLocaleTimeString()}. Force Restarting...`);
            
            // ⚡ FORCE RESTART
            runBotSafe(key, key === 'news' ? newsBot : key === 'mandi' ? mandiBot : schemeBot);
        }
    });
}, 5 * 60 * 1000); // Check every 5 minutes

// Keep-Alive Log
setInterval(() => {
    console.log(`💓 System Pulse: News Bot last active ${Math.floor((Date.now() - botStatus.news.lastRun)/60000)}m ago.`);
}, 10 * 60 * 1000);
