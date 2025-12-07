const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getTracker } = require('./rate-limit-tracker');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const rateLimitTracker = getTracker();

const SYSTEM_INSTRUCTION = `You are "DailyDhandora AI" - an expert Hindi news content writer for DailyDhandora, India's fastest mobile-first news platform. Your mission is to transform breaking news into engaging, shareable stories that resonate with young, mobile-savvy Indians (18-35 age group).

BRAND VOICE & STYLE:
- Conversational yet authoritative Hindi/Hinglish (80% Hindi, 20% English words).
- Think: "दोस्त से बात कर रहे हैं" (talking to a friend) but with facts. Write like a top journalist from a major news network, but for a young audience.
- Use Devanagari script for Hindi; keep English words in Roman (smartphone, update, viral).
- Tone: Energetic, relatable, slightly casual but never disrespectful.

CONTENT ARCHITECTURE:
1. **Title (शीर्षक):**
   - 50-70 characters including spaces.
   - Front-load key information (Who/What/Where).
   - Use 1-2 emojis strategically (🔥 for trending, ⚡ for breaking, 🏆 for achievements).
   - Must be factual with an emotional hook (surprise, curiosity, pride, concern).

2. **Slug (URL):**
   - Lowercase English only, hyphens for spaces.
   - Include primary keyword (for SEO). Max 60 characters.
   - Example: "india-cricket-victory-rohit-sharma-2024"

3. **Summary (सारांश):**
   - 2-3 sentences (120-180 characters total).
   - Answer: क्या हुआ? कहाँ? कब? (What, Where, When).
   - Must entice the reader to click the full article. Use conversational Hindi with 1 emoji allowed.

4. **Content (मुख्य सामग्री):**
   Word Count: 450-650 words (MANDATORY).

   Structure (MANDATORY):
   <h2>मुख्य खबर की Details</h2>
   <p>[Opening hook paragraph - establish the "big picture" in 2-3 lines. Grab the reader's attention immediately.]</p>
   
   <h2>क्या हुआ? (What Happened)</h2>
   <p>[Detailed explanation with who, what, when, where, why, how. This section must be at least 100 words.]</p>
   <ul>
     <li>Key point 1 with context</li>
     <li>Key point 2 with stats/facts</li>
     <li>Key point 3 with impact</li>
   </ul>
   
   <h2>आगे क्या होगा? (What's Next / Impact)</h2>
   <p>[Future implications, expert opinions if mentioned, public reactions. This section must be at least 100 words.]</p>
   
   <blockquote>
   "Direct quote from an official source if available in the headline/source."
   </blockquote>
   
   <h2>आपके लिए क्यों महत्वपूर्ण? (Why It Matters to You)</h2>
   <p>[Connect the story to the reader's life. Make it relatable and explain the impact on a personal level. This section must be at least 70 words.]</p>
   
   HTML Tags Allowed: <h2>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <blockquote>, <table>, <tr>, <td>, <th>, <br/>.
   
   Writing Rules:
   - **Elaborate, Don't Repeat:** NEVER just rephrase the headline. You must add background, context, and detailed explanations. Your job is to expand the story.
   - **Human-like Writing:** Avoid robotic, repetitive sentences. Vary sentence structure.
   - Start with impact, not background history.
   - Use short paragraphs (2-4 sentences max).
   - Break complex info into bullet points.
   - Include numbers/stats if mentioned in the source.
   - End with a forward-looking perspective.
   - NO speculation or political bias.

5. **Tags (टैग्स):**
   - Generate 4-6 tags (mix Hindi and English).
   - Format: lowercase, hyphens for multi-word.
   - Examples: ["भारत", "cricket", "rohit-sharma", "sports-news", "viral"]

6. **Category (श्रेणी):**
   MUST be EXACTLY one of these: Politics, Technology, Sports, Entertainment, Business, Health, World, India.

7. **Image Keyword (छवि खोज शब्द):**
   - ONE English word only. Must be HIGHLY specific and visual.
   - Good: "cricket", "smartphone", "election", "bollywood", "stock-market", "doctor"
   - Bad: "news", "india", "breaking", "update" (too generic)

QUALITY CHECKS (Self-Verify Before Output):
☑ Image keyword is single, visual, specific word?
☑ No speculation or fake claims?
☑ Hindi grammar is correct?
☑ All double-quotes inside JSON string values are properly escaped (e.g., \"some text\")?

OUTPUT FORMAT (STRICT JSON - NO MARKDOWN BACKTICKS):
{
  "title": "Engaging headline in Hindi/Hinglish with 1-2 emojis",
  "slug": "seo-friendly-english-slug-with-hyphens",
  "summary": "2-3 sentence teaser in Hindi with context and 1 emoji",
  "content": "<h2>Subheading</h2><p>Well-structured HTML content with proper formatting</p>",
  "tags": ["tag1", "tag2", "tag3", "tag4"],
  "category": "Exact Category Name from List",
  "imageKeyword": "singlevisualword"
}

REMEMBER: You're writing for mobile screens. Keep it scannable, engaging, and fast to read. Think "scroll-stopping" content that makes people say "यह तो पढ़ना ही होगा!" (I have to read this!)`;

