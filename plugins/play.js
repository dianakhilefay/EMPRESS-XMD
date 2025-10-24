const neoxrApi = require('../lib/neoxrApi');

module.exports = {
    pattern: 'play',
    alias: ['song', 'music'],
    category: 'downloader',
    desc: 'Search and download music from YouTube',
    react: '🎵',
    filename: __filename,
    use: '.play <song name>',
    
    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args.length) {
                return reply("❌ *Usage:* .play <song name>\n\n*Example:* .play believer imagine dragons");
            }
            
            const query = args.join(' ');
            
            // Send loading reaction
            await conn.sendMessage(from, {
                react: { text: '🔍', key: mek.key }
            });
            
            const json = await neoxrApi.play(query);
            
            if (!json.status) {
                return reply(`❌ No results found for: "${query}"`);
            }
            
            // Send loading reaction
            await conn.sendMessage(from, {
                react: { text: '🕒', key: mek.key }
            });
            
            let caption = `『 ʏᴏᴜᴛᴜʙᴇ ᴍᴜsɪᴄ 』\n\n`;
            caption += `◦ *Title:* ${json.title}\n`;
            caption += `◦ *Duration:* ${json.duration}\n`;
            caption += `◦ *Size:* ${json.data.size}\n`;
            caption += `◦ *Quality:* ${json.data.quality}\n\n`;
            caption += `🎵 *Downloading audio...*\n\n`;
            caption += `> *MALVIN LITE*`;
            
            // Send thumbnail with info
            if (json.thumbnail) {
                await conn.sendMessage(from, {
                    image: { url: json.thumbnail },
                    caption: caption
                }, { quoted: mek });
            }
            
            // Send success reaction
            await conn.sendMessage(from, {
                react: { text: '✅', key: mek.key }
            });
            
            // Check file size
            const sizeInMB = parseFloat(json.data.size.replace(/MB|mb/g, '').trim());
            const isLargeFile = sizeInMB > 99;
            
            if (isLargeFile) {
                await conn.sendMessage(from, {
                    document: { url: json.data.url },
                    mimetype: 'audio/mp4',
                    fileName: json.data.filename || `${json.title}.mp3`,
                    caption: '📁 Large file sent as document'
                }, { quoted: mek });
            } else {
                await conn.sendMessage(from, {
                    audio: { url: json.data.url },
                    mimetype: 'audio/mp4',
                    ptt: false,
                    caption: `🎵 ${json.title}`
                }, { quoted: mek });
            }
            
        } catch (error) {
            console.error('Play command error:', error);
            await reply('❌ An error occurred while searching/downloading. Please try again later.');
        }
    }
};