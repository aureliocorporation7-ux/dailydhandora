const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

/**
 * Uploads a buffer to Cloudinary.
 * @param {Buffer} buffer - The file buffer.
 * @param {string} folder - The folder name (default: 'daily_dhandora_audio').
 * @param {string} resource_type - 'video' (for audio) or 'image'.
 * @returns {Promise<string>} - The secure URL.
 */
async function uploadBuffer(buffer, folder = 'daily_dhandora_audio', resource_type = 'video') {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                resource_type: resource_type,
                format: 'mp3' // Force MP3 for audio
            },
            (error, result) => {
                if (error) {
                    console.error('❌ [Cloudinary] Upload Failed:', error);
                    reject(error);
                } else {
                    console.log(`✅ [Cloudinary] Uploaded: ${result.secure_url}`);
                    resolve(result.secure_url);
                }
            }
        );
        uploadStream.end(buffer);
    });
}

module.exports = { cloudinary, uploadBuffer };
