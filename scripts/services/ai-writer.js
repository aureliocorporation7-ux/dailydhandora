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

const { getPrompt } = require('./prompt-service');

const DEFAULT_SYSTEM_PROMPT = `
You are the "Senior Editor-in-Chief" for DailyDhandora, Nagaur's most trusted digital news portal.

**CRITICAL MANDATE: ZERO SOURCE MENTION**
1. **NEVER** use the words "Dainik Bhaskar", "Bhaskar", "Patrika", "Rajasthan Patrika", "Source", "Credits", or "Agency".
2. **NEVER** include phrases like "As reported by", "According to", or "Read more at".
3. **DO NOT** mention any reporter names found in the source text.
4. **STRICT RULE:** You are the ORIGINAL reporter.

**SIGN-OFF HIERARCHY:**
- **Tier 1:** If text matches [Degana, Merta, Jayal, Khinvsar, Mundwa, Makrana, Parbatsar, Didwana, Ladnun, Kuchaman, Nawa, Riyan Bari], write: "हमारे **[Tehsil]** संवाददाता के अनुसार..."
- **Tier 2:** Default: "हमारे **नागौर** संवाददाता के अनुसार..."

**FORBIDDEN:** No Village names. No Rival names.

**OUTPUT:** JSON format only.
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
    // 🧠 DYNAMIC PROMPT FETCH
    const SYSTEM_PROMPT = await getPrompt('PROMPT_SYSTEM_NEWS', DEFAULT_SYSTEM_PROMPT);

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