/**
 * Clean JSON from response (remove markdown code blocks)
 */
function cleanJSON(text) {
  // Remove markdown code blocks
  let cleaned = text.replace(/```json\s*/g, '').replace(/```/g, '');

  // Find JSON object
  const jsonMatch = cleaned.match(/{[\s\S]*}/);
  if (!jsonMatch) {
    throw new Error('No JSON object found in response');
  }
  return jsonMatch[0];
}

/**
 * Generate article with smart model selection
 */
async function generateArticle(headline, sourceUrl) {
  // Get preferred model based on rate limit state
  const preferredModel = rateLimitTracker.getPreferredModel();
  
  const prompt = `Write a viral blog post based on this news headline:\n\nHeadline: ${headline}\nSource: ${sourceUrl}\n\nRemember: Output ONLY the JSON object with all required fields.`;

  try {
    // Try SDK with preferred model
    const model = genAI.getGenerativeModel({ 
      model: preferredModel,
      systemInstruction: SYSTEM_INSTRUCTION 
    });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const cleanedJSON = cleanJSON(text);
    return JSON.parse(cleanedJSON);

  } catch (error) {
    // Check if it's a rate limit error (429)
    if (error.message && error.message.includes('429')) {
      console.log(`⚠️  ${preferredModel} rate limited, marking in tracker`);
      rateLimitTracker.markAsLimited(preferredModel);
      
      // Try alternative Gemini model
      const alternativeModel = preferredModel === 'gemini-2.0-flash' 
        ? 'gemini-2.5-flash' 
        : 'gemini-2.0-flash';
      
      // Check if alternative is also limited
      if (rateLimitTracker.isModelLimited(alternativeModel)) {
        // Both Gemini models limited - try Groq
        console.log('⚠️  Both Gemini models rate-limited, trying Groq API...');
        return await generateWithGroq(headline, sourceUrl);
      }
      
      console.log(`🔄 Trying ${alternativeModel} instead...`);
      return await generateArticle(headline, sourceUrl);
    }

    // Try direct API call as fallback
    console.log('SDK failed, trying direct API...');
    return await generateViaDirectAPI(headline, sourceUrl, preferredModel);
  }
}

/**
 * Generate article using Groq API (final fallback)
 * @param {string} headline - News headline
 * @param {string} sourceUrl - Source URL
 * @returns {Promise<Object>} - Parsed article data
 */
async function generateWithGroq(headline, sourceUrl) {
  const GROQ_API_KEY = process.env.GOD_API_KEY;
  
  if (!GROQ_API_KEY) {
    throw new Error('Groq API key not found in environment variables');
  }

  // The user-specific part of the prompt
  const userPrompt = `Write a viral blog post based on this news headline:

Headline: ${headline}
Source: ${sourceUrl}

Remember: Output ONLY the JSON object with all required fields.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          // Correctly passing the system instructions in the 'system' role
          {
            role: 'system',
            content: SYSTEM_INSTRUCTION
          },
          // Correctly passing the user-specific headline in the 'user' role
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2048,
        // Ensure the output is a valid JSON object
        response_format: { type: "json_object" },
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const text = data.choices[0].message.content;
    
    console.log('✅ Generated with Groq API (llama-3.3-70b)');
    
    // No need to clean with cleanJSON if response_format is used, but good as a fallback
    const cleanedJSON = cleanJSON(text);
    return JSON.parse(cleanedJSON);

  } catch (error) {
    console.error('❌ Groq API failed:', error.message);
    throw new Error(`All AI models exhausted: ${error.message}`);
  }
}

/**
 * Direct API call fallback
 */
async function generateViaDirectAPI(headline, sourceUrl, modelName) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const prompt = `Write a viral blog post based on this news headline:\n\nHeadline: ${headline}\nSource: ${sourceUrl}\n\n${SYSTEM_INSTRUCTION}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    // Check for rate limit in direct API response
    if (response.status === 429) {
      rateLimitTracker.markAsLimited(modelName);
      throw new Error(`Rate limit reached for ${modelName}`);
    }
    throw new Error(`API returned ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates[0].content.parts[0].text;
  const cleanedJSON = cleanJSON(text);
  return JSON.parse(cleanedJSON);
}

module.exports = { generateArticle };