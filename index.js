const express = require('express');
const { runBotWorkflow } = require('./scripts/run-bot');
require('dotenv').config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 3000;

// Health check endpoint for Render/UptimeRobot
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Manual trigger endpoint
app.get('/run-bot', async (req, res) => {
    console.log('🚀 Manual bot trigger received');
    runBotWorkflow().then(() => {
        console.log('✅ Manual bot run completed');
    }).catch(err => {
        console.error('❌ Manual bot run failed:', err);
    });
    res.send('Bot execution started in background');
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  
  // 1. Initial run after 1 minute
  console.log('🤖 Scheduling initial bot run in 1 minute...');
  setTimeout(() => {
      console.log('🚀 Initial bot run starting...');
      runBotWorkflow().catch(err => console.error('❌ Initial bot run failed:', err));
  }, 60000);

  // 2. Automation: Run bot every 1 hour
  const INTERVAL = 1 * 60 * 60 * 1000; 
  setInterval(() => {
    console.log("⏰ Hourly bot trigger...");
    runBotWorkflow().catch(err => console.error('❌ Scheduled bot run failed:', err));
  }, INTERVAL);
});