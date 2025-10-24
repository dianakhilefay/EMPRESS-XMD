const neoxrApi = require('../lib/neoxrApi');
const moment = require('moment-timezone');

module.exports = {
    pattern: 'tiktok',
    alias: ['tt', 'tikwm', 'tikmp3'],
    category: 'downloader',
    desc: 'Download videos from TikTok',
    react: '📹',
    filename: __filename,
    use: '.tiktok <url>',
    
    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args[0]) {
                return reply("❌ *Usage:* .tiktok <TikTok URL>\n\n*Example:* .tiktok https://vm.tiktok.com/ZSR7c5G6y/");
            }
            
            if (!args[0].match('tiktok.com')) {
                return reply('❌ Please provide a valid TikTok URL!');
            }
            
            // Send loading reaction
            await conn.sendMessage(from, {
                react: { text: '🕒', key: mek.key }
            });
            
            const json = await neoxrApi.tiktok(args[0]);
            
            if (!json.status) {
                return reply(`❌ Failed to download: ${json.message || 'Unknown error'}`);
            }
            
            // Send success reaction
            await conn.sendMessage(from, {
                react: { text: '✅', key: mek.key }
            });
            
            // Regular video download
            let caption = `『 ᴛɪᴋᴛᴏᴋ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ 』\n\n`;
            caption += `◦ *Author:* ${json.data.author?.nickname || 'Unknown'} (@${json.data.author?.uniqueId || 'unknown'})\n`;
            caption += `◦ *Views:* ${formatNumber(json.data.statistic?.views || 0)}\n`;
            caption += `◦ *Likes:* ${formatNumber(json.data.statistic?.likes || 0)}\n`;
            caption += `◦ *Comments:* ${formatNumber(json.data.statistic?.comments || 0)}\n`;
            caption += `◦ *Shares:* ${formatNumber(json.data.statistic?.shares || 0)}\n\n`;
            
            if (json.data.music) {
                caption += `🎵 *Music:* ${json.data.music.title || 'Unknown'}\n`;
                caption += `🎤 *Artist:* ${json.data.music.author || 'Unknown'}\n\n`;
            }
            
            if (json.data.caption) {
                caption += `📝 *Caption:*\n${json.data.caption}\n\n`;
            }
            
            caption += `> *MALVIN LITE*`;
            
            if (json.data.video) {
                await conn.sendMessage(from, {
                    video: { url: json.data.video },
                    caption: caption
                }, { quoted: mek });
            } else if (json.data.photo && json.data.photo.length > 0) {
                // Photo slideshow
                await reply(`『 ᴛɪᴋᴛᴏᴋ ᴘʜᴏᴛᴏ sʟɪᴅᴇsʜᴏᴡ 』\n\n◦ *Total Photos:* ${json.data.photo.length}\n◦ *Downloading...*\n\n> *MALVIN LITE*`);
                
                for (const [index, photo] of json.data.photo.entries()) {
                    await conn.sendMessage(from, {
                        image: { url: photo },
                        caption: `📸 Photo ${index + 1}/${json.data.photo.length}`
                    });
                    
                    if (index < json.data.photo.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 1500));
                    }
                }
            }
            
        } catch (error) {
            console.error('TikTok download error:', error);
            await reply('❌ An error occurred while downloading. Please try again later.');
        }
    }
};

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}