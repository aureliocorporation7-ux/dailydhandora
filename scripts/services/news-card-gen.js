const satori = require('satori').default;
const { Resvg } = require('@resvg/resvg-js');
const sharp = require('sharp');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 🔤 FONT CONFIGURATION
// Using Hind font - specifically designed for Hindi with proper matra rendering
// Hind is optimized for UI and has excellent Devanagari support
// Source: Official Google Fonts repository
const DEVANAGARI_FONT_URL = "https://github.com/nicholaswmin/font-files/raw/master/fonts/NotoSansDevanagari/NotoSansDevanagari-Regular.ttf";
const DEVANAGARI_FONT_FILENAME = 'NotoSansDevanagari-Regular.ttf';
const LATIN_FONT_FILENAME = 'NotoSans-Bold.ttf';
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

let DEVANAGARI_FONT_PATH = null;
let LATIN_FONT_PATH = null;
let LOGO_PATH = null;
let DEVANAGARI_FONT_BUFFER = null; // Cache Devanagari font buffer for Satori
let LATIN_FONT_BUFFER = null;       // Cache Latin font buffer for Satori

/**
 * 📥 Ensures both Hindi and Latin fonts exist locally and loads them into memory.
 */
async function ensureFont() {
    // Find font paths if not set
    if (!DEVANAGARI_FONT_PATH) {
        DEVANAGARI_FONT_PATH = findPath(DEVANAGARI_FONT_FILENAME);
    }
    if (!LATIN_FONT_PATH) {
        LATIN_FONT_PATH = findPath(LATIN_FONT_FILENAME);
    }
    if (!LOGO_PATH) {
        LOGO_PATH = findPath(LOGO_FILENAME);
    }

    // Load Devanagari font
    if (fs.existsSync(DEVANAGARI_FONT_PATH)) {
        console.log(`  ✅ [Card Gen] Devanagari font exists at: ${DEVANAGARI_FONT_PATH}`);
        if (!DEVANAGARI_FONT_BUFFER) {
            DEVANAGARI_FONT_BUFFER = fs.readFileSync(DEVANAGARI_FONT_PATH);
            console.log(`  ✅ [Card Gen] Devanagari font loaded (${DEVANAGARI_FONT_BUFFER.length} bytes)`);
        }
    } else {
        console.log("  📥 [Card Gen] Devanagari font not found, downloading...");
        try {
            const fontDir = path.dirname(DEVANAGARI_FONT_PATH);
            if (!fs.existsSync(fontDir)) {
                fs.mkdirSync(fontDir, { recursive: true });
            }
            const response = await axios({ url: DEVANAGARI_FONT_URL, responseType: 'arraybuffer' });
            fs.writeFileSync(DEVANAGARI_FONT_PATH, Buffer.from(response.data));
            DEVANAGARI_FONT_BUFFER = fs.readFileSync(DEVANAGARI_FONT_PATH);
            console.log("  ✅ [Card Gen] Devanagari font downloaded!");
        } catch (e) {
            console.error("  ❌ [Card Gen] Failed to download Devanagari font:", e.message);
        }
    }

    // Load Latin font
    if (fs.existsSync(LATIN_FONT_PATH)) {
        console.log(`  ✅ [Card Gen] Latin font exists at: ${LATIN_FONT_PATH}`);
        if (!LATIN_FONT_BUFFER) {
            LATIN_FONT_BUFFER = fs.readFileSync(LATIN_FONT_PATH);
            console.log(`  ✅ [Card Gen] Latin font loaded (${LATIN_FONT_BUFFER.length} bytes)`);
        }
    } else {
        console.warn("  ⚠️ [Card Gen] Latin font not found, English text may show boxes!");
    }
}

/**
 * 🔄 Get Satori fonts configuration (both Devanagari and Latin)
 * IMPORTANT: Devanagari MUST be FIRST for proper Hindi rendering
 */
