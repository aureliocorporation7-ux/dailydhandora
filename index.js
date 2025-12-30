const express = require('express');
const next = require('next');
require('dotenv').config({ path: '.env.local' });

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const PORT = process.env.PORT || 3000;

app.prepare().then(() => {
  const server = express();

  // Health check
  server.get('/health', (req, res) => {
    res.status(200).send('OK');
  });

  // Next.js Catch-all
  server.all(/.*/, (req, res) => {
    return handle(req, res);
  });
  
  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> 🚀 Server (Website) ready on port ${PORT}`);
    console.log(`> 🤖 To run the bots, use: node bot.js`);
  });
});
