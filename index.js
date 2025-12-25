const express = require('express');
const next = require('next');
const { runBotWorkflow } = require('./scripts/run-bot');
require('dotenv').config({ path: '.env.local' });

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const PORT = process.env.PORT || 3000;

app.prepare().then(() => {
  const server = express();

  // ---------------------------------------------------------
  // 🤖 BOT & API ROUTES
  // ---------------------------------------------------------

  // Health check for Uptime/Render
  server.get('/health', (req, res) => {
    res.status(200).send('OK');
  });

  // Manual trigger endpoint
  server.get('/run-bot', async (req, res) => {
      console.log('🚀 Manual bot trigger received');
      runBotWorkflow().then(() => {
          console.log('✅ Manual bot run completed');
      }).catch(err => {
          console.error('❌ Manual bot run failed:', err);
      });
      res.send('Bot execution started in background');
  });

  // ---------------------------------------------------------
  // 🌐 NEXT.JS FRONTEND CATCH-ALL
  // ---------------------------------------------------------
  
  // This handles all other routes (Home, Article Page, etc.) and serves the React App
  server.all('*', (req, res) => {
    return handle(req, res);
  });

  // ---------------------------------------------------------
  // 🚀 SERVER START & AUTOMATION
  // ---------------------------------------------------------
  
  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on port ${PORT}`);
    
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
});
