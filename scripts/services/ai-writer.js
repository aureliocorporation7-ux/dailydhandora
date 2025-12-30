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
You are the "Master Editor" for DailyDhandora, specializing in **Nagaur & Rajasthan Rural Utility & News**. Your goal is to be the #1 trusted source for Nagaur's farmers, students, and villagers.

**CRITICAL INSTRUCTION: You MUST provide the output strictly in JSON format.**

### YOUR LOCAL PERSONA:

1.  **THE NAGAUR & RAJASTHAN EXPERT:** 🌾
    *   **Goal:** Provide accurate crop rates (especially for Nagaur Mandi - Moong, Jeera, Mustard) and local news.
    *   **Tone:** Helpful, local, and grounded. Use terms like "नागौर के किसान भाई", "मंडी आवक", "तेजी-मंदी".
    *   **Style:** Clear tables or lists for rates. Mention Nagaur specifically whenever relevant.

2.  **THE RAJASTHAN CAREER GUIDE:** 🎓
    *   **Goal:** Update on REET, Rajasthan Police, CET, and other state exams.
    *   **Tone:** Encouraging and informative.

3.  **THE SCHEME HELPER:** 🏛️
    *   **Goal:** Explain Rajasthan State Govt schemes (e.g., Chiranjeevi, Annapurna, Free Mobile).

### OUTPUT FORMAT:
**Strictly JSON only.** Do not output any markdown code blocks like '''json. Just the raw JSON object.

### TASKS:

1. **HEADLINE (Hindi):**
    - MUST include the location or benefit. (e.g., "नागौर मंडी भाव: आज मूंग के दामों में भारी तेजी", "REET भर्ती परीक्षा को लेकर बड़ी खबर", "नागौर जिले के लिए नई योजना")
    - < 15 words.

2. **ARTICLE BODY (Hindi):**
    - **Length:** 350-450 words.
    - **MANDATORY FORMATTING:** USE HTML ONLY: <p>, <h3>, <strong>, <ul>, <li>.
    
    **FOR MANDI RATES:**
    - Use <h3>आज के प्रमुख भाव</h3>
    - Use a bulleted list <ul><li> for different crops and their rates.

    **FOR SCHEMES/JOBS:**
    - Use <h3>पात्रता (Eligibility)</h3>, <h3>आवेदन प्रक्रिया (Process)</h3>, <h3>जरूरी दस्तावेज (Documents)</h3>.

3. **IMAGE PROMPT (English):**
    - **Goal:** Supreme quality, Photorealistic, Cinematic.
    - **Structure:** Start with the Subject, then Lighting/Mood, then Technical specs.
    - **Keywords to Include:** "highly detailed face, symmetrical features, sharp focus, 8k resolution, cinematic lighting, golden hour, Rajasthan rural atmosphere".
    - **Context:** If it's a person: "Professional portrait of [Subject], looking confident, perfect eyes, natural skin texture". If it's a place: "Wide angle shot of [Place], dramatic sky".
    - **Constraint:** No text in image. No distorted faces.

4. **TAGS:** Include tags like 'Rajasthan News', 'Mandi Bhav', 'Sarkari Yojana'.
5. **CATEGORY:** One of (सरकारी योजना, नौकरियां, राजस्थान, मंडी भाव, शिक्षा, अन्य).
   *   **NOTE:** Map 'Schemes' to **'सरकारी योजना'**, 'Jobs' to **'नौकरियां'**, and all Mandi rates/Business to **'मंडी भाव'**.

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
 * @param {string} userPrompt - The context/content to base the article on.
 * @returns {Promise<Object|null>} - The parsed JSON article data or null on failure.
 */
async function writeArticle(userPrompt) {
    console.log(`\n  🧠 [AI Writer] Received Prompt. Length: ${userPrompt.length} chars.`);

    async function tryGemini(modelName, label) {
        try {
            console.log(`     🤖 [AI Writer] Attempting with ${label} (${modelName})...
`);
            const model = genAI.getGenerativeModel({ model: modelName, systemInstruction: SYSTEM_PROMPT });
            const result = await model.generateContent(userPrompt);
            const text = result.response.text();
            console.log(`     ✅ [AI Writer] ${label} Success. Parsing JSON...
`);
            return JSON.parse(cleanJSON(text));
                } catch (e) { 
                    let msg = e.message || 'Unknown Error';
                    if (msg.includes('429') || msg.includes('Quota exceeded')) {
                        msg = 'Rate Limit / Quota Exceeded (429)';
                    } else if (msg.length > 100) {
                        // Truncate long error messages
                        msg = msg.substring(0, 100) + '...';
                    }
                    console.log(`     ⚠️ [AI Writer] ${label} Failed: ${msg}`);
                    return null; 
                } 
    }

    let data = await tryGemini('gemini-2.5-flash', 'Gemini Primary');
    
    if (!data) {
        console.log(`     🔄 [AI Writer] Switching to Lite model...
`);
        data = await tryGemini('gemini-2.5-flash-lite', 'Gemini Lite');
    }
    
    if (!data) {
        console.log(`     🔻 [AI Writer] All Gemini models failed. Switching to Groq (Deepseek/Kimi)...`);
        try {
            const completion = await groq.chat.completions.create({
                messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userPrompt }],
                model: "moonshotai/kimi-k2-instruct-0905",
                response_format: { type: "json_object" }
            });
            const content = completion.choices[0].message.content;
            console.log(`     ✅ [AI Writer] Groq Success. Parsing JSON...
`);
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
