// === veo.js ===
// Adapted from external bot for Malvin-Lite
// scrape by malik
const axios = require("axios");
const fakevCard = require('../lib/fakevcard');

// Helper function for creating delays in the polling loop
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * AiLabs Class
 * Manages all API interactions for video generation.
 */
class AiLabs {
    constructor() {
        this.api = {
            base: "https://text2video.aritek.app",
            endpoints: {
                generate: "/txt2videov3",
                video: "/video" // This is the status check endpoint
            }
        };
        this.headers = {
            "user-agent": "NB Android/1.0.0",
            "accept-encoding": "gzip",
            "content-type": "application/json",
            authorization: ""
        };
        this.state = {
            token: null
        };
        this.setup = {
            cipher: "hbMcgZLlzvghRlLbPcTbCpfcQKM0PcU0zhPcTlOFMxBZ1oLmruzlVp9remPgi0QWP0QW",
            shiftValue: 3
        };
    }

    dec(text, shift) {
        return [...text].map(c => /[a-z]/.test(c) ? String.fromCharCode((c.charCodeAt(0) - 97 - shift + 26) % 26 + 97) : /[A-Z]/.test(c) ? String.fromCharCode((c.charCodeAt(0) - 65 - shift + 26) % 26 + 65) : c).join("");
    }

    async decrypt() {
        if (this.state.token) return this.state.token;
        const input = this.setup.cipher;
        const shift = this.setup.shiftValue;
        const decrypted = this.dec(input, shift);
        this.state.token = decrypted;
        this.headers.authorization = decrypted;
        return decrypted;
    }

    deviceId() {
        return Array.from({
            length: 16
        }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    }

    async txt2vid({
        prompt,
        isPremium = 1
    }) {
        try {
            if (!prompt?.trim()) return {
                success: false,
                error: "Prompt cannot be empty"
            };
            if (!/^[a-zA-Z0-9\s.,!?'-]+$/.test(prompt)) return {
                success: false,
                error: "Prompt contains invalid characters"
            };
            await this.decrypt();
            const payload = {
                deviceID: this.deviceId(),
                isPremium: isPremium,
                prompt: prompt,
                used: [],
                versionCode: 59
            };
            const url = this.api.base + this.api.endpoints.generate;
            const response = await axios.post(url, payload, {
                headers: this.headers,
                timeout: 30000
            });
            const {
                code,
                key
            } = response.data;
            if (code !== 0 || !key) return {
                success: false,
                error: "Failed to get video generation key"
            };
            return {
                success: true,
                data: {
                    task_id: key
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message || "An unknown error occurred"
            };
        }
    }

    async status({
        task_id
    }) {
        try {
            if (!task_id) return {
                success: false,
                error: "Invalid task_id provided"
            };
            await this.decrypt();
            const payload = {
                keys: [task_id]
            };
            const url = this.api.base + this.api.endpoints.video;
            const response = await axios.post(url, payload, {
                headers: this.headers,
                timeout: 20000
            });
            const {
                code,
                datas
            } = response.data;
            if (code === 0 && Array.isArray(datas) && datas.length > 0) {
                const data = datas[0];
                if (data.url && data.url.trim() !== "") {
                    return {
                        success: true,
                        data: {
                            status: "completed",
                            url: data.url.trim(),
                            progress: "100%"
                        }
                    };
                }
                const progress = parseFloat(data.progress || 0);
                return {
                    success: true,
                    data: {
                        status: "processing",
                        progress: `${Math.round(progress)}%`
                    }
                };
            }
            return {
                success: false,
                error: "Invalid response from server"
            };
        } catch (error) {
            return {
                success: false,
                error: error.message || "Status check failed"
            };
        }
    }
}

module.exports = {
    pattern: "veo",
    desc: "Generate AI videos from text prompts",
    category: "ai",
    react: "🎬",
    filename: __filename,
    use: ".veo <description>",
    
    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args.length) {
                return reply(
                    `🎬 **VEO AI Video Generator**\n\n` +
                    `🎯 **Usage:** \`.veo <description>\`\n\n` +
                    `📝 **Examples:**\n` +
                    `• \`.veo a futuristic city at sunset\`\n` +
                    `• \`.veo a cat playing in the garden\`\n` +
                    `• \`.veo waves crashing on the beach\`\n` +
                    `• \`.veo a robot dancing in space\`\n\n` +
                    `⏱️ **Processing:** Usually takes 3-8 minutes\n` +
                    `🎥 **Output:** High-quality AI-generated video\n\n` +
                    `💡 **Tip:** Be descriptive for better results!`
                );
            }

            const prompt = args.join(' ');

            await conn.sendMessage(from, {
                react: { text: '⏳', key: mek.key }
            });

            const ai = new AiLabs();

            await reply("🎬 **Starting video generation...**\n\nThis process can take several minutes. Please be patient while AI creates your video.");

            const initialTask = await ai.txt2vid({ prompt });

            if (!initialTask.success) {
                return reply(`❌ **Failed to start video generation**\n\n**Reason:** ${initialTask.error}`);
            }

            const taskId = initialTask.data.task_id;
            let lastProgress = "";
            let progressMessage = null;

            // Poll for the result up to 60 times (approx 10 minutes)
            for (let i = 0; i < 60; i++) {
                await delay(10000); // Wait 10 seconds between checks
                const statusResult = await ai.status({ task_id: taskId });

                if (!statusResult.success) {
                    // Stop polling if a non-recoverable error occurs
                    return reply(`⚠️ **Error checking status:** ${statusResult.error}\n\nAborting video generation.`);
                }

                if (statusResult.data.status === 'completed') {
                    await reply("✅ **Video generation complete!**\n\nSending your AI-generated video...");
                    
                    await conn.sendMessage(from, {
                        video: { url: statusResult.data.url },
                        caption: `🎬 **AI Video Generated Successfully!**\n\n` +
                                `📝 **Prompt:** ${prompt}\n` +
                                `🤖 **Generator:** VEO AI\n` +
                                `🎥 **Quality:** HD Video\n\n` +
                                `> © Generated by ${process.env.BOT_NAME || 'Malvin Lite'}`
                    }, { quoted: fakevCard });

                    await conn.sendMessage(from, {
                        react: { text: '✅', key: mek.key }
                    });
                    
                    return;
                }

                // Send progress updates only when the percentage changes
                if (statusResult.data.progress !== lastProgress) {
                    lastProgress = statusResult.data.progress;
                    const progressText = `⏳ **Processing video...** ${lastProgress}\n\n🎬 Creating: "${prompt}"\n\n⏱️ This may take a few more minutes...`;
                    
                    if (!progressMessage) {
                        progressMessage = await reply(progressText);
                    }
                    // Note: In a real implementation, you might want to edit the message instead
                }
            }

            await reply("⏰ **Video generation timed out**\n\nThe server may still be processing your request, but the bot will no longer check for updates. This can happen with complex prompts.");

            await conn.sendMessage(from, {
                react: { text: '⏰', key: mek.key }
            });

        } catch (error) {
            console.error('VEO video generation error:', error);
            await conn.sendMessage(from, {
                react: { text: '❌', key: mek.key }
            });
            
            let errorMsg = '❌ Video generation failed: ';
            if (error.message.includes('timeout')) {
                errorMsg += 'Request timeout. The prompt might be too complex.';
            } else if (error.message.includes('network')) {
                errorMsg += 'Network error. Please try again later.';
            } else {
                errorMsg += error.message || 'Unknown error occurred.';
            }
            
            return reply(errorMsg);
        }
    }
};