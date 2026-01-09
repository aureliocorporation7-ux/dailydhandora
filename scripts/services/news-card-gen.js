const sharp = require('sharp');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const FONT_URL = "https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Bold.ttf";
const FONT_FILENAME = 'NotoSansDevanagari-Bold.ttf';
const LOGO_FILENAME = 'logo.png';

// 🔍 Multiple paths to check (Render standalone build changes cwd)
const POSSIBLE_PATHS = [
    __dirname,                                              // Same folder as this file (MOST RELIABLE)
    path.join(process.cwd(), 'public'),                    // Local dev
    path.join(__dirname, '../../public'),                   // Relative to this file
    path.join(process.cwd(), '.next/standalone/public'),   // Standalone build
    '/app/public',                                          // Render absolute path
    '/app/.next/standalone/public',                         // Render standalone
    '/app/scripts/services'                                 // Render scripts folder
];

// Find the correct paths
function findPath(filename) {
    for (const basePath of POSSIBLE_PATHS) {
        const fullPath = path.join(basePath, filename);
        if (fs.existsSync(fullPath)) {
            console.log(`  ✅ [Card Gen] Found ${filename} at: ${fullPath}`);
            return fullPath;
        }
    }
    // Default fallback to cwd
    return path.join(process.cwd(), 'public', filename);
}

let FONT_PATH = null;
let LOGO_PATH = null;

/**
 * 📥 Ensures the Hindi font exists locally.
 */
async function ensureFont() {
    // Find font path if not set
    if (!FONT_PATH) {
        FONT_PATH = findPath(FONT_FILENAME);
    }
    if (!LOGO_PATH) {
        LOGO_PATH = findPath(LOGO_FILENAME);
    }

    if (fs.existsSync(FONT_PATH)) {
        console.log(`  ✅ [Card Gen] Font exists at: ${FONT_PATH}`);
        return;
    }

    console.log("  📥 [Card Gen] Font not found locally, downloading...");
    console.log(`  📂 [Card Gen] Will save to: ${FONT_PATH}`);

    try {
        // Ensure directory exists
        const fontDir = path.dirname(FONT_PATH);
        if (!fs.existsSync(fontDir)) {
            fs.mkdirSync(fontDir, { recursive: true });
        }

        const response = await axios({ url: FONT_URL, responseType: 'stream' });
        const writer = fs.createWriteStream(FONT_PATH);
        response.data.pipe(writer);
        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                console.log("  ✅ [Card Gen] Font downloaded successfully!");
                resolve();
            });
            writer.on('error', reject);
        });
    } catch (e) {
        console.error("  ❌ [Card Gen] Failed to download font:", e.message);
    }
}

/**
 * 🔄 Helper: Get Font as Base64 for reliable embedding
 */
function getFontBase64() {
    // Ensure path is found
    if (!FONT_PATH) {
        FONT_PATH = findPath(FONT_FILENAME);
    }

    if (FONT_PATH && fs.existsSync(FONT_PATH)) {
        console.log(`  📖 [Card Gen] Reading font from: ${FONT_PATH}`);
        return fs.readFileSync(FONT_PATH).toString('base64');
    }
    console.warn("  ⚠️ [Card Gen] Font file not found, Hindi text may show boxes!");
    return '';
}

/**
 * ✂️ Wraps text into lines (Basic implementation)
 */
