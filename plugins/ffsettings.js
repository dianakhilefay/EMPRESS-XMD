// === ffsettings.js ===
// Adapted from Noroshi bot for Malvin-Lite
const fakevCard = require('../lib/fakevcard');

module.exports = {
    pattern: "ffsettings",
    desc: "Get Free Fire sensitivity settings for different phones",
    category: "games",
    react: "🎮",
    filename: __filename,
    use: ".ffsettings <number>",
    
    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            // Phone list database
            const phoneList = [
                "Samsung (Medium Performance)",
                "Samsung (High Performance)", 
                "iPhone (Medium Performance)",
                "iPhone (High Performance)",
                "Xiaomi (Medium Performance)",
                "Xiaomi (High Performance)",
                "Huawei (Medium Performance)",
                "Huawei (High Performance)",
                "Infinix (Medium Performance)",
                "Infinix (High Performance)",
                "Oppo (Medium Performance)",
                "Oppo (High Performance)",
                "Vivo (Medium Performance)",
                "Vivo (High Performance)",
                "Realme (Medium Performance)",
                "Realme (High Performance)",
                "Weak Phone (2GB RAM or less)",
                "Weak Phone (3GB RAM)",
                "Strong Phone (6GB RAM or more)",
                "Very Strong Phone (8GB RAM or more)"
            ];

            // Settings database
            const settingsDatabase = {
                1: "Free Fire Settings for Samsung (Medium Performance):\n• General: 85\n• Red Dot: 80\n• 2x Scope: 75\n• 4x Scope: 70\n• Sniper Scope: 65\n• Free Look: 60\n• DPI: 600\n• Fire Button Scale: 50",
                2: "Free Fire Settings for Samsung (High Performance):\n• General: 95\n• Red Dot: 90\n• 2x Scope: 85\n• 4x Scope: 80\n• Sniper Scope: 75\n• Free Look: 70\n• DPI: 700\n• Fire Button Scale: 52",
                3: "Free Fire Settings for iPhone (Medium Performance):\n• General: 88\n• Red Dot: 83\n• 2x Scope: 78\n• 4x Scope: 73\n• Sniper Scope: 68\n• Free Look: 63\n• DPI: 650\n• Fire Button Scale: 51",
                4: "Free Fire Settings for iPhone (High Performance):\n• General: 100\n• Red Dot: 95\n• 2x Scope: 90\n• 4x Scope: 85\n• Sniper Scope: 80\n• Free Look: 75\n• DPI: 750\n• Fire Button Scale: 55",
                5: "Free Fire Settings for Xiaomi (Medium Performance):\n• General: 82\n• Red Dot: 77\n• 2x Scope: 72\n• 4x Scope: 67\n• Sniper Scope: 62\n• Free Look: 58\n• DPI: 580\n• Fire Button Scale: 48",
                6: "Free Fire Settings for Xiaomi (High Performance):\n• General: 92\n• Red Dot: 87\n• 2x Scope: 82\n• 4x Scope: 77\n• Sniper Scope: 72\n• Free Look: 67\n• DPI: 680\n• Fire Button Scale: 50",
                7: "Free Fire Settings for Huawei (Medium Performance):\n• General: 84\n• Red Dot: 79\n• 2x Scope: 74\n• 4x Scope: 69\n• Sniper Scope: 64\n• Free Look: 59\n• DPI: 590\n• Fire Button Scale: 49",
                8: "Free Fire Settings for Huawei (High Performance):\n• General: 94\n• Red Dot: 89\n• 2x Scope: 84\n• 4x Scope: 79\n• Sniper Scope: 74\n• Free Look: 69\n• DPI: 690\n• Fire Button Scale: 51",
                9: "Free Fire Settings for Infinix (Medium Performance):\n• General: 80\n• Red Dot: 75\n• 2x Scope: 70\n• 4x Scope: 65\n• Sniper Scope: 60\n• Free Look: 55\n• DPI: 570\n• Fire Button Scale: 47",
                10: "Free Fire Settings for Infinix (High Performance):\n• General: 90\n• Red Dot: 85\n• 2x Scope: 80\n• 4x Scope: 75\n• Sniper Scope: 70\n• Free Look: 65\n• DPI: 660\n• Fire Button Scale: 49",
                11: "Free Fire Settings for Oppo (Medium Performance):\n• General: 83\n• Red Dot: 78\n• 2x Scope: 73\n• 4x Scope: 68\n• Sniper Scope: 63\n• Free Look: 58\n• DPI: 585\n• Fire Button Scale: 48",
                12: "Free Fire Settings for Oppo (High Performance):\n• General: 93\n• Red Dot: 88\n• 2x Scope: 83\n• 4x Scope: 78\n• Sniper Scope: 73\n• Free Look: 68\n• DPI: 685\n• Fire Button Scale: 50",
                13: "Free Fire Settings for Vivo (Medium Performance):\n• General: 81\n• Red Dot: 76\n• 2x Scope: 71\n• 4x Scope: 66\n• Sniper Scope: 61\n• Free Look: 56\n• DPI: 575\n• Fire Button Scale: 47",
                14: "Free Fire Settings for Vivo (High Performance):\n• General: 91\n• Red Dot: 86\n• 2x Scope: 81\n• 4x Scope: 76\n• Sniper Scope: 71\n• Free Look: 66\n• DPI: 670\n• Fire Button Scale: 49",
                15: "Free Fire Settings for Realme (Medium Performance):\n• General: 82\n• Red Dot: 77\n• 2x Scope: 72\n• 4x Scope: 67\n• Sniper Scope: 62\n• Free Look: 57\n• DPI: 580\n• Fire Button Scale: 48",
                16: "Free Fire Settings for Realme (High Performance):\n• General: 92\n• Red Dot: 87\n• 2x Scope: 82\n• 4x Scope: 77\n• Sniper Scope: 72\n• Free Look: 67\n• DPI: 680\n• Fire Button Scale: 50",
                17: "Free Fire Settings for Weak Phones (2GB RAM or less):\n• General: 70\n• Red Dot: 65\n• 2x Scope: 60\n• 4x Scope: 55\n• Sniper Scope: 50\n• Free Look: 45\n• DPI: 500\n• Fire Button Scale: 45",
                18: "Free Fire Settings for Weak Phones (3GB RAM):\n• General: 75\n• Red Dot: 70\n• 2x Scope: 65\n• 4x Scope: 60\n• Sniper Scope: 55\n• Free Look: 50\n• DPI: 550\n• Fire Button Scale: 46",
                19: "Free Fire Settings for Strong Phones (6GB RAM):\n• General: 95\n• Red Dot: 90\n• 2x Scope: 85\n• 4x Scope: 80\n• Sniper Scope: 75\n• Free Look: 70\n• DPI: 700\n• Fire Button Scale: 52",
                20: "Free Fire Settings for Very Strong Phones (8GB RAM or more):\n• General: 100\n• Red Dot: 95\n• 2x Scope: 90\n• 4x Scope: 85\n• Sniper Scope: 80\n• Free Look: 75\n• DPI: 750\n• Fire Button Scale: 55"
            };

            // If no number provided, show phone list
            if (!args.length) {
                let response = `🎮 **Free Fire Sensitivity Settings**\n\n`;
                response += `📱 **Choose your phone type:**\n\n`;
                
                phoneList.forEach((phone, index) => {
                    response += `**${index + 1}.** ${phone}\n`;
                });
                
                response += `\n💡 **Usage:** \`.ffsettings <number>\`\n`;
                response += `**Example:** \`.ffsettings 1\``;

                await conn.sendMessage(from, {
                    text: response,
                    contextInfo: {
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: "120363402507750390@newsletter",
                            newsletterName: "ᴍᴀʟᴠɪɴ ᴛᴇᴄʜ🪀",
                            serverMessageId: 200
                        },
                        externalAdReply: {
                            title: "Free Fire Settings",
                            body: "Choose your device for optimal settings",
                            thumbnailUrl: "https://telegra.ph/file/1ecdb5a0aee62ef17d7fc.jpg",
                            sourceUrl: "https://ff.garena.com",
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: fakevCard });

            } else {
                const phoneNumber = parseInt(args[0]);
                
                if (isNaN(phoneNumber) || phoneNumber < 1 || phoneNumber > 20) {
                    return reply(`❌ Please choose a valid number between 1 and 20!\n\n**Example:** \`.ffsettings 1\``);
                }

                const settings = settingsDatabase[phoneNumber];
                const phoneName = phoneList[phoneNumber - 1];

                await conn.sendMessage(from, {
                    react: { text: '🎮', key: mek.key }
                });

                const responseText = `🎮 **Free Fire Settings**\n\n` +
                                   `📱 **Device:** ${phoneName}\n\n` +
                                   `⚙️ **Sensitivity Settings:**\n\n${settings}\n\n` +
                                   `📝 **Instructions:**\n` +
                                   `1. Open Free Fire settings\n` +
                                   `2. Go to Sensitivity tab\n` +
                                   `3. Apply these settings\n` +
                                   `4. Practice and adjust if needed\n\n` +
                                   `> © Settings by ${process.env.BOT_NAME || 'Malvin Lite'}`;

                await conn.sendMessage(from, {
                    text: responseText,
                    contextInfo: {
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: "120363402507750390@newsletter",
                            newsletterName: "ᴍᴀʟᴠɪɴ ᴛᴇᴄʜ🪀",
                            serverMessageId: 200
                        }
                    }
                }, { quoted: fakevCard });
            }

        } catch (error) {
            console.error('FF Settings error:', error);
            await conn.sendMessage(from, {
                react: { text: '❌', key: mek.key }
            });
            return reply(`❌ An error occurred: ${error.message}`);
        }
    }
};