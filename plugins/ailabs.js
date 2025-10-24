// === ailabs.js ===
// Adapted from external bot for Malvin-Lite
// AI Image & Video Generator (Ailabs)
const axios = require('axios');
const FormData = require('form-data');
const fakevCard = require('../lib/fakevcard');

const aiLabs = {
    api: {
        base: 'https://text2video.aritek.app',
        endpoints: {
            text2img: '/text2img',
            generate: '/txt2videov3',
            video: '/video'
        }
    },
    headers: {
        'user-agent': 'NB Android/1.0.0',
        'accept-encoding': 'gzip',
        'content-type': 'application/json',
        authorization: ''
    },
    state: {
        token: null
    },
    setup: {
        cipher: 'hbMcgZLlzvghRlLbPcTbCpfcQKM0PcU0zhPcTlOFMxBZ1oLmruzlVp9remPgi0QWP0QW',
        shiftValue: 3,
        dec(text, shift) {
            return [...text].map(c =>
                /[a-z]/.test(c)
                    ? String.fromCharCode((c.charCodeAt(0) - 97 - shift + 26) % 26 + 97)
                    : /[A-Z]/.test(c)
                        ? String.fromCharCode((c.charCodeAt(0) - 65 - shift + 26) % 26 + 65)
                        : c
            ).join('');
        },
        async decrypt() {
            if (aiLabs.state.token) return aiLabs.state.token;
            const decrypted = aiLabs.setup.dec(aiLabs.setup.cipher, aiLabs.setup.shiftValue);
            aiLabs.state.token = decrypted;
            aiLabs.headers.authorization = decrypted;
            return decrypted;
        }
    },
    deviceId() {
        return Array.from({ length: 16 }, () =>
            Math.floor(Math.random() * 16).toString(16)
        ).join('');
    },
    async text2img(prompt) {
        if (!prompt?.trim()) {
            return { success: false, code: 400, result: { error: 'Prompt cannot be empty.' } };
        }
        const token = await aiLabs.setup.decrypt();
        const form = new FormData();
        form.append('prompt', prompt);
        form.append('token', token);

        try {
            const url = aiLabs.api.base + aiLabs.api.endpoints.text2img;
            const res = await axios.post(url, form, {
                headers: { ...aiLabs.headers, ...form.getHeaders() },
                timeout: 60000
            });
            const { code, url: imageUrl } = res.data;

            if (code !== 0 || !imageUrl) {
                return { success: false, code: res.status, result: { error: 'Image generation failed.' } };
            }
            return { success: true, code: res.status, result: { url: imageUrl.trim(), prompt } };
        } catch (err) {
            return { success: false, code: err.response?.status || 500, result: { error: err.message } };
        }
    },
    async generate({ prompt = '', type = 'image', isPremium = 1 } = {}) {
        if (!prompt?.trim() || !/^[a-zA-Z0-9\s.,!?'"-]+$/.test(prompt)) {
            return { success: false, code: 400, result: { error: 'Invalid or empty prompt.' } };
        }
        if (!/^(image|video)$/.test(type)) {
            return { success: false, code: 400, result: { error: 'Invalid type. Use "image" or "video".' } };
        }

        if (type === 'image') {
            return await aiLabs.text2img(prompt);
        } else {
            await aiLabs.setup.decrypt();
            const payload = {
                deviceID: aiLabs.deviceId(),
                isPremium,
                prompt,
                used: [],
                versionCode: 59
            };
            try {
                const url = aiLabs.api.base + aiLabs.api.endpoints.generate;
                const res = await axios.post(url, payload, { 
                    headers: aiLabs.headers,
                    timeout: 30000 
                });
                const { code, key } = res.data;

                if (code !== 0 || !key) {
                    return { success: false, code: res.status, result: { error: 'Failed to get video key.' } };
                }
                return await aiLabs.video(key);
            } catch (err) {
                return { success: false, code: err.response?.status || 500, result: { error: err.message } };
            }
        }
    },
    async video(key) {
        if (!key) {
            return { success: false, code: 400, result: { error: 'Invalid video key.' } };
        }
        await aiLabs.setup.decrypt();
        const payload = { keys: [key] };
        const url = aiLabs.api.base + aiLabs.api.endpoints.video;
        const maxAttempts = 100;
        const delay = 2000;
        let attempt = 0;

        while (attempt < maxAttempts) {
            attempt++;
            try {
                const res = await axios.post(url, payload, {
                    headers: aiLabs.headers,
                    timeout: 15000
                });
                const { code, datas } = res.data;

                if (code === 0 && Array.isArray(datas) && datas.length > 0) {
                    const data = datas[0];
                    if (!data.url) {
                        await new Promise(r => setTimeout(r, delay));
                        continue;
                    }
                    return { success: true, code: res.status, result: { url: data.url.trim(), key: data.key, progress: '100%' } };
                }
            } catch (err) {
                const retry = ['ECONNRESET', 'ECONNABORTED', 'ETIMEDOUT'].includes(err.code);
                if (retry && attempt < maxAttempts) {
                    await new Promise(r => setTimeout(r, delay));
                    continue;
                }
                return { success: false, code: err.response?.status || 500, result: { error: err.message } };
            }
        }
        return { success: false, code: 504, result: { error: 'Video processing timed out.', attempt } };
    }
};

module.exports = {
    pattern: "ailabs",
    desc: "Generate AI images and videos with advanced AI",
    category: "ai",
    react: "🤖",
    filename: __filename,
    use: ".ailabs <prompt> --image|--video",
    
    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args.length) {
                return reply(
                    `🤖 **AiLabs Generator**\n\n` +
                    `🎯 **Usage:**\n` +
                    `• \`.ailabs <prompt> --image\` - Generate image\n` +
                    `• \`.ailabs <prompt> --video\` - Generate video\n\n` +
                    `📝 **Examples:**\n` +
                    `• \`.ailabs a girl in the forest --image\`\n` +
                    `• \`.ailabs a cat jumping --video\`\n` +
                    `• \`.ailabs futuristic city --image\`\n` +
                    `• \`.ailabs ocean waves --video\`\n\n` +
                    `⚡ **Features:**\n` +
                    `• High-quality AI generation\n` +
                    `• Fast image processing\n` +
                    `• Advanced video creation\n\n` +
                    `⏱️ **Processing Time:**\n` +
                    `• Images: 10-30 seconds\n` +
                    `• Videos: 2-5 minutes`
                );
            }

            let type = 'image';
            if (args.includes('--image')) type = 'image';
            if (args.includes('--video')) type = 'video';
            
            let prompt = args.filter(a => a !== '--image' && a !== '--video').join(' ').trim();
            if (!prompt) {
                return reply('❌ Prompt cannot be empty. Please provide a description for generation.');
            }

            await conn.sendMessage(from, {
                react: { text: '⏳', key: mek.key }
            });

            if (type === 'image') {
                await reply('🎨 **Generating AI image...**\n\nPlease wait while AI creates your image...');
            } else {
                await reply('🎬 **Generating AI video...**\n\nThis may take a few minutes. Please be patient...');
            }

            let result = await aiLabs.generate({ prompt, type });

            if (!result.success) {
                return reply(`❌ **Generation Failed**\n\n**Error:** ${result.result.error}`);
            }

            if (type === 'image') {
                await conn.sendMessage(from, {
                    image: { url: result.result.url },
                    caption: `✅ **AI Image Generated!**\n\n` +
                            `📝 **Prompt:** ${result.result.prompt}\n` +
                            `🤖 **Generator:** AiLabs AI\n` +
                            `🎨 **Type:** High-Quality Image\n\n` +
                            `> © Generated by ${process.env.BOT_NAME || 'Malvin Lite'}`
                }, { quoted: fakevCard });
            } else {
                await conn.sendMessage(from, {
                    video: { url: result.result.url },
                    caption: `✅ **AI Video Generated!**\n\n` +
                            `📝 **Prompt:** ${prompt}\n` +
                            `🤖 **Generator:** AiLabs AI\n` +
                            `🎥 **Type:** HD Video\n\n` +
                            `> © Generated by ${process.env.BOT_NAME || 'Malvin Lite'}`
                }, { quoted: fakevCard });
            }

            await conn.sendMessage(from, {
                react: { text: '✅', key: mek.key }
            });

        } catch (error) {
            console.error('AiLabs error:', error);
            await conn.sendMessage(from, {
                react: { text: '❌', key: mek.key }
            });
            
            let errorMsg = '❌ AI generation failed: ';
            if (error.message.includes('timeout')) {
                errorMsg += 'Request timeout. Try with a simpler prompt.';
            } else if (error.message.includes('network')) {
                errorMsg += 'Network error. Please try again later.';
            } else {
                errorMsg += error.message || 'Unknown error occurred.';
            }
            
            return reply(errorMsg);
        }
    }
};