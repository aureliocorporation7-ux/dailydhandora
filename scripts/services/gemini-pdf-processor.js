/**
 * 📄 Gemini PDF Processor Service
 * 
 * Downloads PDFs and extracts text content using Gemini's built-in PDF processing.
 * No server-side OCR needed - Gemini handles it natively.
 * 
 * Features:
 * - Safe PDF download with verification
 * - Single API Key (GEMINI_PDF_API_KEY)
 * - Model Fallback: gemini-1.5-flash ("2.5-flash-lite") → gemini-2.0-flash ("2.5-flash") → gemini-1.5-pro ("3-flash")
 * - Rate limit protection with strict 90s delays
 */

if (process.env.CI) {
    require('dotenv').config({ path: '.env' });
} else {
    require('dotenv').config({ path: '.env.local', override: true });
}

const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// 🔑 Single API Key for PDF Processing
const PDF_API_KEY = process.env.GEMINI_PDF_API_KEY;

// 🤖 Model Fallback Order (Strict User Selection)
// Using exact model names provided by user
const MODELS = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-3-flash'
];

// ⏱️ Delay helper for rate limiting
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 📥 Safe PDF Download with verification
 * @param {string} pdfUrl - URL of the PDF
 * @returns {Promise<{success: boolean, base64?: string, size?: number, error?: string}>}
 */
async function downloadPdfSafe(pdfUrl) {
    console.log(`\n📥 [PDF Download] Starting...`);
    console.log(`   URL: ${pdfUrl.substring(0, 80)}...`);

    try {
        // Validate URL
        if (!pdfUrl || !pdfUrl.startsWith('http')) {
            return { success: false, error: 'Invalid URL' };
        }

        // Download with timeout and retries
        let buffer = null;
        let attempts = 0;
        const maxAttempts = 3;

        while (!buffer && attempts < maxAttempts) {
            attempts++;
            console.log(`   Attempt ${attempts}/${maxAttempts}...`);

            try {
                const response = await axios.get(pdfUrl, {
                    responseType: 'arraybuffer',
                    timeout: 60000, // 60 seconds timeout
                    maxContentLength: 10 * 1024 * 1024, // 10MB max
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'application/pdf,*/*'
                    }
                });

                buffer = Buffer.from(response.data);
            } catch (downloadError) {
                console.log(`   ⚠️ Attempt ${attempts} failed: ${downloadError.message}`);
                if (attempts < maxAttempts) {
                    await delay(2000); // Wait 2 seconds before retry
                }
            }
        }

        if (!buffer) {
            return { success: false, error: 'Download failed after 3 attempts' };
        }

        // Verify it's actually a PDF (check magic bytes)
        const pdfMagic = buffer.slice(0, 5).toString();
        if (!pdfMagic.startsWith('%PDF')) {
            console.log(`   ❌ Not a valid PDF file (magic: ${pdfMagic})`);
            return { success: false, error: 'Not a valid PDF file' };
        }

        // Check size
        const sizeKB = Math.round(buffer.length / 1024);
        console.log(`   ✅ Downloaded: ${sizeKB} KB`);

        if (buffer.length < 100) {
            return { success: false, error: 'PDF too small, possibly corrupted' };
        }

        // Convert to base64
        const base64 = buffer.toString('base64');

        return {
            success: true,
            base64,
            size: buffer.length
        };

    } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * 🤖 Extract text using Gemini with model fallback
 * @param {string} base64Data - Base64 encoded PDF
 * @returns {Promise<{success: boolean, content?: string, model?: string, error?: string}>}
 */
