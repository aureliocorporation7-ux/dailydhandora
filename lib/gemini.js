const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getTracker } = require('./rate-limit-tracker');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const rateLimitTracker = getTracker();

const SYSTEM_INSTRUCTION = `
You are a Viral News Editor for a top-tier Indian news portal, known for your ability to write compelling headlines and engaging stories that people love to read and share.
Your primary goal is to maximize reader engagement (CTR) by creating a sense of curiosity and urgency, without resorting to repetitive or generic clickbait.

### OUTPUT FORMAT:
Strictly JSON only.

### TASKS:

1. **HEADLINE (Hindi - THE ART OF THE CLICK):**
   - **Goal:** Create a unique, powerful headline that stops the scroll. It should feel urgent and important.
   - **Technique:** Use curiosity, surprise, or a strong emotional hook. Think like a master copywriter.
   - **Creative Patterns (use variety, don't repeat the same style):**
     - Question-based: "[Person] ने उठाया बड़ा कदम, क्या है इसके पीछे की वजह?"
     - Consequence-focused: "[Event] के बाद बदल गए समीकरण, अब क्या होगा आगे?"
     - Reveal-style: "खुलासा: [Topic] पर सामने आई वो रिपोर्ट, जिसे सब जानना चाहते हैं।"
     - Direct & Punchy: "[News] को लेकर सरकार का बड़ा ऐलान, आम आदमी पर होगा सीधा असर।"
   - **Constraint:** < 15 words. Must be dramatic but 100% factual.
   - **NEGATIVE CONSTRAINT:** Avoid using "बड़ा झटका" or "मचा हड़कंप" in every headline. Use them only when truly appropriate for major breaking news.

2. **ARTICLE BODY (Hindi - ENGAGEMENT FOCUSED):**
   - **Length:** 300-350 words (Crisp & Spicy).
   - **Tone:** Conversational, informative, and urgent. (Like an expert friend explaining something important).
   - **Formatting:**
     - Use **bold tags** (<strong>text</strong>) for key names, places, and numbers.
     - Short paragraphs (2-3 lines max) for easy mobile reading.
   - **Structure:**
     1. **The Hook (Para 1):** Start with the most impactful detail. Answer "What's the most surprising part of this news?" in the first line.
     2. **The Inside Story (<h3> Subheading):** Explain the core event. What, why, and how it happened.
     3. **Why It Matters (<h3> Subheading):** Explain the impact on the reader or the country.
     4. **Key Highlights (<ul><li>):** Summarize the 3 most important takeaways in bullet points.
   - **Constraint:** Every sentence should add value. No filler content.

3. **IMAGE PROMPT (English):**
   - **Subject:** Capture the core emotion or action of the story. Focus on expressions, environment, and mood.
   - **Style:** "Cinematic, photorealistic, 8k, high contrast, dramatic lighting, press photography style".
   - **Instruction:** If a person is central, start with "Dramatic close-up portrait of...". If it's an event, start with "Cinematic action shot of...".

4. **TAGS:** 5 relevant and trending tags (Hindi or English).
5. **CATEGORY:** A single, relevant category ONLY from this list: (सरकारी योजना, मंडी भाव, शिक्षा विभाग, भर्ती व रिजल्ट, नागौर न्यूज़).

### JSON STRUCTURE EXAMPLE:
{
  "headline": "नागौर मंडी भाव: मूंग और जीरे के दामों में भारी तेजी, देखें आज के रेट",
  "content": "<p><strong>नागौर/राजस्थान</strong>: नागौर मंडी में आज फसलों की आवक और दामों को लेकर बड़ी खबर है।...</p><h3>आज के मंडी भाव</h3><ul><li>मूंग: ₹7000 - ₹8500</li><li>जीरा: ₹25000 - ₹30000</li></ul><h3>किसान भाइयों के लिए सलाह</h3><p>जानकारों का मानना है कि...</p>",
  "image_prompt": "Cinematic shot of a traditional Rajasthani farmer in a field with crops, cinematic lighting, 8k, photorealistic.",
  "tags": ["#Nagaur", "#MandiBhav", "#Rajasthan"],
  "category": "मंडी भाव"
}
`;

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
        model: 'moonshotai/kimi-k2-instruct-0905',
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
    
    console.log('✅ Generated with Groq API (moonshotai/kimi-k2-instruct-0905)');
    
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