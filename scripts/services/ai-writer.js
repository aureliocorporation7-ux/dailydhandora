if (process.env.CI) {
    require('dotenv').config({ path: '.env' });
} else {
    require('dotenv').config({ path: '.env.local', override: true });
}

const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');

// Initialize Clients
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const groq = new Groq({ apiKey: process.env.GOD_API_KEY });

const SYSTEM_PROMPT = `
You are the "Senior Editor-in-Chief" for DailyDhandora, Nagaur's most trusted digital news portal.

**CRITICAL MANDATE: ZERO SOURCE MENTION**
1. **NEVER** use the words "Dainik Bhaskar", "Bhaskar", "Patrika", "Rajasthan Patrika", "Source", "Credits", or "Agency".
2. **NEVER** include phrases like "As reported by", "According to", or "Read more at".
3. **DO NOT** mention any reporter names found in the source text.
4. **STRICT RULE:** You are the ORIGINAL reporter.

**SIGN-OFF HIERARCHY (FOLLOW STRICTLY):**

**Tier 1: Tehsil Match (High Priority)**
Scan the article body for these SPECIFIC keywords. If found, use that location:
- **Keywords:** [
    "Degana", "डेगाना",
    "Merta", "मेड़ता", "Merata",
    "Jayal", "जायल",
    "Khinvsar", "खींवसर",
    "Mundwa", "मूंडवा",
    "Makrana", "मकराना",
    "Parbatsar", "परबतसर",
    "Didwana", "डीडवाना",
    "Ladnun", "लाडनूं",
    "Kuchaman", "कुचामन",
    "Nawa", "नावां",
    "Riyan Bari", "रियां बड़ी"
]
- **Output:** "हमारे **[Tehsil Name]** संवाददाता के अनुसार..."  (e.g., "हमारे **डेगाना** संवाददाता के अनुसार...")

**Tier 2: Default District (Fallback)**
If NONE of the above keywords are found in the text, you MUST default to:
- **Output:** "हमारे **नागौर** संवाददाता के अनुसार..."

**FORBIDDEN:**
- **NEVER** use a Village name (e.g., Chandarun, Lampolai) as the correspondent location.
- **NEVER** invent a location not in the list or the District name.

**CRITICAL INSTRUCTION: You MUST provide the output strictly in JSON format.**

### YOUR LOCAL PERSONA:
- You represent the voice of the specific Block/Tehsil involved. Your tone is authoritative, locally grounded, and professional.
- You use "हम" (We) or "हमारी टीम" (Our team).

### CATEGORY DEFINITIONS (CHOOSE STRICTLY FROM THIS LIST):
- **मंडी भाव**: For all crop rates, market arrivals (आवक), and business news.
- **नागौर न्यूज़**: For local events, accidents, crime, and general news within Nagaur district.
- **शिक्षा विभाग**: For all school/college news, board exams, teacher transfers, and education department orders.
- **सरकारी योजना**: For state and central government schemes, benefits, and applications.
- **भर्ती व रिजल्ट**: For all job notifications, exams, and results.

### TASKS:
1. **HEADLINE (Hindi):** Click-worthy, includes location, < 15 words.
2. **ARTICLE BODY (Hindi):** 450-500 words. Use HTML: <p>, <h3>, <strong>, <ul>, <li>. Use <h3> for subheadings.
3. **IMAGE PROMPT (English):** High-quality news photography style prompt.
4. **TAGS:** Local tehsil names and relevant keywords.

### JSON STRUCTURE:
{
  "headline": "...",
  "content": "...",
  "image_prompt": "...",
  "tags": ["..."],
  "category": "..."
}
`;

function cleanJSON(text) {
    let cleaned = text.replace(/```json\s*/g, '').replace(/```/g, '');
    const jsonMatch = cleaned.match(/{[\s\S]*}/);
    if (!jsonMatch) throw new Error('No JSON object found in response');
    return jsonMatch[0];
}

/**
 * ✍️ Generates an article using Gemini or Groq based on the input prompt.
 */
async function writeArticle(userPrompt) {
    // 🌍 DYNAMIC TIME CONTEXT (IST)
    const now = new Date();
    const istDate = now.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const timeContext = `\n[SYSTEM TIME CONTEXT: Today is ${istDate}. All content generation must align with this present timeline. Ensure news is treated as current relative to this date.]\n`;

    console.log(`\n  🧠 [AI Writer] Received Prompt. Length: ${userPrompt.length} chars. Time Context: ${istDate}`);

    async function tryGemini(modelName, label) {
        try {
            console.log(`     🤖 [AI Writer] Attempting with ${label} (${modelName})...`);
            // Prepend time context to System Instruction
            const model = genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: SYSTEM_PROMPT + timeContext
            });
            const result = await model.generateContent(userPrompt);
            const text = result.response.text();
            console.log(`     ✅ [AI Writer] ${label} Success. Parsing JSON...`);
            return JSON.parse(cleanJSON(text));
        } catch (e) {
            let msg = e.message || 'Unknown Error';
            if (msg.includes('429') || msg.includes('Quota exceeded')) {
                msg = 'Rate Limit / Quota Exceeded (429)';
            } else if (msg.length > 100) {
                msg = msg.substring(0, 100) + '...';
            }
            console.log(`     ⚠️ [AI Writer] ${label} Failed: ${msg}`);
            return null;
        }
    }

    let data = await tryGemini('gemini-2.5-flash', 'Gemini Primary');

    if (!data) {
        console.log(`     🔄 [AI Writer] Switching to Lite model...`);
        data = await tryGemini('gemini-2.5-flash-lite', 'Gemini Lite');
    }

    if (!data) {
        console.log(`     🔻 [AI Writer] All Gemini models failed. Switching to Groq (Deepseek/Kimi)...`);
        try {
            const completion = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: SYSTEM_PROMPT + timeContext },
                    { role: "user", content: userPrompt }
                ],
                model: "moonshotai/kimi-k2-instruct-0905",
                response_format: { type: "json_object" }
            });
            const content = completion.choices[0].message.content;
            console.log(`     ✅ [AI Writer] Groq Success. Parsing JSON...`);
            return JSON.parse(cleanJSON(content));
        } catch (e) {
            const msg = e.message.length > 100 ? e.message.substring(0, 100) + '...' : e.message;
            console.error(`     ❌ [AI Writer] Groq Failed: ${msg}`);
            return null;
        }
    }
    return data;
}

module.exports = { writeArticle };