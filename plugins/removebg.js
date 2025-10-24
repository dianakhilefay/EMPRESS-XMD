// === removebg.js ===
// Adapted from external bot for Malvin-Lite
// scrape by malik
const axios = require("axios");
const FormData = require("form-data");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const fakevCard = require('../lib/fakevcard');

class RemoveBg {
    constructor() {
        this.API_URL = "https://backrem.pi7.org/remove_bg";
        this.HEADERS = {
            Connection: "keep-alive",
            "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36",
            Accept: "*/*",
            Origin: "https://image.pi7.org",
            Referer: "https://image.pi7.org/"
        };
    }

    _randName() {
        return `id_${Date.now()}${(Math.random() + 1).toString(36).substring(7)}`;
    }

    async run({ buffer, contentType }) {
        try {
            const fileSizeMB = buffer.length / (1024 * 1024);
            if (fileSizeMB > 5) {
                throw new Error(`File size ${fileSizeMB.toFixed(2)}MB exceeds 5MB limit.`);
            }

            const extension = contentType.split("/")[1] || "jpg";
            const form = new FormData();
            const fileName = `${this._randName()}.${extension}`;

            form.append("myFile[]", buffer, {
                filename: fileName,
                contentType: contentType
            });

            const result = await axios.post(this.API_URL, form, {
                headers: {
                    ...form.getHeaders(),
                    ...this.HEADERS
                },
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
                timeout: 60000
            });

            if (result.data?.images?.length > 0) {
                return `https://backrem.pi7.org/${result.data.images[0].filename}`;
            } else {
                throw new Error("Failed to process image, invalid API response.");
            }
        } catch (error) {
            throw error;
        }
    }
}

module.exports = {
    pattern: "removebg",
    desc: "Remove background from images using AI",
    category: "tools",
    react: "🖼️",
    filename: __filename,
    use: ".removebg [reply to image]",
    
    execute: async (conn, mek, m, { from, reply }) => {
        try {
            // Check for quoted image
            const quotedMsg = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            
            if (!quotedMsg || !quotedMsg.imageMessage) {
                return reply(
                    `🖼️ **Background Remover**\n\n` +
                    `📸 **Usage:** Reply to an image with \`.removebg\`\n\n` +
                    `🎯 **Features:**\n` +
                    `• AI-powered background removal\n` +
                    `• High-quality results\n` +
                    `• Transparent PNG output\n` +
                    `• Fast processing\n\n` +
                    `📋 **Supported:** JPG, PNG images (max 5MB)\n` +
                    `⚡ **Processing:** Usually takes 5-15 seconds`
                );
            }

            const mime = quotedMsg.imageMessage.mimetype || '';
            if (!/image\/(jpe?g|png)/.test(mime)) {
                return reply('❌ Please reply to a valid image (JPG/PNG format only).');
            }

            await conn.sendMessage(from, {
                react: { text: '⏳', key: mek.key }
            });

            await reply('🖼️ **Removing background...**\n\nPlease wait while AI processes your image...');

            // Download the image
            const stream = await downloadContentFromMessage(quotedMsg.imageMessage, "image");
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // Process with RemoveBg
            const remover = new RemoveBg();
            const result = await remover.run({ 
                buffer: buffer, 
                contentType: mime 
            });

            // Send the result
            await conn.sendMessage(from, {
                image: { url: result },
                caption: `✅ **Background Removed Successfully!**\n\n` +
                        `🎯 **Process:** AI Background Removal\n` +
                        `📊 **Output:** Transparent PNG\n` +
                        `⚡ **Quality:** High Resolution\n\n` +
                        `💡 **Tip:** The image now has a transparent background!\n\n` +
                        `> © Processed by ${process.env.BOT_NAME || 'Malvin Lite'}`
            }, { quoted: fakevCard });

            await conn.sendMessage(from, {
                react: { text: '✅', key: mek.key }
            });

        } catch (error) {
            console.error('RemoveBG error:', error);
            await conn.sendMessage(from, {
                react: { text: '❌', key: mek.key }
            });
            
            let errorMsg = '❌ Background removal failed: ';
            if (error.message.includes('5MB')) {
                errorMsg += 'Image too large. Please use an image smaller than 5MB.';
            } else if (error.message.includes('timeout')) {
                errorMsg += 'Processing timeout. Try again with a smaller image.';
            } else if (error.message.includes('network') || error.code === 'ECONNRESET') {
                errorMsg += 'Network error. Please try again later.';
            } else {
                errorMsg += error.message || 'Please try again later.';
            }
            
            return reply(errorMsg);
        }
    }
};