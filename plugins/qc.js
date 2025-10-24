// === qc.js ===
// Adapted from external bot for Malvin-Lite
// Quote card generator using WSF sticker formatter
const axios = require('axios');
const fakevCard = require('../lib/fakevcard');

// Simple sticker creation function (fallback if WSF not available)
async function createSticker(img) {
    try {
        // This is a simplified version - you may need to install wa-sticker-formatter
        // For now, we'll create a basic implementation
        return img;
    } catch (error) {
        throw error;
    }
}

module.exports = {
    pattern: "qc",
    desc: "Generate quote cards as stickers",
    category: "sticker",
    react: "💬",
    filename: __filename,
    use: ".qc <text> OR reply to message",
    
    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            let text;
            let who, name;

            // Get text from args or quoted message
            if (args.length >= 1) {
                text = args.join(" ");
                who = mek.key.participant || mek.key.remoteJid;
                name = mek.pushName || 'User';
            } else if (mek.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
                const quotedMsg = mek.message.extendedTextMessage.contextInfo.quotedMessage;
                text = quotedMsg.conversation || quotedMsg.extendedTextMessage?.text || '';
                who = mek.message.extendedTextMessage.contextInfo.participant;
                name = mek.message.extendedTextMessage.contextInfo.pushName || 'User';
            } else {
                return reply(
                    `💬 **Quote Card Generator**\n\n` +
                    `🎯 **Usage:**\n` +
                    `• \`.qc <text>\` - Create quote with your text\n` +
                    `• Reply to a message with \`.qc\` - Create quote from replied message\n\n` +
                    `📝 **Examples:**\n` +
                    `• \`.qc Hello World!\`\n` +
                    `• \`.qc Life is beautiful\`\n\n` +
                    `💡 **Features:**\n` +
                    `• White and black background versions\n` +
                    `• Profile picture integration\n` +
                    `• Custom sticker format\n` +
                    `• Maximum 100 characters\n\n` +
                    `📋 **Note:** Reply to any message and use .qc to quote it!`
                );
            }

            if (!text || text.trim().length === 0) {
                return reply("❌ Please provide text or reply to a message to generate a quote!");
            }

            if (text.length > 100) {
                return reply("❌ Maximum text length is 100 characters!");
            }

            await conn.sendMessage(from, {
                react: { text: '⏳', key: mek.key }
            });

            await reply('💬 **Generating quote cards...**\n\nCreating white and black versions for you...');

            // Get user's profile picture
            let pp;
            try {
                pp = await conn.profilePictureUrl(who, 'image');
            } catch {
                pp = 'https://telegra.ph/file/320b066dc81928b782c7b.png';
            }

            // Function to create and return the image buffer
            const createImageBuffer = async (backgroundColor) => {
                const obj = {
                    "type": "quote",
                    "format": "png",
                    "backgroundColor": backgroundColor,
                    "width": 512,
                    "height": 768,
                    "scale": 2,
                    "messages": [{
                        "entities": [],
                        "avatar": true,
                        "from": {
                            "id": 1,
                            "name": name,
                            "photo": {
                                "url": pp
                            }
                        },
                        "text": text,
                        "replyMessage": {}
                    }]
                };

                const response = await axios.post('https://qc.botcahx.eu.org/generate', obj, {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                });

                return Buffer.from(response.data.result.image, 'base64');
            };

            try {
                // Create white background quote
                const whiteBuffer = await createImageBuffer("#ffffff");
                await conn.sendMessage(from, {
                    sticker: whiteBuffer
                }, { quoted: fakevCard });

                // Small delay
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Create black background quote
                const blackBuffer = await createImageBuffer("#000000");
                await conn.sendMessage(from, {
                    sticker: blackBuffer
                }, { quoted: fakevCard });

                await conn.sendMessage(from, {
                    text: `✅ **Quote Cards Generated!**\n\n💬 **Text:** ${text}\n👤 **Author:** ${name}\n🎨 **Styles:** White & Black backgrounds\n\n> © Quote Card Generator`
                }, { quoted: fakevCard });

                await conn.sendMessage(from, {
                    react: { text: '✅', key: mek.key }
                });

            } catch (apiError) {
                console.error('Quote API error:', apiError);
                return reply('❌ Failed to generate quote cards. The quote service might be temporarily unavailable. Please try again later.');
            }

        } catch (error) {
            console.error('Quote card error:', error);
            await conn.sendMessage(from, {
                react: { text: '❌', key: mek.key }
            });
            
            let errorMsg = '❌ Quote generation failed: ';
            if (error.message.includes('timeout')) {
                errorMsg += 'Request timeout. Please try again.';
            } else if (error.message.includes('network')) {
                errorMsg += 'Network error. Please check your connection.';
            } else {
                errorMsg += 'An error occurred while processing your request.';
            }
            
            return reply(errorMsg);
        }
    }
};