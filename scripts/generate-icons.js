const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(process.cwd(), 'public');

async function createIcon(size) {
    const buffer = await sharp({
        create: {
            width: size,
            height: size,
            channels: 4,
            background: { r: 255, g: 153, b: 0, alpha: 1 } // Orange color
        }
    })
        .composite([
            {
                input: Buffer.from(`
        <svg width="${size}" height="${size}">
          <text x="50%" y="50%" font-family="Arial" font-size="${size / 2}" fill="white" text-anchor="middle" dy=".3em">DD</text>
        </svg>
      `),
                top: 0,
                left: 0,
            }
        ])
        .png()
        .toBuffer();

    fs.writeFileSync(path.join(publicDir, `icon-${size}x${size}.png`), buffer);
    console.log(`Created public/icon-${size}x${size}.png`);
}

async function main() {
    try {
        await createIcon(192);
        await createIcon(512);
        console.log("Icons generated successfully!");
    } catch (error) {
        console.error("Error generating icons:", error);
    }
}

main();
