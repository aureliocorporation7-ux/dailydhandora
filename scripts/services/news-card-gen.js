const sharp = require('sharp');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const FONT_URL = "https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Bold.ttf";
const FONT_PATH = path.join(__dirname, 'NotoSansDevanagari-Bold.ttf');
const LOGO_PATH = path.join(process.cwd(), 'public', 'logo.png');

/**
 * 📥 Ensures the Hindi font exists locally.
 */
async function ensureFont() {
    if (fs.existsSync(FONT_PATH)) return;
    console.log("  📥 [Card Gen] Downloading Hindi Font...");
    const response = await axios({ url: FONT_URL, responseType: 'stream' });
    const writer = fs.createWriteStream(FONT_PATH);
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

/**
 * ✂️ Wraps text into lines (Basic implementation, though foreignObject handles this better usually)
 * But since foreignObject support depends on the system's libraries (fontconfig), 
 * sometimes SVG <text> with manual spans is safer for pure Node environments.
 * However, we will try the SVG <text> approach with simple line breaking logic first.
 */
function wrapText(text, maxCharsPerLine = 35) {
    const words = text.split(' ');
    let lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        if ((currentLine + " " + words[i]).length < maxCharsPerLine) {
            currentLine += " " + words[i];
        } else {
            lines.push(currentLine);
            currentLine = words[i];
        }
    }
    lines.push(currentLine);
    return lines;
}

/**
 * 🎴 Generates a "Breaking News" card.
 * @param {string} imageUrl - The background image URL.
 * @param {string} headline - The Hindi headline.
 * @returns {Promise<Buffer>} - The generated image buffer.
 */
