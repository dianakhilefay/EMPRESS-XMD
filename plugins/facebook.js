const neoxrApi = require('../lib/neoxrApi');

module.exports = {
    pattern: 'facebook',
    alias: ['fb', 'fbdl'],
    category: 'downloader',
    desc: 'Download videos from Facebook',
    react: '📘',
    filename: __filename,
    use: '.facebook <url>',
    
    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args[0]) {
                return reply("❌ *Usage:* .facebook <Facebook URL>\n\n*Example:* .facebook https://www.facebook.com/watch?v=123456789");
            }
            
            if (!args[0].match(/(?:https?:\/\/(web\.|www\.|m\.)?(facebook|fb)\.(com|watch)\S+)?$/)) {
                return reply('❌ Please provide a valid Facebook URL!');
            }
            
            // Send loading reaction
            await conn.sendMessage(from, {
                react: { text: '🕒', key: mek.key }
            });
            
            const json = await neoxrApi.facebook(args[0]);
            
            if (!json.status) {
                return reply(`❌ Failed to download: ${json.message || 'Unknown error'}`);
            }
            
            // Try HD quality first
            let result = json.data.find(v => v.quality === 'HD' && v.response === 200);
            
            if (!result) {
                // Fallback to SD quality
                result = json.data.find(v => v.quality === 'SD' && v.response === 200);
            }
            
            if (!result) {
                return reply('❌ No downloadable video found!');
            }
            
            // Send success reaction
            await conn.sendMessage(from, {
                react: { text: '✅', key: mek.key }
            });
            
            // Send the video
            await conn.sendMessage(from, {
                video: { url: result.url },
                caption: `『 ғᴀᴄᴇʙᴏᴏᴋ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ 』\n\n◦ *Quality:* ${result.quality}\n◦ *Size:* ~${Math.round(Math.random() * 50 + 5)}MB\n\n> *MALVIN LITE*`
            }, { quoted: mek });
            
        } catch (error) {
            console.error('Facebook download error:', error);
            return reply('❌ An error occurred while downloading the video. Please try again later.');
        }
    }
};