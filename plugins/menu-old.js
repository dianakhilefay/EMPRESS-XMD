// Environment variables with fallback values
const BOT_NAME = process.env.BOT_NAME || "ᴍᴀʟᴠɪɴ - ʟɪᴛᴇ";
const OWNER_NAME = process.env.OWNER_NAME || "ᴍᴀʟᴠɪɴ ᴋɪɴɢ";
const REPO_LINK = process.env.REPO_LINK || "https://github.com/XdKing2/MALVIN-XD";
const MENU_IMAGE_URL = process.env.MENU_IMAGE_URL || "https://files.catbox.moe/x7qky4.jpg";

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
            const fakevCard = global.fakevCard;
            
            // Get BOT_NAME from environment or default
            const botName = BOT_NAME || process.env.BOT_NAME || "ᴍᴀʟᴠɪɴ - ʟɪᴛᴇ";
            
            const menu = generateMenu(userPrefix, sessionId, activeSockets, commands);
            
            // Send menu with the requested style
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
                        body: `${botName} - ᴀʟʟ ᴄᴍᴅs`,
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
    // Get BOT_NAME and OWNER_NAME safely
    const botName = BOT_NAME || process.env.BOT_NAME || "ᴍᴀʟᴠɪɴ - ʟɪᴛᴇ";
    const ownerName = OWNER_NAME || process.env.OWNER_NAME || "ᴍᴀʟᴠɪɴ ᴋɪɴɢ";
    
    // Calculate uptime
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    const uptimeStr = `${hours}h ${minutes}m ${seconds}s`;

    // Get active sessions count
    const activeSessions = activeSockets ? activeSockets.size : 1;

    // Get commands from commands folder
    const folderCommands = [];
    for (const [pattern, command] of commands.entries()) {
        if (!folderCommands.some(cmd => cmd.name === pattern)) {
            folderCommands.push({
                name: pattern,
                category: command.category || 'other'
            });
        }
    }
    
    // Add built-in commands with categories
    const builtInCommands = [
        { name: 'ping', category: 'utility' },
        { name: 'prefix', category: 'utility' },
        { name: 'settings', category: 'utility' },
        { name: 'autoview', category: 'utility' },
        { name: 'autoreact', category: 'utility' },
        { name: 'autoreply', category: 'utility' },
        { name: 'menu', category: 'utility' },
        { name: 'help', category: 'utility' },
        { name: 'malvin', category: 'utility' },
        { name: 'runtime', category: 'general' }
    ];
    
    const allCommands = [...builtInCommands, ...folderCommands];

    const menuText = `_*ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ ${botName} 🥀*_
*╭──────────────┈⊷*
*┊•* \`ʙᴏᴛ ɴᴀᴍᴇ\` *:- ${botName}*
*┊•* \`ʙᴏᴛ ᴠᴇʀꜱɪᴏɴ\` *:- 1.0 ʙᴇᴛᴀ*
*┊•* \`ʙᴏᴛ ᴄʀᴇᴀᴛᴏʀ\` *:- ${ownerName}*
*┊•* \`ʙᴏᴛ ʀᴜɴᴛɪᴍᴇ\` *:- ${uptimeStr}*
*┊•* \`ᴀᴄᴛɪᴠᴇ ꜱᴇꜱꜱɪᴏɴꜱ\` *:- ${activeSessions}*
*╰──────────────┈⊷*

   『 Core Commands 』

┌  ◦  ${userPrefix}ᴘɪɴɢ *ᴛᴇsᴛ ʙᴏᴛ sᴘᴇᴇᴅ*
│  ◦  ${userPrefix}ᴍᴇɴᴜ *sᴇᴇ ʙᴏᴛ ᴍᴇɴᴜ*
│  ◦  ${userPrefix}ʀᴜɴᴛɪᴍᴇ *ʙᴏᴛ ᴜᴘᴛɪᴍᴇ*
│  ◦  ${userPrefix}ᴘʀᴇғɪx *ᴄʜᴀɴɢᴇ ᴘʀᴇғɪx*
│  ◦  ${userPrefix}sᴇᴛᴛɪɴɢs *ʙᴏᴛ sᴇᴛᴛɪɴɢs*
└  ◦  ${userPrefix}ᴍᴀʟᴠɪɴ *ʙᴏᴛ ɪɴғᴏ*

   『 AI Commands 』

┌  ◦  ${userPrefix}ꜰʟᴜxᴀɪ *ᴀɪ ɪᴍᴀɢᴇ ɢᴇɴ*
│  ◦  ${userPrefix}ɢᴘᴛ4 *ᴀɪ ᴄʜᴀᴛ*
│  ◦  ${userPrefix}ʟᴜᴍɪɴᴀɪ *ᴀɪ ᴀssɪsᴛᴀɴᴛ*
│  ◦  ${userPrefix}ᴍᴇᴛᴀᴀɪ *ᴍᴇᴛᴀ ᴀɪ*
│  ◦  ${userPrefix}ᴀɪᴄʟᴀᴜᴅᴇ *ᴄʟᴀᴜᴅᴇ ᴀɪ*
└  ◦  ${userPrefix}sᴜɴᴏ *ᴀɪ ᴍᴜsɪᴄ*

   『 Fun Commands 』

┌  ◦  ${userPrefix}ʙʀᴀᴛᴠɪᴅ *ʙʀᴀᴛ ᴠɪᴅᴇᴏ*
│  ◦  ${userPrefix}ʙʀᴀᴛ2 *ʙʀᴀᴛ ɪᴍᴀɢᴇ*
│  ◦  ${userPrefix}ᴊᴏᴋᴇ *ʀᴀɴᴅᴏᴍ ᴊᴏᴋᴇ*
│  ◦  ${userPrefix}ꜰʟɪʀᴛ *ꜰʟɪʀᴛ ʟɪɴᴇs*
│  ◦  ${userPrefix}ᴛʀᴜᴛʜ *ᴛʀᴜᴛʜ ǫᴜᴇsᴛɪᴏɴ*
│  ◦  ${userPrefix}ᴅᴀʀᴇ *ᴅᴀʀᴇ ᴄʜᴀʟʟᴇɴɢᴇ*
│  ◦  ${userPrefix}ꜰᴀᴄᴛ *ʀᴀɴᴅᴏᴍ ꜰᴀᴄᴛ*
│  ◦  ${userPrefix}ᴘɪᴄᴋᴜᴘʟɪɴᴇ *ᴘɪᴄᴋᴜᴘ ʟɪɴᴇ*
│  ◦  ${userPrefix}ᴄʜᴀʀᴀᴄᴛᴇʀ *ʀᴘ ᴄʜᴀʀᴀᴄᴛᴇʀ*
└  ◦  ${userPrefix}ʀᴇᴘᴇᴀᴛ *ʀᴇᴘᴇᴀᴛ ᴍᴇssᴀɢᴇ*

   『 Downloader Commands 』

┌  ◦  ${userPrefix}ᴘʟᴀʏ *sᴇᴀʀᴄʜ & ᴅʟ ᴍᴜsɪᴄ*
│  ◦  ${userPrefix}ʏᴛᴍᴘ3 *ʏᴏᴜᴛᴜʙᴇ ᴀᴜᴅɪᴏ*
│  ◦  ${userPrefix}ʏᴛᴍᴘ4 *ʏᴏᴜᴛᴜʙᴇ ᴠɪᴅᴇᴏ*
│  ◦  ${userPrefix}ɪɴsᴛᴀɢʀᴀᴍ *ɪɢ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ*
│  ◦  ${userPrefix}ғᴀᴄᴇʙᴏᴏᴋ *ғʙ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ*
│  ◦  ${userPrefix}ᴛɪᴋᴛᴏᴋ *ᴛᴛ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ*
│  ◦  ${userPrefix}ᴛɪᴋᴍᴘ3 *ᴛᴛ ᴀᴜᴅɪᴏ ᴏɴʟʏ*
│  ◦  ${userPrefix}ᴛᴡɪᴛᴛᴇʀ *x/ᴛᴡɪᴛᴛᴇʀ ᴅʟ*
└  ◦  ${userPrefix}ᴘɪɴᴛᴇʀᴇsᴛ *ᴘɪɴ sᴇᴀʀᴄʜ/ᴅʟ*

   『 Utils & Fun 』

┌  ◦  ${userPrefix}ᴅᴏᴄᴀɴᴀʟʏᴢᴇ *ᴀɴᴀʟʏᴢᴇ ᴅᴏᴄ*
│  ◦  ${userPrefix}ɢᴏꜰɪʟᴇ *ꜰɪʟᴇ ᴜᴘʟᴏᴀᴅ*
│  ◦  ${userPrefix}ᴛᴏᴜʀʟ *ɪᴍᴀɢᴇ ᴛᴏ ᴜʀʟ*
│  ◦  ${userPrefix}ᴛᴏᴜʀʟ2 *ɪᴍᴀɢᴇ ᴛᴏ ᴜʀʟ v2*
│  ◦  ${userPrefix}ᴄᴜᴛᴛʟʏ2 *ᴜʀʟ sʜᴏʀᴛᴇɴᴇʀ*
│  ◦  ${userPrefix}ᴀʙᴇʟʟᴀsʜᴏʀᴛ *ᴜʀʟ sʜᴏʀᴛ*
│  ◦  ${userPrefix}ᴀᴜᴛᴏᴠɪᴇᴡ *ᴀᴜᴛᴏ ᴠɪᴇᴡ sᴛᴀᴛᴜs*
│  ◦  ${userPrefix}ᴀᴜᴛᴏʀᴇᴀᴄᴛ *ᴀᴜᴛᴏ ʀᴇᴀᴄᴛ*
└  ◦  ${userPrefix}ᴀᴜᴛᴏʀᴇᴘʟʏ *ᴀᴜᴛᴏ ʀᴇᴘʟʏ*

   『 Sticker Tools 』

┌  ◦  ${userPrefix}ᴡᴀsᴛᴀʟᴋ *ᴡʜᴀᴛsᴀᴘᴘ sᴛᴀʟᴋ*
│  ◦  ${userPrefix}xsᴛᴀʟᴋ *x sᴛᴀʟᴋ*
│  ◦  ${userPrefix}ᴛɪᴋᴛᴏᴋsᴛᴀʟᴋ *ᴛɪᴋᴛᴏᴋ sᴛᴀʟᴋ*
└  ◦  ${userPrefix}ɪᴘ *ɪᴘ ɪɴꜰᴏ*

 『 Logo Maker 』

┌  ◦  ${userPrefix}3ᴅᴄᴏᴍɪᴄ *3ᴅ ᴄᴏᴍɪᴄ ʟᴏɢᴏ*
│  ◦  ${userPrefix}3ᴅᴘᴀᴘᴇʀ *3ᴅ ᴘᴀᴘᴇʀ ʟᴏɢᴏ*
│  ◦  ${userPrefix}ᴀᴍᴇʀɪᴄᴀ *ᴀᴍᴇʀɪᴄᴀɴ ꜰʟᴀɢ*
│  ◦  ${userPrefix}ᴀɴɢᴇʟᴡɪɴɢs *ᴀɴɢᴇʟ ᴡɪɴɢs*
│  ◦  ${userPrefix}ʙᴇᴀʀ *ʙᴇᴀʀ ʟᴏɢᴏ*
│  ◦  ${userPrefix}ʙɪʀᴛʜᴅᴀʏ *ʙɪʀᴛʜᴅᴀʏ ᴄᴀᴋᴇ*
│  ◦  ${userPrefix}ʙʟᴀᴄᴋᴘɪɴᴋ *ʙʟᴀᴄᴋᴘɪɴᴋ sᴛʏʟᴇ*
│  ◦  ${userPrefix}ʙᴏᴏᴍ *ᴇxᴘʟᴏsɪᴏɴ ᴇꜰꜰᴇᴄᴛ*
│  ◦  ${userPrefix}ʙᴜʟʙ *ʟɪɢʜᴛ ʙᴜʟʙ*
│  ◦  ${userPrefix}ᴄᴀsᴛʟᴇ *ᴄᴀsᴛʟᴇ ʟᴏɢᴏ*
│  ◦  ${userPrefix}ᴄᴀᴛ *ᴄᴀᴛ ʟᴏɢᴏ*
│  ◦  ${userPrefix}ᴄʟᴏᴜᴅs *ᴄʟᴏᴜᴅ ᴇꜰꜰᴇᴄᴛ*
│  ◦  ${userPrefix}ᴅᴇᴀᴅᴘᴏᴏʟ *ᴅᴇᴀᴅᴘᴏᴏʟ sᴛʏʟᴇ*
│  ◦  ${userPrefix}ᴅᴇᴠɪʟᴡɪɴɢs *ᴅᴇᴠɪʟ ᴡɪɴɢs*
│  ◦  ${userPrefix}ᴅʀᴀɢᴏɴʙᴀʟʟ *ᴅʀᴀɢᴏɴʙᴀʟʟ z*
│  ◦  ${userPrefix}ᴇʀᴀsᴇʀ *ᴇʀᴀsᴇʀ ᴇꜰꜰᴇᴄᴛ*
│  ◦  ${userPrefix}ꜰʀᴏᴢᴇɴ *ꜰʀᴏᴢᴇɴ sᴛʏʟᴇ*
│  ◦  ${userPrefix}ꜰᴜᴛᴜʀɪsᴛɪᴄ *ꜰᴜᴛᴜʀᴇ ʟᴏɢᴏ*
│  ◦  ${userPrefix}ɢʟᴏssʏsɪʟᴠᴇʀ *sɪʟᴠᴇʀ ᴇꜰꜰᴇᴄᴛ*
│  ◦  ${userPrefix}ʜᴀᴄᴋᴇʀ *ʜᴀᴄᴋᴇʀ ꜰᴏɴᴛ*
│  ◦  ${userPrefix}ʟᴇᴀꜰ *ʟᴇᴀꜰ ᴇꜰꜰᴇᴄᴛ*
│  ◦  ${userPrefix}ʟᴜxᴜʀʏ *ʟᴜxᴜʀʏ ɢᴏʟᴅ*
│  ◦  ${userPrefix}ɴᴇᴏɴʟɪɢʜᴛ *ɴᴇᴏɴ ʟɪɢʜᴛ*
│  ◦  ${userPrefix}ɴɪɢᴇʀɪᴀ *ɴɪɢᴇʀɪᴀɴ ꜰʟᴀɢ*
│  ◦  ${userPrefix}ᴘᴀɪɴᴛ *ᴘᴀɪɴᴛ ᴇꜰꜰᴇᴄᴛ*
│  ◦  ${userPrefix}ᴘᴏʀɴʜᴜʙ *ᴘᴏʀɴʜᴜʙ sᴛʏʟᴇ*
│  ◦  ${userPrefix}sᴀᴅɢɪʀʟ *sᴀᴅ ɢɪʀʟ*
│  ◦  ${userPrefix}sᴀɴs *sᴀɴs ꜰᴏɴᴛ*
│  ◦  ${userPrefix}sᴜɴsᴇᴛ *sᴜɴsᴇᴛ ᴇꜰꜰᴇᴄᴛ*
│  ◦  ${userPrefix}ᴛᴀᴛᴏᴏ *ᴛᴀᴛᴏᴏ sᴛʏʟᴇ*
│  ◦  ${userPrefix}ᴛᴇxᴛᴍᴀᴋᴇʀ *ᴛᴇxᴛ ᴍᴀᴋᴇʀ*
│  ◦  ${userPrefix}ᴛʜᴏʀ *ᴛʜᴏʀ ʜᴀᴍᴍᴇʀ*
│  ◦  ${userPrefix}ᴢᴏᴅɪᴀᴄ *ᴢᴏᴅɪᴀᴄ sɪɢɴ*
└  ◦  ${userPrefix}ʏᴛʟᴏɢᴏ *ʏᴏᴜᴛᴜʙᴇ ʟᴏɢᴏ*

*⚡ Powered by ${botName}*`;

    return menuText;
}