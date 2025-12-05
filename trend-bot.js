const Parser = require('rss-parser');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const admin = require("firebase-admin");
require('dotenv').config();

console.log("🛠️ Starting Bot Initialization...");

// --- 🔐 ULTIMATE KEY LOADER (हर मर्ज की दवा) ---
function getFirebaseCredentials() {
  const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT;

  // 1. Check: Kya Secret exist karta hai?
  if (!rawKey) {
    throw new Error("❌ FATAL: 'FIREBASE_SERVICE_ACCOUNT' secret GitHub me missing hai ya empty hai.");
  }

  // 2. Safai: Extra spaces ya new lines hatana
  const cleanKey = rawKey.trim();
  
  // Debugging: Bina secret dikhaye check karna ki kya aa raha hai
  console.log(`🔑 Key detected! Length: ${cleanKey.length} chars.`);
  console.log(`👀 Key starts with: "${cleanKey.substring(0, 5)}..."`); 

  let serviceAccount;

  try {
    // CASE A: Agar key '{' se shuru hoti hai, to ye DIRECT JSON hai
    if (cleanKey.startsWith('{')) {
      console.log("ℹ️ Format detected: RAW JSON");
      serviceAccount = JSON.parse(cleanKey);
    } 
    // CASE B: Agar nahi, to ye BASE64 ho sakti hai
    else {
      console.log("ℹ️ Format detected: BASE64 (Trying to decode...)");
      const decoded = Buffer.from(cleanKey, 'base64').toString('utf8');
      // Decode ke baad check karein ki kya ye JSON bana?
      if (!decoded.startsWith('{')) {
        throw new Error("Decoded string JSON nahi lag rahi hai.");
      }
      serviceAccount = JSON.parse(decoded);
    }
    
    // Check karein ki kya project_id hai (matlab sahi JSON hai)
    if (!serviceAccount.project_id) {
        throw new Error("JSON parse hua, lekin 'project_id' missing hai. Galat file ho sakti hai.");
    }

    console.log("✅ Firebase Key Successfully Loaded!");
    return serviceAccount;

  } catch (error) {
    console.error("\n❌ KEY PARSING ERROR:");
    console.error("Error Details:", error.message);
    console.error("💡 TIP: GitHub Secret me jaakar dekho ki key sahi se paste hui hai ya nahi.\n");
    process.exit(1); // Stop process
  }
}

// Credentials load karna
const serviceAccount = getFirebaseCredentials();

// 1. Firebase Connect
try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("✅ Firebase Connected.");
} catch (e) {
    console.error("❌ Firebase Connection Failed:", e.message);
    process.exit(1);
}

const db = admin.firestore();

// 2. Gemini Connect
const geminiKey = process.env.GEMINI_API_KEY;
if (!geminiKey) {
    console.error("❌ GEMINI_API_KEY missing hai!");
    process.exit(1);
}
const genAI = new GoogleGenerativeAI(geminiKey);

async function main() {
  try {
    console.log("🚀 DailyDhandora Bot Logic Running...");

    // A. Trend Uthana
    const parser = new Parser();
    const feed = await parser.parseURL('https://trends.google.com/trends/trendingsearches/daily/rss?geo=IN');
    
    if (!feed || !feed.items || feed.items.length === 0) {
        throw new Error("Google Trends se koi data nahi mila.");
    }

    const trend = feed.items[0]; 
    console.log(`🔥 Topic Found: ${trend.title}`);

    // Check Duplicate
    const checkDb = await db.collection('articles').where('title', '==', trend.title).get();
    if (!checkDb.empty) {
      console.log("⚠️ Article pehle se exist karta hai. Exiting.");
      return;
    }

    // B. Gemini se Likhwana
    console.log("🤖 Gemini writing article...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `
      You are a journalist for 'DailyDhandora'.
      Topic: "${trend.title}"
      Context: "${trend.contentSnippet}"
      
      Write a viral blog post in Hindi (Hinglish).
      Requirements: Clickbait Headline, HTML Body (Table/Bullets/FAQs), Category, Tags.
      
      OUTPUT: JSON ONLY (No markdown).
      Schema: { "headline": "", "body": "", "category": "", "tags": [] }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, "").trim();
    
    let articleData;
    try {
        articleData = JSON.parse(text);
    } catch (e) {
        console.error("⚠️ Gemini output JSON fix kar raha hoon...");
        // Basic fallback agar JSON toot jaye
        articleData = {
            headline: `Trending: ${trend.title}`,
            body: `<p>${trend.contentSnippet}</p>`,
            category: "News",
            tags: ["Viral"]
        };
    }

    // C. Save to Firebase
    await db.collection('articles').add({
      title: trend.title,
      headline: articleData.headline,
      body: articleData.body,
      tags: articleData.tags,
      category: articleData.category,
      originalLink: trend.link,
      imageUrl: trend.enclosure ? trend.enclosure.url : "https://source.unsplash.com/random/800x600/?news",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log("✅ Success! Article Published.");

  } catch (error) {
    console.error("❌ Runtime Error:", error);
    process.exit(1);
  }
}

main();