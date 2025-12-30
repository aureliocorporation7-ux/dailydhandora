if (process.env.CI) {
  require('dotenv').config({ path: '.env' });
} else {
  require('dotenv').config({ path: '.env.local', override: true });
}

const mandiBot = require('./scripts/bots/mandi-bot');
const newsBot = require('./scripts/bots/news-bot');
const schemeBot = require('./scripts/bots/scheme-bot');

async function runAllBots() {
    console.log('🚀 [Bot] Triggering ALL Bots...');
    try { await mandiBot.run(); } catch (e) { console.error('Mandi Bot Error:', e); }
    try { await newsBot.run(); } catch (e) { console.error('News Bot Error:', e); }
    try { await schemeBot.run(); } catch (e) { console.error('Scheme Bot Error:', e); }
    console.log('✅ [Bot] All Bots Execution Finished.');
}

console.log("🤖 DailyDhandora Bot Service Starting...");

// 1. Initial Run
setTimeout(() => {
    runAllBots();
}, 5000); 

// 2. Schedule Mandi Bot (Every 24 Hours)
setInterval(() => {
    console.log("⏰ Running Mandi Bot...");
    mandiBot.run().catch(e => console.error("Mandi Bot Failed:", e));
}, 24 * 60 * 60 * 1000);

// 3. Schedule News Bot (Every 30 Minutes)
setInterval(() => {
    console.log("⏰ Running News Bot...");
    newsBot.run().catch(e => console.error("News Bot Failed:", e));
}, 30 * 60 * 1000);

// 4. Schedule Scheme Bot (Every 24 Hours)
setInterval(() => {
    console.log("⏰ Running Scheme Bot...");
    schemeBot.run().catch(e => console.error("Scheme Bot Failed:", e));
}, 24 * 60 * 60 * 1000);

// Keep-Alive
setInterval(() => {
    console.log(`💓 Bot Service Alive... [${new Date().toISOString()}]`);
}, 10 * 60 * 1000);