async function extractWithGemini(base64Data) {
    console.log(`\n🤖 [Gemini Extract] Starting...`);

    // Check API key
    if (!PDF_API_KEY) {
        console.error(`   ❌ GEMINI_PDF_API_KEY not found in environment!`);
        return { success: false, error: 'API key not configured' };
    }

    const prompt = `You are an expert Data Extractor for Government Orders.
Task: Extract ALL content, boosting clarity for key details.

INSTRUCTIONS:
1. **Header Info**: Explicitly find and label:
   - "Order Number" (Kramank)
   - "Date" (Dinank)
   - "Subject" (Vishay)
2. **Main Content**: Extract body text exactly. Do not start summarizing yet, just extract.
3. **Tables**: If tables exist (e.g., Transfer list), extract every row.
4. **Signatories**: Who signed it? (Name/Designation).

Output: Return the full extracted text with clear labels for Header Info.`;

    // Try each model in fallback order
    for (let i = 0; i < MODELS.length; i++) {
        const modelName = MODELS[i];
        console.log(`   📍 Model ${i + 1}/${MODELS.length}: ${modelName}`);

        // Retry logic: 3 calls per model (as per "1 minute me 3 baar call")
        // Strict Requirement: "Agr beech me error aa jaata he to 90 second ka cool down"

        let retryCount = 0;
        const maxRetries = 2; // 0, 1, 2 = 3 Total Attempts

        while (retryCount <= maxRetries) {
            try {
                // Rate limit protection / Retry delay
                if (retryCount > 0) {
                    console.log(`   🔄 Retry ${retryCount + 1}/${maxRetries + 1}...`);
                }

                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent([
                    {
                        inlineData: {
                            mimeType: 'application/pdf',
                            data: base64Data
                        }
                    },
                    { text: prompt }
                ]);

                const response = await result.response;
                const text = response.text();

                if (text && text.length > 50) {
                    console.log(`   ✅ Success! Extracted ${text.length} chars`);
                    return {
                        success: true,
                        content: text,
                        model: modelName
                    };
                } else {
                    throw new Error('Empty or too short response');
                }

            } catch (error) {
                const errorMsg = error.message || '';
                console.log(`   ⚠️ Attempt ${retryCount + 1} failed (${modelName}): ${errorMsg}`);

                // Strict 90s Cooldown on ANY error (as requested)
                if (retryCount < maxRetries) {
                    console.log(`   ⏳ Error encountered. Cooling down 90s before retry...`);
                    await delay(90000); // 90 seconds strict wait
                    retryCount++;
                    continue; // Retry same model
                } else {
                    console.log(`   ❌ Max attempts (3) for ${modelName} reached. Switching to fallback...`);
                    // If this was the last retry, we break the while loop and move to "for" loop (next model)
                }
            }
            break; // Break retry loop (success or exhausted)
        }
    }

    console.error(`   ❌ All models failed!`);
    return { success: false, error: 'All models exhausted' };
}

/**
 * 📄 Main function: Process PDF and extract content
 * @param {string} pdfUrl - URL of the PDF to process
 * @returns {Promise<{success: boolean, content?: string, error?: string}>}
 */
async function processPdf(pdfUrl) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`📄 GEMINI PDF PROCESSOR`);
    console.log(`${'='.repeat(50)}`);

    // Step 1: Safe Download
    const downloadResult = await downloadPdfSafe(pdfUrl);

    if (!downloadResult.success) {
        console.log(`\n❌ FAILED: ${downloadResult.error}`);
        return { success: false, content: null, error: downloadResult.error };
    }

    console.log(`\n✅ PDF Downloaded (${Math.round(downloadResult.size / 1024)} KB)`);

    // Step 2: Extract with Gemini (only if download successful)
    const extractResult = await extractWithGemini(downloadResult.base64);

    if (!extractResult.success) {
        console.log(`\n❌ EXTRACTION FAILED: ${extractResult.error}`);
        return { success: false, content: null, error: extractResult.error };
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`✅ SUCCESS! Model: ${extractResult.model}`);
    console.log(`   Content: ${extractResult.content.length} characters`);
    console.log(`${'='.repeat(50)}\n`);

    return {
        success: true,
        content: extractResult.content,
        model: extractResult.model
    };
}

/**
 * 📋 Extract structured order details from PDF
 */
async function extractOrderDetails(pdfUrl) {
    const result = await processPdf(pdfUrl);

    if (!result.success) {
        return { success: false, data: null, error: result.error };
    }

    // Parse the content for structured data
    return {
        success: true,
        data: {
            rawContent: result.content,
            model: result.model
        }
    };
}

module.exports = {
    processPdf,
    extractOrderDetails,
    downloadPdfSafe,
    testConnection: async () => {
        try {
            const genAI = new GoogleGenerativeAI(PDF_API_KEY);
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const result = await model.generateContent('Hello, are you online? Reply with "Yes" only.');
            console.log('   🤖 API Connectivity Test: ' + (await result.response).text());
            return true;
        } catch (e) {
            console.log('   ❌ API Connectivity Test Failed:', e.message);
            return false;
        }
    }
};

// Standalone test
if (require.main === module) {
    const testUrl = process.argv[2];

    if (!testUrl) {
        console.log('Usage: node gemini-pdf-processor.js <pdf-url>');
        console.log('Example: node gemini-pdf-processor.js https://example.com/document.pdf');
        process.exit(1);
    }

    processPdf(testUrl).then(async result => {
        console.log('\n--- FINAL RESULT ---');
        if (result.success) {
            console.log('Status: SUCCESS');
            console.log(`Content Preview: ${result.content.substring(0, 500)}...`);
            process.exit(0);
        } else {
            console.log('Status: FAILED');
            console.log(`Error: ${result.error}`);

            // Fallback: Test simple text connectivity logic as requested
            console.log('\n📋 [Fallback] Testing simple text connectivity...');
            await module.exports.testConnection();

            process.exit(1);
        }
    });
}
