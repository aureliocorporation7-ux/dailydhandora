const { getTracker } = require('../lib/rate-limit-tracker');

const tracker = getTracker();
const status = tracker.getStatus();

console.log('\n📊 Rate Limit Status Report\n');
console.log('═'.repeat(50));

console.log('\n🔹 Gemini 2.0 Flash (Primary):');
console.log(`  Status: ${status['2.0-flash'].limited ? '🔴 RATE LIMITED' : '🟢 Available'}`);
if (status['2.0-flash'].limited) {
  const resetDate = new Date(status['2.0-flash'].resetAt);
  console.log(`  Resets: ${resetDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
  const hoursLeft = Math.ceil((resetDate - new Date()) / (1000 * 60 * 60));
  console.log(`  Time Left: ~${hoursLeft} hours`);
}
console.log(`  Total Failures: ${status['2.0-flash'].failures}`);

console.log('\n🔹 Gemini 2.5 Flash (Fallback):');
console.log(`  Status: ${status['2.5-flash'].limited ? '🔴 RATE LIMITED' : '🟢 Available'}`);
if (status['2.5-flash'].limited) {
  const resetDate = new Date(status['2.5-flash'].resetAt);
  console.log(`  Resets: ${resetDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
  const hoursLeft = Math.ceil((resetDate - new Date()) / (1000 * 60 * 60));
  console.log(`  Time Left: ~${hoursLeft} hours`);
}
console.log(`  Total Failures: ${status['2.5-flash'].failures}`);

console.log('\n' + '═'.repeat(50));

console.log('\n📈 Recommendations:');
const now = new Date();
const nowHour = now.getHours();

if (status['2.0-flash'].limited && status['2.5-flash'].limited) {
  const resetDate = new Date(status['2.0-flash'].resetAt);
  const hoursLeft = Math.ceil((resetDate - now) / (1000 * 60 * 60));
  
  // Check if Groq key exists
  const hasGroqKey = process.env.GOD_API_KEY ? true : false;
  
  if (hasGroqKey) {
    console.log(`   🚀 Both Gemini models limited. Bot will use Groq API automatically.`);
    console.log(`   ✅ Groq API: Unlimited requests, no waiting needed!`);
  } else {
    console.log(`   ⏰ Both models limited. Wait ${hoursLeft} hours or add Groq API key.`);
  }
} else if (status['2.0-flash'].limited) {
  console.log(`   ✅ Bot will use gemini-2.5-flash automatically.`);
} else if (nowHour >= 5 && nowHour < 6) {
  console.log(`   🌅 Good time to run! Quota just reset.`);
} else {
  console.log(`   ✅ All systems operational. Safe to run bot.`);
}

console.log('\n💡 Tip: Run `npm run bot:reset` to manually clear all limits\n');
