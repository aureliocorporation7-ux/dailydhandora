if (process.env.CI) {
    require('dotenv').config({ path: '.env' });
} else {
    require('dotenv').config({ path: '.env.local', override: true });
}

const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');

// Initialize Clients
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const genAIFallback = new GoogleGenerativeAI(process.env.dailydhandhorafallback);
const groq = new Groq({ apiKey: process.env.GOD_API_KEY });

const { getPrompt } = require('./prompt-service');

/**
 * ⏱️ Timeout wrapper for API calls
 */
function withTimeout(promise, ms, errorMessage = 'Request timeout') {
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            setTimeout(() => reject(new Error(errorMessage)), ms);
        })
    ]);
}

/**
 * ⏳ Exponential backoff delay
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

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

// 🧠 DYNAMIC MODEL LISTS with validation and fallback
function parseModelList(envVar, defaultList, listName) {
    if (process.env[envVar]) {
        try {
            const models = process.env[envVar].split(',').map(m => m.trim()).filter(m => m);
            if (models.length > 0) {
                console.log(`✅ [AI Writer] Using ${listName} from env: ${models.join(' → ')}`);
                return models;
            }
        } catch (error) {
            console.warn(`⚠️ [AI Writer] Failed to parse ${envVar}, using defaults: ${error.message}`);
        }
    }
    console.log(`ℹ️ [AI Writer] Using default ${listName}: ${defaultList.join(' → ')}`);
    return defaultList;
}

// � GEMINI MODELS LIST (Power descending order - strongest first)
const GEMINI_MODELS_DEFAULT = [
    'gemini-2.5-flash',              // 1. Primary powerful model
    'gemini-2.5-flash-lite',         // 2. Lite version
    'gemini-3.1-flash-lite-preview', // 3. New preview model
    'gemini-3-flash-preview'         // 4. Another preview model
];

// 🔥 GROQ MODELS LIST (Power descending order - strongest first)
const GROQ_MODELS_DEFAULT = [
    'openai/gpt-oss-120b',           // 1. Most powerful
    'llama-3.3-70b-versatile',       // 2. 70B parameter Llama
    'qwen/qwen3-32b',                // 3. Qwen 32B
    'openai/gpt-oss-20b',            // 4. Smaller GPT-oss
    'meta-llama/llama-4-scout-17b-16e-instruct', // 5. Llama 4
    'groq/compound',                 // 6. Groq compound
    'llama-3.1-8b-instant'           // 7. Fastest, smallest
];

// Parse dynamic model lists
const GEMINI_MODELS = parseModelList('GEMINI_MODELS', GEMINI_MODELS_DEFAULT, 'Gemini models');
const GROQ_MODELS = parseModelList('GROQ_MODELS', GROQ_MODELS_DEFAULT, 'Groq models');

// 🛡️ Validate model lists are not empty
if (GEMINI_MODELS.length === 0) {
    console.error('❌ [AI Writer] GEMINI_MODELS list is empty! Using fallback default.');
    GEMINI_MODELS.push(...GEMINI_MODELS_DEFAULT);
}

if (GROQ_MODELS.length === 0) {
    console.error('❌ [AI Writer] GROQ_MODELS list is empty! Using fallback default.');
    GROQ_MODELS.push(...GROQ_MODELS_DEFAULT);
}

console.log(`🎯 [AI Writer] Loaded ${GEMINI_MODELS.length} Gemini models, ${GROQ_MODELS.length} Groq models`);

/**
 * 🧠 Try a single Gemini model with given key
 */
async function tryGeminiModel(client, modelName, systemInstruction, userPrompt, keyName) {
    try {
        const modelId = client === genAIFallback ? `models/${modelName}` : modelName;
        console.log(`     🤖 [AI Writer] Trying ${modelName} - ${keyName}...`);

        const model = client.getGenerativeModel({
            model: modelId,
            systemInstruction: systemInstruction
        });
        // 15-second timeout for Gemini API
        const result = await withTimeout(
            model.generateContent(userPrompt),
            15000,
            `Gemini API timeout (${modelName})`
        );
        const text = result.response.text();
        console.log(`     ✅ [AI Writer] ${modelName} Success. Parsing JSON...`);
        return JSON.parse(cleanJSON(text));
    } catch (e) {
        let msg = e.message || 'Unknown Error';
        if (msg.includes('429') || msg.includes('Quota exceeded')) {
            msg = 'Rate Limit / Quota Exceeded (429)';
        } else if (msg.includes('timeout')) {
            msg = 'Timeout (15s)';
        } else if (msg.length > 100) {
            msg = msg.substring(0, 100) + '...';
        }
        console.log(`     ⚠️ [AI Writer] ${modelName} Failed: ${msg}`);
        return null;
    }
}

/**
 * 🧠 Try all Gemini models in order with Primary key, then Fallback key
 * Each model gets 2 attempts before moving to next
 */
