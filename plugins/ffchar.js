// === ffchar.js ===
// Adapted from external bot for Malvin-Lite
// CR Ponta Sensei
const { load } = require('cheerio');
const axios = require('axios');
const fakevCard = require('../lib/fakevcard');

module.exports = {
    pattern: "ffchar",
    desc: "Get Free Fire character information by ID",
    category: "tools",
    react: "🔥",
    filename: __filename,
    use: ".ffchar <character_id>",
    
    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args[0]) {
                return reply(
                    `🔥 **Free Fire Character Info**\n\n` +
                    `🎯 **Usage:** \`.ffchar <character_id>\`\n\n` +
                    `📝 **Examples:**\n` +
                    `• \`.ffchar 580\` - Get character with ID 580\n` +
                    `• \`.ffchar 123\` - Get character with ID 123\n\n` +
                    `🔍 **What you'll get:**\n` +
                    `• Character name and details\n` +
                    `• Special abilities\n` +
                    `• Character biography\n` +
                    `• Profile information\n` +
                    `• Character images\n\n` +
                    `💡 **Tip:** Character IDs can be found in the Free Fire game or websites!`
                );
            }

            const charId = args[0];
            
            // Validate character ID
            if (!/^\d+$/.test(charId)) {
                return reply('❌ Invalid character ID. Please provide a valid numeric ID.');
            }

            await conn.sendMessage(from, {
                react: { text: '⏳', key: mek.key }
            });

            await reply(`🔥 **Fetching Free Fire character info...**\n\nSearching for character ID: **${charId}**`);

            const url = `https://ff.garena.com/id/chars/${charId}`;
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 30000
            });
            const html = response.data;
            const $ = load(html);

            // Check if character exists
            const charName = $('.char-name').text().trim();
            if (!charName) {
                return reply(`❌ **Character not found!**\n\nNo Free Fire character found with ID: **${charId}**\n\nPlease check the ID and try again.`);
            }

            // Extract character information
            const charAbstract = $('.char-abstract').text().trim();
            const skillName = $('.skill-profile-name').text().trim();
            const skillDescription = $('.skill-introduction').text().trim();
            const biography = $('.detail p').text().trim();
            
            // Extract profile information
            const profileItems = [];
            $('.profile-item').each((i, el) => {
                const key = $(el).find('.profile-key').text().trim();
                const value = $(el).find('.profile-value').text().trim();
                if (key && value) {
                    profileItems.push(`• **${key}:** ${value}`);
                }
            });

            // Extract images
            const charImage = $('.char-pic img').attr('src');
            const backgroundMatch = $('.char-detail-bg-pic div').first().css('background-image');
            const backgroundImage = backgroundMatch?.match(/url\("(.+)"\)/)?.[1] || backgroundMatch?.match(/url\((.+)\)/)?.[1];
            const biographyImageMatch = $('.pic-img').css('background-image');
            const biographyImage = biographyImageMatch?.match(/url\("(.+)"\)/)?.[1] || biographyImageMatch?.match(/url\((.+)\)/)?.[1];

            // Extract navigation info
            const prevCharName = $('.char-prev .pre-next .prev div').text().trim();
            const prevCharLink = $('.char-prev a').attr('href');
            const nextCharName = $('.char-next .pre-next .next div').text().trim();
            const nextCharLink = $('.char-next a').attr('href');

            // Build character info message
            let charInfo = `🔥 **${charName}**\n\n`;
            
            if (charAbstract) {
                charInfo += `📋 **Description:** ${charAbstract}\n\n`;
            }
            
            if (skillName) {
                charInfo += `⚡ **Special Ability:** ${skillName}\n`;
                if (skillDescription) {
                    charInfo += `📝 **Ability Description:** ${skillDescription}\n\n`;
                }
            }
            
            if (biography) {
                charInfo += `📖 **Biography:**\n${biography}\n\n`;
            }
            
            if (profileItems.length > 0) {
                charInfo += `👤 **Character Profile:**\n${profileItems.join('\n')}\n\n`;
            }
            
            if (charImage) {
                charInfo += `🖼️ **Character Image:** ${charImage}\n`;
            }
            
            if (backgroundImage) {
                charInfo += `🎨 **Background:** ${backgroundImage}\n`;
            }
            
            if (biographyImage) {
                charInfo += `📸 **Biography Image:** ${biographyImage}\n`;
            }
            
            // Add navigation if available
            if (prevCharName || nextCharName) {
                charInfo += '\n🔄 **Navigation:**\n';
                if (prevCharName && prevCharLink) {
                    charInfo += `⬅️ **Previous:** ${prevCharName} (${prevCharLink})\n`;
                }
                if (nextCharName && nextCharLink) {
                    charInfo += `➡️ **Next:** ${nextCharName} (${nextCharLink})\n`;
                }
            }
            
            charInfo += `\n> © Character info from Free Fire | ID: ${charId}`;

            // Send character information
            await conn.sendMessage(from, {
                text: charInfo,
            }, { quoted: fakevCard });

            // If character image is available, send it as well
            if (charImage && charImage.startsWith('http')) {
                try {
                    await conn.sendMessage(from, {
                        image: { url: charImage },
                        caption: `🔥 **${charName}** - Character Image\n\n> Free Fire Character ID: ${charId}`
                    }, { quoted: fakevCard });
                } catch (imageError) {
                    console.log('Failed to send character image:', imageError.message);
                }
            }

            await conn.sendMessage(from, {
                react: { text: '✅', key: mek.key }
            });

        } catch (error) {
            console.error('FFChar error:', error);
            await conn.sendMessage(from, {
                react: { text: '❌', key: mek.key }
            });
            
            let errorMsg = '❌ Failed to get character info: ';
            if (error.response?.status === 404) {
                errorMsg += `Character with ID ${args[0]} not found.`;
            } else if (error.message.includes('timeout')) {
                errorMsg += 'Request timeout. Please try again.';
            } else if (error.message.includes('network')) {
                errorMsg += 'Network error. Please check your connection.';
            } else {
                errorMsg += error.message || 'Unknown error occurred.';
            }
            
            return reply(errorMsg);
        }
    }
};