function getSatoriFonts() {
    const fonts = [];

    // 🔤 Add Devanagari font FIRST (PRIMARY for Hindi - fixes matra issues)
    if (DEVANAGARI_FONT_BUFFER) {
        fonts.push({
            name: 'Noto Sans Devanagari',
            data: DEVANAGARI_FONT_BUFFER,
            weight: 700,
            style: 'normal'
        });
        console.log('  ✅ [Fonts] Devanagari font loaded as PRIMARY');
    }

    // Add Latin font SECOND (fallback for English characters)
    if (LATIN_FONT_BUFFER) {
        fonts.push({
            name: 'Noto Sans',
            data: LATIN_FONT_BUFFER,
            weight: 700,
            style: 'normal'
        });
    }

    if (fonts.length === 0) {
        console.warn("  ⚠️ [Card Gen] No font buffers loaded!");
    }

    return fonts;
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
 * 🖼️ Convert SVG string to PNG buffer using resvg-js
 */
function svgToPng(svgString, width = 1200) {
    const resvg = new Resvg(svgString, {
        fitTo: {
            mode: 'width',
            value: width
        }
    });
    return resvg.render().asPng();
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
        const fonts = getSatoriFonts();

        // 1. Download Background Image
        const inputImageBuffer = (await axios({ url: imageUrl, responseType: 'arraybuffer' })).data;

        // 2. Prepare Dimensions
        const width = 1200;
        const height = 675;

        // 3. Wrap headline into lines
        const lines = wrapText(headline, 40);

        // 4. Create overlay SVG using Satori
        const overlaySvg = await satori(
            {
                type: 'div',
                props: {
                    style: {
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        padding: '40px',
                        background: 'linear-gradient(to bottom, transparent 0%, transparent 40%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0.95) 100%)'
                    },
                    children: [
                        // Branding Tag
                        {
                            type: 'div',
                            props: {
                                style: {
                                    backgroundColor: '#DC2626',
                                    color: 'white',
                                    padding: '8px 20px',
                                    borderRadius: '5px',
                                    fontSize: '20px',
                                    fontWeight: 'bold',
                                    marginBottom: '20px',
                                    alignSelf: 'flex-start'
                                },
                                children: 'DAILY DHANDORA'
                            }
                        },
                        // Headline Lines
                        ...lines.map(line => ({
                            type: 'div',
                            props: {
                                style: {
                                    color: 'white',
                                    fontSize: '48px',
                                    fontWeight: 'bold',
                                    fontFamily: 'Noto Sans Devanagari',
                                    textShadow: '2px 2px 4px rgba(0,0,0,0.9)',
                                    lineHeight: 1.3
                                },
                                children: line
                            }
                        }))
                    ]
                }
            },
            { width, height, fonts }
        );

        // 5. Convert SVG overlay to PNG
        const overlayPngBuffer = svgToPng(overlaySvg, width);

        // 6. Load Logo (if exists)
        let logoBuffer = null;
        if (fs.existsSync(LOGO_PATH)) {
            logoBuffer = await sharp(LOGO_PATH).resize(150).toBuffer();
        }

        // 7. Composite everything using Sharp
        const compositeOps = [
            { input: Buffer.from(overlayPngBuffer), top: 0, left: 0 }
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
        const fonts = getSatoriFonts();

        const width = 1200;
        const height = 675;
        const topRates = rates.slice(0, 6);

        // Create Mandi Card using Satori
        const svg = await satori(
            {
                type: 'div',
                props: {
                    style: {
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        background: 'linear-gradient(to bottom, #14532d, #166534)',
                        fontFamily: 'Noto Sans Devanagari'
                    },
                    children: [
                        // Header
                        {
                            type: 'div',
                            props: {
                                style: {
                                    backgroundColor: '#facc15',
                                    padding: '20px',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center'
                                },
                                children: {
                                    type: 'span',
                                    props: {
                                        style: {
                                            fontSize: '48px',
                                            fontWeight: 'bold',
                                            color: '#000'
                                        },
                                        children: `मंडी भाव अपडेट - ${date}`
                                    }
                                }
                            }
                        },
                        // Column Headers
                        {
                            type: 'div',
                            props: {
                                style: {
                                    display: 'flex',
                                    padding: '15px 100px',
                                    marginTop: '20px',
                                    backgroundColor: 'rgba(255,255,255,0.2)',
                                    marginLeft: '100px',
                                    marginRight: '100px',
                                    borderRadius: '10px'
                                },
                                children: [
                                    { type: 'span', props: { style: { flex: 1, fontSize: '32px', fontWeight: 'bold', color: 'white' }, children: 'फसल' } },
                                    { type: 'span', props: { style: { width: '200px', fontSize: '32px', fontWeight: 'bold', color: 'white', textAlign: 'center' }, children: 'न्यूनतम' } },
                                    { type: 'span', props: { style: { width: '200px', fontSize: '32px', fontWeight: 'bold', color: 'white', textAlign: 'right' }, children: 'अधिकतम' } }
                                ]
                            }
                        },
                        // Rate Rows
                        ...topRates.map((item, i) => ({
                            type: 'div',
                            props: {
                                style: {
                                    display: 'flex',
                                    padding: '15px 100px',
                                    marginLeft: '100px',
                                    marginRight: '100px',
                                    marginTop: '10px',
                                    backgroundColor: i % 2 === 0 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                                    borderRadius: '5px'
                                },
                                children: [
                                    { type: 'span', props: { style: { flex: 1, fontSize: '36px', fontWeight: 'bold', color: 'white' }, children: item.crop } },
                                    { type: 'span', props: { style: { width: '200px', fontSize: '36px', fontWeight: 'bold', color: '#fbbf24', textAlign: 'center' }, children: `₹${item.min}` } },
                                    { type: 'span', props: { style: { width: '200px', fontSize: '36px', fontWeight: 'bold', color: '#4ade80', textAlign: 'right' }, children: `₹${item.max}` } }
                                ]
                            }
                        })),
                        // Footer
                        {
                            type: 'div',
                            props: {
                                style: {
                                    marginTop: 'auto',
                                    padding: '20px',
                                    display: 'flex',
                                    justifyContent: 'center'
                                },
                                children: {
                                    type: 'span',
                                    props: {
                                        style: { fontSize: '24px', color: '#cbd5e1' },
                                        children: 'DailyDhandora.com - किसानों का साथी'
                                    }
                                }
                            }
                        }
                    ]
                }
            },
            { width, height, fonts }
        );

        // Convert SVG to PNG
        const pngBuffer = svgToPng(svg, width);

        // Composite Logo if available
        let logoBuffer = null;
        if (fs.existsSync(LOGO_PATH)) {
            logoBuffer = await sharp(LOGO_PATH).resize(120).toBuffer();
        }

        if (logoBuffer) {
            return await sharp(pngBuffer)
                .composite([{ input: logoBuffer, top: 10, left: 20 }])
                .png()
                .toBuffer();
        }

        return Buffer.from(pngBuffer);

    } catch (e) {
        console.error("❌ [Mandi Card] Error:", e);
        return null;
    }
}

/**
 * 🎓 Generates an "Education Update" card (Blue/Yellow Theme).
 * Uses Canvas API for proper Hindi/Devanagari text rendering.
 * @param {string} headline - The Hindi headline.
 * @param {string} date - Date string.
 * @returns {Promise<Buffer>} - The generated image buffer.
 */
async function generateEduCard(headline, date) {
    try {
        const { createCanvas, registerFont, loadImage } = require('canvas');

        // Ensure paths are set (including LOGO_PATH)
        await ensureFont();

        // Register Hindi font
        const fontPath = findPath(DEVANAGARI_FONT_FILENAME);
        if (fs.existsSync(fontPath)) {
            registerFont(fontPath, { family: 'NotoDevanagari' });
            console.log('  ✅ [Canvas] Hindi font registered');
        }

        const width = 1200;
        const height = 675;

        // Create canvas
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Background gradient (Blue)
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#1e3a8a');
        gradient.addColorStop(1, '#172554');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Header bar (Yellow)
        ctx.fillStyle = '#facc15';
        ctx.fillRect(0, 0, width, 70);

        // Header text
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 36px NotoDevanagari, Arial';
        ctx.textAlign = 'center';
        ctx.fillText('राजस्थान शिक्षा विभाग अपडेट', width / 2, 48);

        // Date badge (right side)
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        const dateWidth = 150;
        const dateHeight = 35;
        const dateX = width - dateWidth - 30;
        const dateY = 90;
        ctx.beginPath();
        ctx.roundRect(dateX, dateY, dateWidth, dateHeight, 15);
        ctx.fill();

        ctx.fillStyle = 'white';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(date, dateX + dateWidth / 2, dateY + 24);

        // Content box
        const boxMargin = 80;
        const boxY = 160;
        const boxHeight = 360;
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(boxMargin, boxY, width - 2 * boxMargin, boxHeight, 15);
        ctx.fill();
        ctx.stroke();

        // Headline text (CENTER - properly wrapped)
        ctx.fillStyle = 'white';
        ctx.font = 'bold 44px NotoDevanagari, Arial';
        ctx.textAlign = 'center';

        const lines = wrapText(headline, 30);
        const lineHeight = 70;
        const totalTextHeight = lines.length * lineHeight;
        const startY = boxY + (boxHeight - totalTextHeight) / 2 + 45;

        lines.forEach((line, i) => {
            ctx.fillText(line, width / 2, startY + i * lineHeight);
        });

        // Footer
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('DailyDhandora.com - Education Portal', width / 2, height - 30);

        // 🖼️ Add logo if exists (TOP LEFT on yellow header)
        console.log(`  🖼️ [Canvas] Looking for logo at: ${LOGO_PATH}`);
        if (LOGO_PATH && fs.existsSync(LOGO_PATH)) {
            try {
                const logo = await loadImage(LOGO_PATH);
                // 🖼️ DIVINE LEVEL: Logo BIGGER, NO CUTTING from top
                // y=0 ensures no top cut, size 90x90 for zoom
                ctx.drawImage(logo, 5, 0, 90, 90);
                console.log('  ✅ [Canvas] Logo added successfully!');
            } catch (logoErr) {
                console.warn('  ⚠️ [Canvas] Logo load failed:', logoErr.message);
            }
        } else {
            console.warn('  ⚠️ [Canvas] Logo file not found');
        }

        // Return PNG buffer
        return canvas.toBuffer('image/png');

    } catch (e) {
        console.error("❌ [Edu Card Canvas] Error:", e);

        // Fallback to Satori if Canvas fails
        console.log("  🔄 Falling back to Satori...");
        return await generateEduCardSatori(headline, date);
    }
}

/**
 * 🎓 FALLBACK: Satori-based Education card (if Canvas fails)
 */
async function generateEduCardSatori(headline, date) {
    try {
        await ensureFont();
        const fonts = getSatoriFonts();

        const width = 1200;
        const height = 675;
        const lines = wrapText(headline, 35);

        // Create Education Card using Satori
        const svg = await satori(
            {
                type: 'div',
                props: {
                    style: {
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        background: 'linear-gradient(to bottom, #1e3a8a, #172554)',
                        fontFamily: 'Noto Sans Devanagari'
                    },
                    children: [
                        // Header
                        {
                            type: 'div',
                            props: {
                                style: {
                                    backgroundColor: '#facc15',
                                    padding: '20px',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center'
                                },
                                children: {
                                    type: 'span',
                                    props: {
                                        style: {
                                            fontSize: '48px',
                                            fontWeight: 'bold',
                                            color: '#000'
                                        },
                                        children: 'राजस्थान शिक्षा विभाग अपडेट'
                                    }
                                }
                            }
                        },
                        // Date Badge
                        {
                            type: 'div',
                            props: {
                                style: {
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    padding: '20px 50px 0 0'
                                },
                                children: {
                                    type: 'div',
                                    props: {
                                        style: {
                                            backgroundColor: 'rgba(255,255,255,0.2)',
                                            padding: '10px 30px',
                                            borderRadius: '20px',
                                            fontSize: '20px',
                                            fontWeight: 'bold',
                                            color: 'white'
                                        },
                                        children: date
                                    }
                                }
                            }
                        },
                        // Central Content Box
                        {
                            type: 'div',
                            props: {
                                style: {
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    padding: '30px 100px'
                                },
                                children: {
                                    type: 'div',
                                    props: {
                                        style: {
                                            backgroundColor: 'rgba(255,255,255,0.1)',
                                            border: '2px solid rgba(255,255,255,0.3)',
                                            borderRadius: '15px',
                                            padding: '40px 50px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '100%'
                                        },
                                        children: lines.map(line => ({
                                            type: 'div',
                                            props: {
                                                style: {
                                                    fontSize: '52px',
                                                    fontWeight: 'bold',
                                                    color: 'white',
                                                    textAlign: 'center',
                                                    lineHeight: 1.4
                                                },
                                                children: line
                                            }
                                        }))
                                    }
                                }
                            }
                        },
                        // Footer
                        {
                            type: 'div',
                            props: {
                                style: {
                                    padding: '20px',
                                    display: 'flex',
                                    justifyContent: 'center'
                                },
                                children: {
                                    type: 'span',
                                    props: {
                                        style: { fontSize: '24px', color: '#cbd5e1' },
                                        children: 'DailyDhandora.com - Education Portal'
                                    }
                                }
                            }
                        }
                    ]
                }
            },
            { width, height, fonts }
        );

        // Convert SVG to PNG
        const pngBuffer = svgToPng(svg, width);

        // Composite Logo if available
        let logoBuffer = null;
        if (fs.existsSync(LOGO_PATH)) {
            logoBuffer = await sharp(LOGO_PATH).resize(120).toBuffer();
        }

        if (logoBuffer) {
            return await sharp(pngBuffer)
                .composite([{ input: logoBuffer, top: 10, left: 20 }])
                .png()
                .toBuffer();
        }

        return Buffer.from(pngBuffer);

    } catch (e) {
        console.error("❌ [Edu Card Satori] Error:", e);
        return null;
    }
}

module.exports = { generateNewsCard, generateMandiCard, generateEduCard };