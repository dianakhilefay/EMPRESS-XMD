const FormData = require('form-data');
const axios = require('axios');
const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * Upload image buffer to Catbox.moe
 * @param {Buffer} buffer - Image buffer to upload
 * @returns {Promise<string>} - Returns the uploaded image URL
 */
async function uploadImage(buffer) {
    try {
        if (!buffer || buffer.length === 0) {
            throw new Error('Invalid buffer provided');
        }

        // Create temporary file
        const tempFilePath = path.join(
            os.tmpdir(),
            `upload_${Date.now()}.jpg`
        );
        
        fs.writeFileSync(tempFilePath, buffer);

        // Create form data for upload
        const form = new FormData();
        form.append("fileToUpload", fs.createReadStream(tempFilePath));
        form.append("reqtype", "fileupload");

        // Upload to Catbox
        const uploadResponse = await axios.post(
            "https://catbox.moe/user/api.php",
            form,
            {
                headers: form.getHeaders(),
                timeout: 30000,
            }
        );

        // Cleanup temp file
        try {
            fs.unlinkSync(tempFilePath);
        } catch (cleanupError) {
            console.warn('Failed to cleanup temp file:', cleanupError.message);
        }

        if (!uploadResponse.data) {
            throw new Error("No response data from Catbox");
        }

        const uploadedUrl = uploadResponse.data.trim();
        
        if (!uploadedUrl.startsWith('http')) {
            throw new Error(`Invalid URL response: ${uploadedUrl}`);
        }

        return uploadedUrl;

    } catch (error) {
        console.error('Upload error:', error);
        throw new Error(`Failed to upload image: ${error.message}`);
    }
}

module.exports = uploadImage;