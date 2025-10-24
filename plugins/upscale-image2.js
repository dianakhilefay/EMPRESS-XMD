// === upscale-image2.js ===
// Adapted from external bot for Malvin-Lite
// Image upscaling using iloveimg service
const axios = require('axios');
const cheerio = require('cheerio');
const FormData = require('form-data');
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const fakevCard = require('../lib/fakevcard');

// Get CSRF token and session token from iloveimg
async function getToken() {
    try {
        const html = await axios.get('https://www.iloveimg.com/upscale-image', {
            timeout: 30000
        });
        const $ = cheerio.load(html.data);
        const script = $('script').filter((i, el) => $(el).html().includes('ilovepdfConfig =')).html();
        const jsonS = script.split('ilovepdfConfig = ')[1].split(';')[0];
        const json = JSON.parse(jsonS);
        const csrf = $('meta[name="csrf-token"]').attr('content');
        return { token: json.token, csrf };
    } catch (err) {
        throw new Error('Failed to get authentication token: ' + err.message);
    }
}

// Upload the image to the iloveimg server
async function uploadImage(server, headers, buffer, task) {
    const form = new FormData();
    form.append('name', 'image.jpg');
    form.append('chunk', '0');
    form.append('chunks', '1');
    form.append('task', task);
    form.append('preview', '1');
    form.append('file', buffer, 'image.jpg');

    const res = await axios.post(`https://${server}.iloveimg.com/v1/upload`, form, {
        headers: {
            ...headers,
            ...form.getHeaders(),
        },
        timeout: 60000
    });

    return res.data;
}

// HDR upscale function
async function hdr(buffer, scale = 4) {
    const { token, csrf } = await getToken();
    const servers = [
        'api1g','api2g','api3g','api8g','api9g','api10g','api11g','api12g','api13g',
        'api14g','api15g','api16g','api17g','api18g','api19g','api20g','api21g',
        'api22g','api24g','api25g'
    ];
    const server = servers[Math.floor(Math.random() * servers.length)];

    // Predefined task ID required by iloveimg server
    const task = 'r68zl88mq72xq94j2d5p66bn2z9lrbx20njsbw2qsAvgmzr11lvfhAx9kl87pp6yqgx7c8vg7sfbqnrr42qb16v0gj8jl5s0kq1kgp26mdyjjspd8c5A2wk8b4Adbm6vf5tpwbqlqdr8A9tfn7vbqvy28ylphlxdl379psxpd8r70nzs3sk1';
    
    const headers = {
        'Authorization': 'Bearer ' + token,
        'Origin': 'https://www.iloveimg.com/',
        'Cookie': '_csrf=' + csrf,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    };

    // Upload the image first
    const upload = await uploadImage(server, headers, buffer, task);

    // Send upscale request
    const form = new FormData();
    form.append('task', task);
    form.append('server_filename', upload.server_filename);
    form.append('scale', scale);

    const res = await axios.post(`https://${server}.iloveimg.com/v1/upscale`, form, {
        headers: {
            ...headers,
            ...form.getHeaders(),
        },
        responseType: 'arraybuffer',
        timeout: 120000 // 2 minutes timeout
    });

    return res.data;
}

module.exports = {
    pattern: "upscale-image2",
    desc: "Upscale images using iLoveIMG service",
    category: "tools",
    react: "🔍",
    filename: __filename,
    use: ".upscale-image2 [reply to image]",
    
    execute: async (conn, mek, m, { from, reply }) => {
        try {
            // Check for quoted image
            const quotedMsg = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            
            if (!quotedMsg || !quotedMsg.imageMessage) {
                return reply(
                    `🔍 **Image Upscaler 2**\n\n` +
                    `📸 **Usage:** Reply to an image with \`.upscale-image2\`\n\n` +
                    `🎯 **Features:**\n` +
                    `• Professional image upscaling\n` +
                    `• 4x resolution increase\n` +
                    `• High-quality HDR processing\n` +
                    `• Powered by iLoveIMG\n\n` +
                    `📋 **Supported:** JPG, PNG images\n` +
                    `⚡ **Processing:** Usually takes 30-60 seconds\n\n` +
                    `💡 **Note:** This is an alternative upscaler with different processing algorithm.`
                );
            }

            const mime = quotedMsg.imageMessage.mimetype || '';
            if (!/image\/(jpe?g|png)/.test(mime)) {
                return reply('❌ Please reply to a valid image (JPG/PNG format only).');
            }

            await conn.sendMessage(from, {
                react: { text: '⏳', key: mek.key }
            });

            await reply('🔍 **Upscaling your image...**\n\nPlease wait while we process your image with professional upscaling...');

            // Download the image
            const stream = await downloadContentFromMessage(quotedMsg.imageMessage, "image");
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // Check file size (limit to ~10MB for better processing)
            if (buffer.length > 10 * 1024 * 1024) {
                return reply('❌ Image too large! Please use an image smaller than 10MB.');
            }

            // Process with HDR upscale (4x scale)
            const result = await hdr(buffer, 4);

            // Send the upscaled image
            await conn.sendMessage(from, {
                image: result,
                caption: `✅ **Image Upscaled Successfully!**\n\n` +
                        `🔍 **Process:** Professional HDR Upscaling\n` +
                        `📊 **Scale:** 4x Resolution Increase\n` +
                        `⚡ **Service:** iLoveIMG Pro\n` +
                        `🎯 **Quality:** Ultra High Definition\n\n` +
                        `💡 **Note:** Original image enhanced with advanced algorithms!\n\n` +
                        `> © Processed by ${process.env.BOT_NAME || 'Malvin Lite'}`
            }, { quoted: fakevCard });

            await conn.sendMessage(from, {
                react: { text: '✅', key: mek.key }
            });

        } catch (error) {
            console.error('Upscale-image2 error:', error);
            await conn.sendMessage(from, {
                react: { text: '❌', key: mek.key }
            });
            
            let errorMsg = '❌ Image upscaling failed: ';
            if (error.message.includes('timeout')) {
                errorMsg += 'Processing timeout. Try with a smaller image.';
            } else if (error.message.includes('token')) {
                errorMsg += 'Authentication failed. Service might be temporarily down.';
            } else if (error.message.includes('network') || error.code === 'ECONNRESET') {
                errorMsg += 'Network error. Please try again later.';
            } else if (error.response?.status === 413) {
                errorMsg += 'Image too large. Please use a smaller image.';
            } else {
                errorMsg += error.message || 'Unknown error occurred.';
            }
            
            return reply(errorMsg);
        }
    }
};