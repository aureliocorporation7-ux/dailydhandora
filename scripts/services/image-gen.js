if (process.env.CI) {
  require('dotenv').config({ path: '.env' });
} else {
  require('dotenv').config({ path: '.env.local', override: true });
}

const axios = require('axios');
const FormData = require('form-data');
const { HfInference } = require('@huggingface/inference');

const IMGBB_KEY = process.env.IMGBB;

/**
 * 🎨 Generates an image using HuggingFace Flux and uploads to ImgBB.
 * @param {string} prompt - The image generation prompt.
 * @returns {Promise<string|null>} - The URL of the uploaded image or null on failure.
 */
async function generateImage(prompt) {
    console.log(`
  🎨 [Image Gen] Starting Process...`);
    console.log(`     Prompt: "${prompt.substring(0, 50)}"...`);
    
    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    async function tryGenerate(token, label) {
        if (!token) {
            console.log(`     ⚠️ [Image Gen] ${label} is missing/undefined. Skipping.`);
            return null;
        }
        try {
            console.log(`     🔑 [Image Gen] Attempting generation with ${label}...`);
            const hfClient = new HfInference(token);
            const result = await hfClient.textToImage({
                model: "black-forest-labs/FLUX.1-schnell",
                inputs: prompt,
                parameters: { guidance_scale: 0.0, num_inference_steps: 4, wait_for_model: true }
            });
            const buffer = Buffer.from(await result.arrayBuffer());
            if (buffer.length > 0) {
                console.log(`     ✅ [Image Gen] Success! Image generated with ${label}. Size: ${buffer.length} bytes.`);
                return buffer;
            }
        } catch (err) { 
            console.log(`     ❌ [Image Gen] ${label} Failed: ${err.message}`); 
        }
        return null;
    }

    let buffer = await tryGenerate(process.env.HUGGINGTOCK, "Token 1 (Primary)");
    
    if (!buffer && process.env.HUGGINGTOCK_BACKUP) {
        console.log(`     🔄 [Image Gen] Switching to Backup Token 1...`);
        await wait(2000); 
        buffer = await tryGenerate(process.env.HUGGINGTOCK_BACKUP, "Token 2 (Backup)");
    }
    
    if (!buffer && process.env.HUGGINGTOCK_BACKUP2) {
        console.log(`     🔄 [Image Gen] Switching to Backup Token 2...`);
        await wait(2000); 
        buffer = await tryGenerate(process.env.HUGGINGTOCK_BACKUP2, "Token 3 (Reserve)");
    }

    if (!buffer) {
        console.error("  ❌ [Image Gen] CRITICAL: All image tokens exhausted. Generation failed.");
        return null;
    }

    return await uploadToImgBB(buffer);
}

/**
 * 📤 Uploads an image buffer to ImgBB.
 * @param {Buffer} buffer - The image buffer.
 * @returns {Promise<string|null>} - The URL of the uploaded image.
 */
async function uploadToImgBB(buffer) {
    try {
        console.log("     📤 [ImgBB] Uploading...");
        const form = new FormData();
        form.append('image', buffer.toString('base64'));
        const res = await axios.post(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, form, { headers: { ...form.getHeaders() } });
        
        if (res.data.success) {
            console.log(`     ✅ [ImgBB] Upload Complete: ${res.data.data.url}`);
            return res.data.data.url;
        } else {
            console.error(`     ❌ [ImgBB] Upload Failed: ${JSON.stringify(res.data)}`);
        }
    } catch (e) { 
        console.error(`     ❌ [ImgBB] Error: ${e.message}`); 
    }
    return null;
}

module.exports = { generateImage, uploadToImgBB };