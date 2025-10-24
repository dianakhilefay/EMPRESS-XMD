// Environment variables with fallback values
const BOT_NAME = process.env.BOT_NAME || "ᴍᴀʟᴠɪɴ - ʟɪᴛᴇ";
const OWNER_NAME = process.env.OWNER_NAME || "ᴍᴀʟᴠɪɴ ᴋɪɴɢ";
const REPO_LINK = process.env.REPO_LINK || "https://github.com/XdKing2/MALVIN-XD";
const MENU_IMAGE_URL = process.env.MENU_IMAGE_URL || "https://files.catbox.moe/x7qky4.jpg";
const fakevCard = require('../lib/fakevcard');

module.exports = {
    pattern: 'menu',
    alias: ['help', 'm'],
    category: 'utility',
    desc: 'Show bot menu with all commands',
    react: '📋',
    filename: __filename,
    use: '.menu',
    
    execute: async (conn, mek, m, { from, args, reply, userPrefix, sessionId }) => {
        try {
            // Get variables from global scope
            const activeSockets = global.activeSockets || new Map();
            const commands = global.commands || new Map();
            
            const menu = generateMenu(userPrefix, sessionId, activeSockets, commands);
            
            // Send menu with newsletter forwarding
            await conn.sendMessage(from, {
                text: menu,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: "120363402507750390@newsletter",
                        newsletterName: "ᴍᴀʟᴠɪɴ ᴛᴇᴄʜ🪀",
                        serverMessageId: 200
                    },
                    externalAdReply: {
                        title: "🔮 ᴄᴍᴅ ᴍᴇɴᴜ",
                        body: `${BOT_NAME} - ᴀʟʟ ᴄᴍᴅs`,
                        thumbnailUrl: MENU_IMAGE_URL,
                        sourceUrl: REPO_LINK,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: fakevCard });
            
        } catch (error) {
            console.error('Menu command error:', error);
            return reply('❌ An error occurred while generating the menu. Please try again later.');
        }
    }
};

