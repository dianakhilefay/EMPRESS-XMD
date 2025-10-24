// === iwner.js ===
// Owner contact command using built-in msg.js vCard system
const fakevCard = require('../lib/fakevcard');

module.exports = {
    pattern: "owner",
    alias: ["creator", "dev"],
    category: "main",
    desc: "Send bot owner's contact vCard",
    react: "📞",
    filename: __filename,
    use: ".owner",
    
    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            // Get owner info from environment variables or use defaults
            const ownerName = process.env.OWNER_NAME || "ᴍᴀʟᴠɪɴ ᴋɪɴɢ";
            const ownerNumber = process.env.OWNER_NUMBER || "263780958186";
            
            // React with contact emoji
            await conn.sendMessage(from, { react: { text: '📞', key: mek.key } });

            // Create vCard manually like in msg.js
            const vcard = 'BEGIN:VCARD\n' + 
                         'VERSION:3.0\n' + 
                         'FN:' + ownerName + '\n' + 
                         'ORG:🤖 Bot Owner & Developer;\n' + 
                         'TEL;type=CELL;type=VOICE;waid=' + ownerNumber + ':+' + ownerNumber + '\n' + 
                         'END:VCARD';

            // Send vCard contact
            await conn.sendMessage(from, {
                contacts: {
                    displayName: ownerName,
                    contacts: [{ vcard }]
                }
            }, { quoted: fakevCard });

            // Send additional info message with Mercedes style
            await conn.sendMessage(from, {
                text: `*┏────〘 ᴏᴡɴᴇʀ ɪɴꜰᴏ 〙───⊷*
*┃  👤 Name:* ${ownerName}
*┃  📱 Number:* +${ownerNumber}
*┃  💼 Role:* Bot Developer
*┃  🌐 Status:* Online 🟢
*┃  📧 Support:* Available 24/7
*┗──────────────⊷*

*💬 ᴄᴏɴᴛᴀᴄᴛ ᴏᴡɴᴇʀ ꜰᴏʀ:*
• Bot Support & Issues
• Feature Requests  
• Business Inquiries
• Technical Help

> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍᴀʟᴠɪɴ - ʟɪᴛᴇ`,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: "120363402507750390@newsletter",
                        newsletterName: "ᴍᴀʟᴠɪɴ ᴛᴇᴄʜ🪀",
                        serverMessageId: 200
                    },
                    externalAdReply: {
                        title: "📞 ᴏᴡɴᴇʀ ᴄᴏɴᴛᴀᴄᴛ",
                        body: `${ownerName} - ʙᴏᴛ ᴅᴇᴠᴇʟᴏᴘᴇʀ`,
                        thumbnailUrl: "https://files.catbox.moe/x7qky4.jpg",
                        sourceUrl: "https://github.com/XdKing2/MALVIN-XD",
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: fakevCard });

        } catch (error) {
            console.error('Owner command error:', error);
            await conn.sendMessage(from, {
                text: `❌ *ᴇʀʀᴏʀ*

Failed to send owner contact. Please try again later.

*Error:* ${error.message}`,
                contextInfo: fakevCard
            });
            
            await m.react("❌");
        }
    }
};
