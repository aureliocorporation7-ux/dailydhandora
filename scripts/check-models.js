
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

async function listModels() {
    const apiKey = process.env.GEMINI_PDF_API_KEY;
    if (!apiKey) {
        console.error('❌ Missing GEMINI_PDF_API_KEY');
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // There is no direct listModels on genAI instance in recent SDK usually.
    // It's usually on a model manager or similar, but let's try the common patterns.
    // Actually, in @google/generative-ai, it is often via `genAI.getGenerativeModel` but listing is separate.
    // Wait, the error message said "Call ListModels". That refers to the REST API method.
    // In the Node SDK, it might be exposed differently.
    // Let's try to find it. If not, I'll use a raw REST call.

    // Attempt raw REST call for certainty
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log('✅ Available Models:');
            data.models.forEach(m => {
                console.log(`- ${m.name}`);
                if (m.supportedGenerationMethods) {
                    console.log(`  Methods: ${m.supportedGenerationMethods.join(', ')}`);
                }
            });
        } else {
            console.log('⚠️ No models found or error structure:', data);
        }

        // Also try v1alpha just in case
        console.log('\n--- Checking v1alpha ---');
        const urlAlpha = `https://generativelanguage.googleapis.com/v1alpha/models?key=${apiKey}`;
        const resAlpha = await fetch(urlAlpha);
        const dataAlpha = await resAlpha.json();
        if (dataAlpha.models) {
            console.log('✅ Available v1alpha Models:');
            dataAlpha.models.forEach(m => {
                if (m.name.includes('audio') || m.name.includes('tts') || m.name.includes('flash')) {
                    console.log(`- ${m.name}`);
                }
            });
        }

    } catch (e) {
        console.error('❌ Fetch failed:', e.message);
    }
}

listModels();