// Generate menu function
function generateMenu(userPrefix, sessionId, activeSockets, commands) {
    // Calculate uptime
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const uptimeStr = `${hours} hour, ${minutes} minutes`;

    // Get active sessions count
    const activeSessions = activeSockets ? activeSockets.size : 1;

    // Count total commands (more accurate count)
    let totalCommands = 0;
    for (const [pattern, command] of commands.entries()) {
        totalCommands++;
    }
    // Use the actual loaded commands count instead of adding arbitrary number

    const menuText = `*┏────〘 ${BOT_NAME} 〙───⊷*
*┃  Owner:* ${OWNER_NAME}
*┃  Prefix:* ${userPrefix}
*┃  Version:* 1.0.0 Beta
*┃  Platform:* Node.js
*┃  Total Commands:* ${totalCommands}
*┃  Runtime:* ${uptimeStr}
*┗──────────────⊷*

*┏────〘 𝑪𝒐𝒓𝒆 𝑪𝒐𝒎𝒎𝒂𝒏𝒅𝒔 〙───⊷*
*┃ 1.  ᴘɪɴɢ*
*┃ 2.  ᴍᴇɴᴜ*
*┃ 3.  ʀᴜɴᴛɪᴍᴇ*
*┃ 4.  ᴘʀᴇꜰɪx*
*┗──────────────⊷*

*┏────〘 𝑨𝑰 𝑪𝒐𝒎𝒎𝒂𝒏𝒅𝒔 〙───⊷*
*┃ 1.  ꜰʟᴜxᴀɪ*
*┃ 2.  ɢᴘᴛ4*
*┃ 3.  ʟᴜᴍɪɴᴀɪ*
*┃ 4.  ᴍᴇᴛᴀᴀɪ*
*┃ 5.  ᴀɪᴄʟᴀᴜᴅᴇ*
*┃ 6.  sᴜɴᴏ*
*┃ 7.  ᴀɪᴍᴜsɪᴄ*
*┃ 8.  ᴄʜᴀᴛɢᴘᴛ*
*┃ 9.  ᴀɪʟᴀʙs*
*┃ 10. ᴀʀᴛʟʏ*
*┃ 11. ᴠᴇᴏ*
*┃ 12. ᴛᴏꜰɪɢᴜʀᴇ*
*┃ 13. ᴀɪᴄʜᴀᴛ*
*┗──────────────⊷*

*┏────〘 𝑫𝒐𝒘𝒏𝒍𝒐𝒂𝒅𝒆𝒓 𝑴𝒆𝒏𝒖 〙───⊷*
*┃ 1.  ᴘʟᴀʏ*
*┃ 2.  ʏᴏᴜᴛᴜʙᴇ*
*┃ 3.  ɪɴsᴛᴀɢʀᴀᴍ*
*┃ 4.  ꜰᴀᴄᴇʙᴏᴏᴋ*
*┃ 5.  ᴛɪᴋᴛᴏᴋ*
*┃ 6.  ᴛᴡɪᴛᴛᴇʀ*
*┃ 7.  ᴘɪɴᴛᴇʀᴇsᴛ*
*┃ 8.  ᴀᴘᴋ*
*┃ 9.  ᴍᴏᴅᴀᴘᴋ*
*┗──────────────⊷*

*┏────〘 𝑮𝒓𝒐𝒖𝒑 𝑴𝒆𝒏𝒖 〙───⊷*
*┃ 1.  ᴛᴀɢᴀʟʟ*
*┃ 2.  ᴋɪᴄᴋ*
*┃ 3.  ᴘʀᴏᴍᴏᴛᴇ*
*┃ 4.  ᴅᴇᴍᴏᴛᴇ*
*┃ 5.  ʜɪᴅᴇᴛᴀɢ*
*┃ 6.  ɪɴᴠɪᴛᴇ*
*┃ 7.  ᴊᴏɪɴ*
*┃ 8.  ʟɪsᴛᴏɴʟɪɴᴇ*
*┃ 9.  ᴛᴀɢᴀᴅᴍɪɴs*
*┃ 10. ᴄʀᴇᴀᴛᴇɢʀᴏᴜᴘ*
*┃ 11. ᴍᴜᴛᴇ*
*┃ 12. ᴏᴘᴇɴ*
*┗──────────────⊷*

*┏────〘 𝑭𝒖𝒏 𝑴𝒆𝒏𝒖 〙───⊷*
*┃ 1.  ʙʀᴀᴛᴠɪᴅ*
*┃ 2.  ʙʀᴀᴛ2*
*┃ 3.  ᴊᴏᴋᴇ*
*┃ 4.  ꜰʟɪʀᴛ*
*┃ 5.  ᴛʀᴜᴛʜ*
*┃ 6.  ᴅᴀʀᴇ*
*┃ 7.  ꜰᴀᴄᴛ*
*┃ 8.  ᴘɪᴄᴋᴜᴘʟɪɴᴇ*
*┃ 9.  ᴄʜᴀʀᴀᴄᴛᴇʀ*
*┃ 10. ʀᴇᴘᴇᴀᴛ*
*┃ 11. ꜰꜰᴄʜᴀʀ*
*┃ 12. ꜰꜰsᴇᴛᴛɪɴɢs*
*┗──────────────⊷*

*┏────〘 𝑺𝒕𝒊𝒄𝒌𝒆𝒓 𝑴𝒆𝒏𝒖 〙───⊷*
*┃ 1.  sᴛɪᴄᴋᴇʀ*
*┃ 2.  ǫᴄ*
*┃ 3.  ᴠᴠ*
*┗──────────────⊷*

*┏────〘 𝑳𝒐𝒈𝒐 𝑴𝒂𝒌𝒆𝒓 〙───⊷*
*┃ 1.  3ᴅᴄᴏᴍɪᴄ*
*┃ 2.  3ᴅᴘᴀᴘᴇʀ*
*┃ 3.  ᴀᴍᴇʀɪᴄᴀ*
*┃ 4.  ᴀɴɢᴇʟᴡɪɴɢs*
*┃ 5.  ʙᴇᴀʀ*
*┃ 6.  ʙɪʀᴛʜᴅᴀʏ*
*┃ 7.  ʙʟᴀᴄᴋᴘɪɴᴋ*
*┃ 8.  ʙᴏᴏᴍ*
*┃ 9.  ʙᴜʟʙ*
*┃ 10. ᴄᴀsᴛʟᴇ*
*┃ 11. ᴄᴀᴛ*
*┃ 12. ᴄʟᴏᴜᴅs*
*┃ 13. ᴅᴇᴀᴅᴘᴏᴏʟ*
*┃ 14. ᴅᴇᴠɪʟᴡɪɴɢs*
*┃ 15. ᴅʀᴀɢᴏɴʙᴀʟʟ*
*┃ 16. ᴇʀᴀsᴇʀ*
*┃ 17. ꜰʀᴏᴢᴇɴ*
*┃ 18. ꜰᴜᴛᴜʀɪsᴛɪᴄ*
*┃ 19. ɢʟᴏssʏsɪʟᴠᴇʀ*
*┃ 20. ʜᴀᴄᴋᴇʀ*
*┃ 21. ʟᴇᴀꜰ*
*┃ 22. ʟᴜxᴜʀʏ*
*┃ 23. ɴᴇᴏɴʟɪɢʜᴛ*
*┃ 24. ɴɪɢᴇʀɪᴀ*
*┃ 25. ᴘᴀɪɴᴛ*
*┃ 26. ᴘᴏʀɴʜᴜʙ*
*┃ 27. sᴀᴅɢɪʀʟ*
*┃ 28. sᴀɴs*
*┃ 29. sᴜɴsᴇᴛ*
*┃ 30. ᴛᴀᴛᴏᴏ*
*┃ 31. ᴛᴇxᴛᴍᴀᴋᴇʀ*
*┃ 32. ᴛʜᴏʀ*
*┃ 33. ᴢᴏᴅɪᴀᴄ*
*┃ 34. ʏᴛʟᴏɢᴏ*
*┗──────────────⊷*

*┏────〘 𝑺𝒕𝒂𝒍𝒌𝒊𝒏𝒈 𝑴𝒆𝒏𝒖 〙───⊷*
*┃ 1.  ᴡᴀsᴛᴀʟᴋ*
*┃ 2.  xsᴛᴀʟᴋ*
*┃ 3.  ᴛɪᴋᴛᴏᴋsᴛᴀʟᴋ*
*┗──────────────⊷*

*┏────〘 𝑻𝒐𝒐𝒍𝒔 𝑴𝒆𝒏𝒖 〙───⊷*
*┃ 1.  ᴛʀᴀɴsʟᴀᴛᴇ*
*┃ 2.  sᴄʀᴇᴇɴsʜᴏᴛ*
*┃ 3.  ɢᴍᴀɪʟᴘʀᴏꜰɪʟᴇ*
*┃ 4.  ᴜᴘsᴄᴀʟᴇ-ɪᴍᴀɢᴇ2*
*┃ 5.  ʀᴇᴍᴏᴠᴇʙɢ*
*┃ 6.  sʜᴏʀᴛᴜʀʟ*
*┃ 7.  ᴛᴇʟᴇɢʀᴀᴍ-sᴇᴀʀᴄʜ*
*┃ 8.  ᴍᴏᴅᴅᴇᴛᴀɪʟ*
*┃ 9.  ᴍᴀᴘs*
*┃ 10. ᴜʀʟ3*
*┃ 11. ᴘᴘᴄᴏᴜᴘʟᴇ*
*┗──────────────⊷*

*┏────〘 𝑨𝒖𝒅𝒊𝒐/𝑽𝒊𝒅𝒆𝒐 〙───⊷*
*┃ 1.  ᴛᴏᴀᴜᴅɪᴏ*
*┃ 2.  ᴛᴏᴠɴ*
*┃ 3.  ᴄʜᴍᴘ3*
*┃ 4.  ʟʏʀɪᴄ*
*┗──────────────⊷*

*┏────〘 𝑰𝒎𝒂𝒈𝒆 𝑻𝒐𝒐𝒍𝒔 〙───⊷*
*┃ 1.  4ᴋᴡᴀʟʟᴘᴀᴘᴇʀ*
*┃ 2.  ꜰᴀᴋᴇᴄᴀʟʟ*
*┃ 3.  ꜰᴀᴋᴇᴡᴀ*
*┃ 4.  sᴀᴠᴇ*
*┗──────────────⊷*

*┏────〘 𝑶᭙ꪀꫀ𝘳 𝑴ꫀꪀꪊ 〙───⊷*
*┃ 1.  ᴏᴡɴᴇʀ*
*┃ 2.  sᴇɴᴅ*
*┃ 3.  ɢɪᴛᴄʟᴏɴᴇ*
*┗──────────────⊷*

*⚡ Powered by ${BOT_NAME}*`;

    return menuText;
}