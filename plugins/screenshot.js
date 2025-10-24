// === screenshot.js ===
// Adapted from external bot for Malvin-Lite
// Creator: xyzan code - Anomaki Team
const axios = require('axios');
const fakevCard = require('../lib/fakevcard');

async function ssweb(url) {
    const headers = {
        'accept': '*/*',
        'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'content-type': 'application/json',
        'origin': 'https://imagy.app',
        'priority': 'u=1, i',
        'referer': 'https://imagy.app/',
        'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
    };

    const body = {
        url: url,
        browserWidth: 1280,
        browserHeight: 720,
        fullPage: false,
        deviceScaleFactor: 1,
        format: 'png'
    };

    try {
        const res = await axios.post('https://gcp.imagy.app/screenshot/createscreenshot', body, { 
            headers,
            timeout: 30000 
        });
        return {
            id: res.data.id,
            fileUrl: res.data.fileUrl,
            success: true
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    pattern: "screenshot",
    desc: "Take a screenshot of any website",
    category: "tools",
    react: "📸",
    filename: __filename,
    use: ".screenshot <website_url>",
    
    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args.length) {
                return reply(
                    `📸 **Website Screenshot Tool**\n\n` +
                    `🎯 **Usage:** \`.screenshot <website_url>\`\n\n` +
                    `📝 **Examples:**\n` +
                    `• \`.screenshot https://google.com\`\n` +
                    `• \`.screenshot https://github.com\`\n` +
                    `• \`.screenshot https://youtube.com\`\n` +
                    `• \`.screenshot https://wikipedia.org\`\n\n` +
                    `📋 **Requirements:**\n` +
                    `• URL must start with http:// or https://\n` +
                    `• Website must be publicly accessible\n` +
                    `• No login or authentication required\n\n` +
                    `🔧 **Settings:**\n` +
                    `• Resolution: 1280x720\n` +
                    `• Format: PNG\n` +
                    `• Full page: No (viewport only)\n\n` +
                    `💡 **Tip:** Works best with responsive websites!`
                );
            }

            let url = args[0];
            
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                return reply('❌ Please provide a valid URL starting with http:// or https://');
            }

            // Basic URL validation
            try {
                new URL(url);
            } catch (e) {
                return reply('❌ Invalid URL format. Please provide a valid website URL.');
            }

            await conn.sendMessage(from, {
                react: { text: '⏳', key: mek.key }
            });

            await reply(`📸 **Taking Screenshot...**\n\n🌐 **Website:** ${url}\n📏 **Resolution:** 1280x720\n\nPlease wait, this may take a few seconds...`);

            const result = await ssweb(url);

            if (!result.success) {
                await conn.sendMessage(from, {
                    react: { text: '❌', key: mek.key }
                });
                return reply(`❌ **Screenshot failed**\n\n${result.error}\n\n💡 **Possible issues:**\n• Website might be down\n• URL might be incorrect\n• Website blocks screenshot tools\n• Network connectivity issue`);
            }

            // Send the screenshot
            await conn.sendMessage(from, {
                image: { url: result.fileUrl },
                caption: `📸 **Website Screenshot**\n\n` +
                        `🌐 **URL:** ${url}\n` +
                        `📏 **Resolution:** 1280x720\n` +
                        `🆔 **Screenshot ID:** ${result.id}\n` +
                        `📅 **Captured:** ${new Date().toLocaleString()}\n\n` +
                        `> © Screenshot Tool`
            }, { quoted: fakevCard });

            await conn.sendMessage(from, {
                react: { text: '✅', key: mek.key }
            });

        } catch (error) {
            console.error('Screenshot error:', error);
            await conn.sendMessage(from, {
                react: { text: '❌', key: mek.key }
            });
            
            let errorMsg = '❌ Screenshot failed: ';
            if (error.message.includes('timeout')) {
                errorMsg += 'Request timeout. Website might be slow to load.';
            } else if (error.message.includes('network')) {
                errorMsg += 'Network error. Check your connection.';
            } else if (error.message.includes('blocked')) {
                errorMsg += 'Website blocks screenshot capture.';
            } else {
                errorMsg += 'Screenshot service temporarily unavailable.';
            }
            
            return reply(errorMsg);
        }
    }
};