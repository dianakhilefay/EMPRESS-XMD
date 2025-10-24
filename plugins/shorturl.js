// === shorturl.js ===
// Adapted from Noroshi bot for Malvin-Lite
const axios = require('axios');
const fakevCard = require('../lib/fakevcard');

// Helper function to interact with the ungu.in API
const unguShort = async (url, shorten) => {
    const endpoint = 'https://api.ungu.in/api/v1/links/for-guest';

    try {
        const response = await axios.post(endpoint, {
            original: url,
            shorten: shorten
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = response.data;

        if (data.message) {
            return { error: data.message };
        }
        
        // Remove IP for privacy
        if (data?.data?.ip) {
            delete data.data.ip;
        }
        
        return {
            ...data?.data,
            shorten: 'https://ungu.in/' + data?.data?.shorten
        };

    } catch (e) {
        console.error('Ungu.in API error:', e);
        return { error: 'An error occurred while contacting the shortening service.' };
    }
};

module.exports = {
    pattern: "shorturl",
    alias: ["short", "tinyurl"],
    desc: "Shorten URLs using ungu.in service",
    category: "tools",
    react: "🔗",
    filename: __filename,
    use: ".shorturl <url> [custom_alias]",
    
    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args.length) {
                return reply(
                    `🔗 **URL Shortener**\n\n` +
                    `**Usage:** \`.shorturl <url> [custom_alias]\`\n\n` +
                    `**Examples:**\n` +
                    `• \`.shorturl https://google.com\`\n` +
                    `• \`.shorturl https://google.com my-google\`\n\n` +
                    `💡 Custom alias is optional but makes links more memorable!`
                );
            }

            const [url, customAlias] = args.join(' ').split(' ');

            // Basic URL validation
            if (!/^(https?:\/\/)?([\w\d.-]+)\.([\w\d.]{2,6})([/\w\d.-]*)*\/?$/.test(url)) {
                return reply('❌ Please provide a valid URL.\n\nExample: `https://google.com`');
            }

            await conn.sendMessage(from, {
                react: { text: '⏳', key: mek.key }
            });

            await reply('🔗 Shortening your link, please wait...');

            const result = await unguShort(url, customAlias);

            if (result.error) {
                await conn.sendMessage(from, {
                    react: { text: '❌', key: mek.key }
                });
                return reply(`❌ **Error:** ${result.error}`);
            }

            const responseText = `✅ **Link Shortened Successfully!**\n\n` +
                               `🌐 **Original:** ${result.original}\n` +
                               `🔗 **Shortened:** ${result.shorten}\n\n` +
                               `📊 **Link Stats:**\n` +
                               `• Custom alias: ${customAlias || 'Auto-generated'}\n` +
                               `• Service: ungu.in\n` +
                               `• Secure: ✅ HTTPS\n\n` +
                               `💡 **Tip:** Shortened links are permanent and trackable!\n\n` +
                               `> © Shortened by ${process.env.BOT_NAME || 'Malvin Lite'}`;

            await conn.sendMessage(from, {
                text: responseText,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: "120363402507750390@newsletter",
                        newsletterName: "ᴍᴀʟᴠɪɴ ᴛᴇᴄʜ🪀",
                        serverMessageId: 200
                    },
                    externalAdReply: {
                        title: "URL Shortened",
                        body: "Click to open shortened link",
                        thumbnailUrl: "https://telegra.ph/file/1ecdb5a0aee62ef17d7fc.jpg",
                        sourceUrl: result.shorten,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: fakevCard });

            await conn.sendMessage(from, {
                react: { text: '✅', key: mek.key }
            });

        } catch (error) {
            console.error('Short URL error:', error);
            await conn.sendMessage(from, {
                react: { text: '❌', key: mek.key }
            });
            return reply(`❌ An error occurred: ${error.message}`);
        }
    }
};