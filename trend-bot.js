const Parser = require('rss-parser');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const admin = require("firebase-admin");
require('dotenv').config();

// --- 🔐 YAHAN HUMNE CHANGE KIYA HAI (Base64 Decode) ---
// GitHub se "Encoded" string milegi, hum use wapas JSON bana rahe hain
// Taaki "Unexpected end of JSON" wala error kabhi na aaye.
const serviceAccount = JSON.parse(
  Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8')
);
// -----------------------------------------------------

// 1. Firebase Connect
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// 2. Gemini Connect
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function main() {
  try {
    console.log("🚀 DailyDhandora Super-Bot Starting...");

    // A. Trend Uthana (Google Trends RSS)
    const parser = new Parser();
    const feed = await parser.parseURL('https://trends.google.com/trends/trendingsearches/daily/rss?geo=IN');
    
    // Top 1 trend utha rahe hain
    const trend = feed.items[0]; 
    console.log(`🔥 Topic: ${trend.title}`);

    // Check Duplicate (Agar pehle se hai to dobara mat likho)
    const checkDb = await db.collection('articles').where('title', '==', trend.title).get();
    if (!checkDb.empty) {
      console.log("⚠️ Ye khabar pehle se hai. Skipping.");
      return;
    }

    // B. Super Article Likhwana (Super Prompt)
    console.log("🤖 Gemini is writing (Super Mode)...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `
      You are an expert journalist for 'DailyDhandora', a viral Indian news site.
      Topic: "${trend.title}"
      Context: "${trend.contentSnippet}"
      
      Write a High-Quality Blog Post in Hindi (mix English words naturally / Hinglish).
      
      REQUIREMENTS (To force Google Ranking):
      1. **Headline:** Clickbait but true (e.g., "Big News: ...", "Janiye sach...").
      2. **Introduction:** Hook the reader immediately.
      3. **Key Data Table:** If it's a phone/match/scheme, create a HTML <table> with key specs/scores/dates. If general news, bullet points.
      4. **FAQs:** Add 3 "Frequently Asked Questions" at the end.
      5. **Conclusion:** Give a personal opinion or question to the reader.
      
      OUTPUT FORMAT: JSON ONLY (No markdown formatting like \`\`\`json).
      Structure:
      {
        "headline": "String",
        "body": "HTML String (Use <h2>, <p>, <ul>, <li>, <table>, <strong>)",
        "category": "String (e.g., Tech, Cricket, Astology)",
        "tags": ["tag1", "tag2"]
      }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, "").trim();
    
    // JSON Parse (Error handling ke saath)
    let articleData;
    try {
        articleData = JSON.parse(text);
    } catch (e) {
        console.error("Gemini ne galat JSON diya, fixing...", text);
        // Agar kabhi JSON fail ho, to basic structure bana do taaki bot ruke nahi
        articleData = {
            headline: `Breaking: ${trend.title}`,
            body: `<p>${trend.contentSnippet}</p><p>(Read more on official news sources)</p>`,
            category: "General",
            tags: ["News"]
        };
    }

    // C. Firebase Save
    await db.collection('articles').add({
      title: trend.title,
      headline: articleData.headline,
      body: articleData.body,
      tags: articleData.tags,
      category: articleData.category,
      originalLink: trend.link,
      // Image ka jugad (Storage free rakhne ke liye)
      imageUrl: trend.enclosure ? trend.enclosure.url : "https://source.unsplash.com/random/800x600/?news",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log("✅ Article Published Successfully on DailyDhandora!");

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();