async function tryGeminiLayer(systemInstruction, userPrompt) {
    console.log(`\n  🔄 [AI Writer] === GEMINI PRIMARY LAYER ===`);

    // Try each model in order with Primary Key
    for (const model of GEMINI_MODELS) {
        console.log(`\n  📍 [AI Writer] Testing model: ${model}`);

        // Attempt 1 with Primary Key
        let data = await tryGeminiModel(genAI, model, systemInstruction, userPrompt, 'Primary Key');
        if (data) return { data, source: `Gemini Primary (${model})` };

        // Exponential backoff before retry
        console.log(`     ⏳ [AI Writer] Backoff 1s before retry...`);
        await delay(1000);

        // Attempt 2 with Primary Key (retry same model)
        console.log(`     🔄 [AI Writer] Retry #1 for ${model}...`);
        data = await tryGeminiModel(genAI, model, systemInstruction, userPrompt, 'Primary Key');
        if (data) return { data, source: `Gemini Primary (${model})` };

        console.log(`     ⏭️ [AI Writer] Moving to next Gemini model...`);
    }

    // All models failed with Primary Key, now try Fallback Key
    console.log(`\n  🔄 [AI Writer] === GEMINI FALLBACK LAYER ===`);

    for (const model of GEMINI_MODELS) {
        console.log(`\n  📍 [AI Writer] Testing model: ${model} (Fallback Key)`);

        // Attempt 1 with Fallback Key
        let data = await tryGeminiModel(genAIFallback, model, systemInstruction, userPrompt, 'Fallback Key');
        if (data) return { data, source: `Gemini Fallback (${model})` };

        // Exponential backoff before retry
        console.log(`     ⏳ [AI Writer] Backoff 1.5s before retry...`);
        await delay(1500);

        // Attempt 2 with Fallback Key (retry same model)
        console.log(`     🔄 [AI Writer] Retry #1 for ${model}...`);
        data = await tryGeminiModel(genAIFallback, model, systemInstruction, userPrompt, 'Fallback Key');
        if (data) return { data, source: `Gemini Fallback (${model})` };

        console.log(`     ⏭️ [AI Writer] Moving to next Gemini model...`);
    }

    return null; // All Gemini models exhausted
}

/**
 * 🔥 Try all Groq models in order
 * Each model gets 2 attempts before moving to next
 */
async function tryGroqLayer(systemInstruction, userPrompt) {
    console.log(`\n  🔻 [AI Writer] === GROQ LAYER (Final Fallback) ===`);

    for (const model of GROQ_MODELS) {
        console.log(`\n  📍 [AI Writer] Testing Groq model: ${model}`);

        try {
            // Attempt 1
            console.log(`     🤖 [AI Writer] Trying ${model}...`);
            const completion = await withTimeout(
                groq.chat.completions.create({
                    messages: [
                        { role: "system", content: systemInstruction },
                        { role: "user", content: userPrompt }
                    ],
                    model: model,
                    response_format: { type: "json_object" }
                }),
                20000,
                `Groq API timeout (${model})`
            );
            const content = completion.choices[0].message.content;
            console.log(`     ✅ [AI Writer] Groq ${model} Success. Parsing JSON...`);
            return { data: JSON.parse(cleanJSON(content)), source: `Groq (${model})` };
        } catch (e) {
            let msg = e.message.length > 100 ? e.message.substring(0, 100) + '...' : e.message;
            if (msg.includes('timeout')) msg = 'Timeout (20s)';
            console.log(`     ⚠️ [AI Writer] Groq ${model} Failed: ${msg}`);
        }

        // Exponential backoff before retry
        console.log(`     ⏳ [AI Writer] Backoff 2s before retry...`);
        await delay(2000);

        // Attempt 2 (retry same model)
        console.log(`     🔄 [AI Writer] Retry #1 for ${model}...`);
        try {
            const completion = await withTimeout(
                groq.chat.completions.create({
                    messages: [
                        { role: "system", content: systemInstruction },
                        { role: "user", content: userPrompt }
                    ],
                    model: model,
                    response_format: { type: "json_object" }
                }),
                20000,
                `Groq API timeout (${model})`
            );
            const content = completion.choices[0].message.content;
            console.log(`     ✅ [AI Writer] Groq ${model} Success (Retry). Parsing JSON...`);
            return { data: JSON.parse(cleanJSON(content)), source: `Groq (${model})` };
        } catch (e) {
            let msg = e.message.length > 100 ? e.message.substring(0, 100) + '...' : e.message;
            if (msg.includes('timeout')) msg = 'Timeout (20s)';
            console.log(`     ⚠️ [AI Writer] Groq ${model} Failed (Retry): ${msg}`);
        }

        console.log(`     ⏭️ [AI Writer] Moving to next Groq model...`);
    }

    return null; // All Groq models exhausted
}

/**
 * ✍️ Main Article Writer - Orchestrates all layers
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
    const systemInstruction = SYSTEM_PROMPT + timeContext;

    console.log(`\n  🧠 [AI Writer] Received Prompt. Length: ${userPrompt.length} chars. Time Context: ${istDate}`);

    // LAYER 1 & 2: Try all Gemini models (Primary + Fallback key)
    const geminiResult = await tryGeminiLayer(systemInstruction, userPrompt);
    if (geminiResult) {
        console.log(`\n  ✅ [AI Writer] SUCCESS via ${geminiResult.source}`);
        return geminiResult.data;
    }

    console.log(`\n  ⚠️ [AI Writer] All Gemini models exhausted. Switching to Groq...`);

    // LAYER 3: Try all Groq models
    const groqResult = await tryGroqLayer(systemInstruction, userPrompt);
    if (groqResult) {
        console.log(`\n  ✅ [AI Writer] SUCCESS via ${groqResult.source}`);
        return groqResult.data;
    }

    console.log(`\n  ❌ [AI Writer] ALL MODELS EXHAUSTED (Gemini + Groq)`);
    return null;
}

module.exports = { writeArticle };