async function generateNewsCard(imageUrl, headline) {
    try {
        await ensureFont();

        // 1. Download Background Image
        const inputImageBuffer = (await axios({ url: imageUrl, responseType: 'arraybuffer' })).data;
        
        // 2. Prepare Dimensions
        const width = 1200;
        const height = 675;
        
        // 3. Load Logo (if exists)
        let logoBuffer = null;
        if (fs.existsSync(LOGO_PATH)) {
            logoBuffer = await sharp(LOGO_PATH).resize(150).toBuffer();
        }

        // 4. Create SVG Overlay (Gradient + Text)
        // We use SVG for the text rendering because it supports fonts better in Sharp.
        const lines = wrapText(headline, 40); // Wrap at ~40 chars
        
        // SVG Logic
        const lineHeight = 60;
        const textStartY = height - 40 - (lines.length * lineHeight); // Position from bottom
        
        const textSvg = `
        <svg width="${width}" height="${height}">
            <defs>
                <style>
                    @font-face {
                        font-family: 'Noto Sans Devanagari';
                        src: url('${FONT_PATH}');
                    }
                    .title { 
                        fill: white; 
                        font-family: 'Noto Sans Devanagari', sans-serif; 
                        font-size: 48px; 
                        font-weight: bold;
                        text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
                    }
                </style>
                <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="50%" style="stop-color:rgb(0,0,0);stop-opacity:0" />
                    <stop offset="100%" style="stop-color:rgb(0,0,0);stop-opacity:0.9" />
                </linearGradient>
            </defs>
            
            <!-- Gradient Overlay (Bottom Half) -->
            <rect x="0" y="${height * 0.4}" width="${width}" height="${height * 0.6}" fill="url(#grad)" />
            
            <!-- Text Lines -->
            ${lines.map((line, i) => 
                `<text x="40" y="${textStartY + (i * lineHeight)}" class="title">${line}</text>`
            ).join('')}
            
            <!-- Branding Tag -->
            <rect x="40" y="${textStartY - 60}" width="160" height="40" rx="5" fill="#DC2626" />
            <text x="120" y="${textStartY - 33}" font-family="sans-serif" font-size="20" fill="white" text-anchor="middle" font-weight="bold">DAILY DHANDORA</text>
        </svg>
        `;

        // 5. Composite
        const compositeOps = [
            { input: Buffer.from(textSvg), top: 0, left: 0 }
        ];

        if (logoBuffer) {
            compositeOps.push({ input: logoBuffer, top: 20, left: width - 170 });
        }

/**
 * 🌾 Generates a "Mandi Bhav" card with a rate table.
 * @param {Array<{crop: string, min: string, max: string}>} rates - List of top crops.
 * @param {string} date - Date of the rates.
 * @returns {Promise<Buffer>} - The generated image buffer.
 */
async function generateMandiCard(rates, date) {
    try {
        await ensureFont();

        const width = 1200;
        const height = 675;

        // Background: Solid Green Gradient or Texture
        // We'll create a simple green gradient background using SVG
        const bgSvg = `
        <svg width="${width}" height="${height}">
            <defs>
                <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#14532d;stop-opacity:1" /> <!-- Dark Green -->
                    <stop offset="100%" style="stop-color:#166534;stop-opacity:1" /> <!-- Green -->
                </linearGradient>
            </defs>
            <rect width="${width}" height="${height}" fill="url(#bgGrad)" />
            
            <!-- Header -->
            <rect x="0" y="0" width="${width}" height="100" fill="#facc15" /> <!-- Yellow Header -->
            <text x="${width/2}" y="70" font-family="Noto Sans Devanagari" font-size="48" font-weight="bold" fill="#000" text-anchor="middle">
                मंडी भाव अपडेट - ${date}
            </text>

            <!-- Columns Header -->
            <rect x="100" y="130" width="1000" height="50" rx="10" fill="rgba(255,255,255,0.2)" />
            <text x="150" y="165" font-family="Noto Sans Devanagari" font-size="32" fill="#fff" font-weight="bold">फसल</text>
            <text x="600" y="165" font-family="Noto Sans Devanagari" font-size="32" fill="#fff" font-weight="bold" text-anchor="middle">न्यूनतम</text>
            <text x="1050" y="165" font-family="Noto Sans Devanagari" font-size="32" fill="#fff" font-weight="bold" text-anchor="end">अधिकतम</text>
        </svg>
        `;

        // Generate Rows
        let rowY = 220;
        let rowsSvg = "";
        
        // Take top 6 crops only to fit
        const topRates = rates.slice(0, 6);

        topRates.forEach((item, i) => {
            const isEven = i % 2 === 0;
            const bg = isEven ? 'fill="rgba(255,255,255,0.1)"' : 'fill="rgba(255,255,255,0.05)"';
            
            rowsSvg += `
                <rect x="100" y="${rowY - 35}" width="1000" height="60" rx="5" ${bg} />
                <text x="150" y="${rowY + 10}" font-family="Noto Sans Devanagari" font-size="36" fill="#fff" font-weight="bold">${item.crop}</text>
                <text x="600" y="${rowY + 10}" font-family="Noto Sans Devanagari" font-size="36" fill="#fbbf24" font-weight="bold" text-anchor="middle">₹${item.min}</text>
                <text x="1050" y="${rowY + 10}" font-family="Noto Sans Devanagari" font-size="36" fill="#4ade80" font-weight="bold" text-anchor="end">₹${item.max}</text>
            `;
            rowY += 80;
        });

        const footerSvg = `
             <text x="${width/2}" y="${height - 30}" font-family="sans-serif" font-size="24" fill="#cbd5e1" text-anchor="middle">
                DailyDhandora.com - किसानों का साथी
             </text>
        `;

        const finalSvg = bgSvg.replace('</svg>', `${rowsSvg}${footerSvg}</svg>`);

        // Composite Logo if available
        let logoBuffer = null;
        if (fs.existsSync(LOGO_PATH)) {
            logoBuffer = await sharp(LOGO_PATH).resize(120).toBuffer();
        }
        
        const compositeOps = [
             { input: Buffer.from(finalSvg), top: 0, left: 0 }
        ];

        if (logoBuffer) {
             compositeOps.push({ input: logoBuffer, top: 10, left: 20 });
        }

        return await sharp({
            create: {
                width: width,
                height: height,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            }
        })
        .composite(compositeOps)
        .png()
        .toBuffer();

    } catch (e) {
        console.error("❌ [Mandi Card] Error:", e);
        return null;
    }
}

module.exports = { generateNewsCard, generateMandiCard };
