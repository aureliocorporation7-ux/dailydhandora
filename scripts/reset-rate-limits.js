const { getTracker } = require('../lib/rate-limit-tracker');

console.log('\n🔄 Resetting all rate limits...\n');
const tracker = getTracker();
tracker.resetAll();
console.log('✅ Done! Run `npm run bot:status` to verify.\n');