function wrapText(text, maxCharsPerLine = 35) {
    if (!text) return ["Update"];
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
        const fontBase64 = getFontBase64();

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
        const lines = wrapText(headline, 40); // Wrap at ~40 chars
        const lineHeight = 60;
        const textBlockHeight = lines.length * lineHeight;
        const textStartY = height - 60 - textBlockHeight; // Position from bottom with padding

        const textSvg = `
        <svg width="${width}" height="${height}">
            <defs>
                <style>
                    @font-face {
                        font-family: 'Noto Sans Devanagari';
                        src: url(data:font/ttf;base64,${fontBase64});
                    }
                    .title { 
                        fill: white; 
                        font-family: 'Noto Sans Devanagari', sans-serif; 
                        font-size: 48px; 
                        font-weight: bold;
                        text-shadow: 2px 2px 4px rgba(0,0,0,0.9);
                    }
                </style>
                <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:rgb(0,0,0);stop-opacity:0" />
                    <stop offset="40%" style="stop-color:rgb(0,0,0);stop-opacity:0.6" />
                    <stop offset="100%" style="stop-color:rgb(0,0,0);stop-opacity:0.95" />
                </linearGradient>
            </defs>
            
            <!-- Gradient Overlay (Bottom Half for readability) -->
            <rect x="0" y="${height * 0.4}" width="${width}" height="${height * 0.6}" fill="url(#grad)" />
            
            <!-- Branding Tag -->
            <rect x="40" y="${textStartY - 70}" width="220" height="40" rx="5" fill="#DC2626" />
            <text x="150" y="${textStartY - 43}" font-family="sans-serif" font-size="20" fill="white" text-anchor="middle" font-weight="bold">DAILY DHANDORA</text>

            <!-- Text Lines -->
            ${lines.map((line, i) =>
            `<text x="40" y="${textStartY + (i * lineHeight)}" class="title">${line}</text>`
        ).join('')}
        </svg>
        `;

        // 5. Composite
        const compositeOps = [
            { input: Buffer.from(textSvg), top: 0, left: 0 }
        ];

        if (logoBuffer) {
            compositeOps.push({ input: logoBuffer, top: 20, left: width - 170 });
        }

        return await sharp(inputImageBuffer)
            .resize(width, height)
            .composite(compositeOps)
            .png()
            .toBuffer();

    } catch (e) {
        console.error("❌ [Card Gen] Error:", e);
        return null;
    }
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
        const fontBase64 = getFontBase64();

        const width = 1200;
        const height = 675;

        // SVG Construction
        const bgSvg = `
        <svg width="${width}" height="${height}">
            <defs>
                <style>
                    @font-face {
                        font-family: 'Noto Sans Devanagari';
                        src: url(data:font/ttf;base64,${fontBase64});
                    }
                    .header-text { font-family: 'Noto Sans Devanagari', sans-serif; font-weight: bold; }
                    .row-text { font-family: 'Noto Sans Devanagari', sans-serif; font-weight: bold; }
                </style>
                <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#14532d;stop-opacity:1" /> <!-- Dark Green -->
                    <stop offset="100%" style="stop-color:#166534;stop-opacity:1" /> <!-- Green -->
                </linearGradient>
            </defs>
            <rect width="${width}" height="${height}" fill="url(#bgGrad)" />
            
            <!-- Header -->
            <rect x="0" y="0" width="${width}" height="100" fill="#facc15" />
            <text x="${width / 2}" y="70" class="header-text" font-size="48" fill="#000" text-anchor="middle">
                मंडी भाव अपडेट - ${date}
            </text>

            <!-- Columns Header -->
            <rect x="100" y="130" width="1000" height="50" rx="10" fill="rgba(255,255,255,0.2)" />
            <text x="150" y="165" class="header-text" font-size="32" fill="#fff">फसल</text>
            <text x="600" y="165" class="header-text" font-size="32" fill="#fff" text-anchor="middle">न्यूनतम</text>
            <text x="1050" y="165" class="header-text" font-size="32" fill="#fff" text-anchor="end">अधिकतम</text>
        </svg>
        `;

        // Generate Rows
        let rowY = 220;
        let rowsSvg = "";

        const topRates = rates.slice(0, 6);

        topRates.forEach((item, i) => {
            const isEven = i % 2 === 0;
            const bg = isEven ? 'fill="rgba(255,255,255,0.1)"' : 'fill="rgba(255,255,255,0.05)"';

            rowsSvg += `
                <rect x="100" y="${rowY - 35}" width="1000" height="60" rx="5" ${bg} />
                <text x="150" y="${rowY + 10}" class="row-text" font-size="36" fill="#fff">${item.crop}</text>
                <text x="600" y="${rowY + 10}" class="row-text" font-size="36" fill="#fbbf24" text-anchor="middle">₹${item.min}</text>
                <text x="1050" y="${rowY + 10}" class="row-text" font-size="36" fill="#4ade80" text-anchor="end">₹${item.max}</text>
            `;
            rowY += 80;
        });

        const footerSvg = `
             <text x="${width / 2}" y="${height - 30}" font-family="sans-serif" font-size="24" fill="#cbd5e1" text-anchor="middle">
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

/**
 * 🎓 Generates an "Education Update" card (Blue/Yellow Theme).
 * @param {string} headline - The Hindi headline.
 * @param {string} date - Date string.
 * @returns {Promise<Buffer>} - The generated image buffer.
 */
async function generateEduCard(headline, date) {
    try {
        await ensureFont();
        const fontBase64 = getFontBase64();

        const width = 1200;
        const height = 675;

        // SVG Construction
        const bgSvg = `
        <svg width="${width}" height="${height}">
            <defs>
                <style>
                    @font-face {
                        font-family: 'Noto Sans Devanagari';
                        src: url(data:font/ttf;base64,${fontBase64});
                    }
                    .header-text { font-family: 'Noto Sans Devanagari', sans-serif; font-weight: bold; }
                    .main-text { font-family: 'Noto Sans Devanagari', sans-serif; font-weight: bold; }
                </style>
                <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#1e3a8a;stop-opacity:1" /> <!-- Royal Blue -->
                    <stop offset="100%" style="stop-color:#172554;stop-opacity:1" /> <!-- Darker Blue -->
                </linearGradient>
            </defs>
            <rect width="${width}" height="${height}" fill="url(#bgGrad)" />
            
            <!-- Header -->
            <rect x="0" y="0" width="${width}" height="100" fill="#facc15" /> <!-- Yellow -->
            <text x="${width / 2}" y="70" class="header-text" font-size="48" fill="#000" text-anchor="middle">
                राजस्थान शिक्षा विभाग अपडेट
            </text>

            <!-- Date Badge -->
            <rect x="${width - 250}" y="120" width="220" height="40" rx="20" fill="rgba(255,255,255,0.2)" />
            <text x="${width - 140}" y="148" font-family="sans-serif" font-size="20" fill="#fff" text-anchor="middle" font-weight="bold">
                ${date}
            </text>

            <!-- Central Content Box -->
            <rect x="100" y="200" width="1000" height="300" rx="15" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.3)" stroke-width="2" />
            
            <!-- Headline Wrapped -->
            ${(() => {
                const lines = wrapText(headline, 35); // Wrap tighter for center box
                let textSvg = '';
                let startY = 280;
                if (lines.length > 3) startY = 250; // Adjust if long

                lines.forEach((line, i) => {
                    textSvg += `<text x="${width / 2}" y="${startY + (i * 70)}" class="main-text" font-size="52" fill="#fff" text-anchor="middle">${line}</text>`;
                });
                return textSvg;
            })()}

            <!-- Footer -->
             <text x="${width / 2}" y="${height - 30}" font-family="sans-serif" font-size="24" fill="#cbd5e1" text-anchor="middle">
                DailyDhandora.com - Education Portal
             </text>
        </svg>
        `;

        // Composite Logo
        let logoBuffer = null;
        if (fs.existsSync(LOGO_PATH)) {
            logoBuffer = await sharp(LOGO_PATH).resize(120).toBuffer();
        }

        const compositeOps = [
            { input: Buffer.from(bgSvg), top: 0, left: 0 }
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
        console.error("❌ [Edu Card] Error:", e);
        return null;
    }
}

module.exports = { generateNewsCard, generateMandiCard, generateEduCard };