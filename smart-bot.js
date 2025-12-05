// smart-bot.js
const Parser = require('rss-parser');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const admin = require("firebase-admin");
require('dotenv').config();

console.log("🤖 Smart Bot Starting...");

// --- KEY LOADING MAGIC ---
function getCredentials() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    console.error("❌ ERROR: GitHub Secret bilkul khaali hai!");
    process.exit(1);
  }
  
  // Safai
  const clean = raw.trim();
  console.log(`🔑 Key Length: ${clean.length}`);
  
  try {
    // Agar '{' se shuru ho to JSON, nahi to Base64
    if (clean.startsWith('{')) return JSON.parse(clean);
    return JSON.parse(Buffer.from(clean, 'base64').toString('utf8'));
  } catch (e) {
    console.error("❌ Key Kharab hai (JSON Error):", e.message);
    process.exit(1);
  }
}

const serviceAccount = getCredentials();
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
console.log("✅ Firebase Connected!");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function main() {
  try {
    const parser = new Parser();
    const feed = await parser.parseURL('https://trends.google.com/trends/trendingsearches/daily/rss?geo=IN');
    const trend = feed.items[0];
    console.log(`🔥 Trend: ${trend.title}`);

    // Check Duplicate
    const exists = await db.collection('articles').where('title', '==', trend.title).get();
    if (!exists.empty) {
      console.log("⚠️ Already posted. Bye!");
      return;
    }

    // Write Article
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(`
      Write a viral Hindi blog post about "${trend.title}".
      Format: JSON with keys: headline, body, category, tags.
      NO Markdown.
    `);
    
    const text = result.response.text().replace(/```json|```/g, "").trim();
    const data = JSON.parse(text);

    await db.collection('articles').add({
      title: trend.title,
      headline: data.headline,
      body: data.body,
      tags: data.tags,
      category: data.category || "News",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log("✅ Article Posted!");
  } catch (e) {
    console.error("❌ Error:", e);
    process.exit(1);
  }
}

main();