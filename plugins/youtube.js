const neoxrApi = require('../lib/neoxrApi');

module.exports = {
    pattern: 'youtube',
    alias: ['ytmp3', 'ytmp4', 'yta', 'ytv'],
    category: 'downloader',
    desc: 'Download audio/video from YouTube',
    react: '📺',
    filename: __filename,
    use: '.youtube <url>',
    
    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args[0]) {
                return reply("❌ *Usage:* .youtube <YouTube URL>\n\n*Example:* .youtube https://youtu.be/zaRFmdtLhQ8");
            }
            
            if (!/^(?:https?:\/\/)?(?:www\.|m\.|music\.)?youtu\.?be(?:\.com)?\/?.*(?:watch|embed)?(?:.*v=|v\/|\/)([\w\-_]+)\&?/.test(args[0])) {
                return reply('❌ Please provide a valid YouTube URL!');
            }
            
            // Send loading reaction
            await conn.sendMessage(from, {
                react: { text: '🕒', key: mek.key }
            });
            
            // Determine format from the command pattern used
            const isAudio = args.includes('mp3') || args.includes('audio');
            const type = isAudio ? 'audio' : 'video';
            const quality = isAudio ? '128kbps' : '720p';
            
            let json = await neoxrApi.youtube(args[0], type, quality);
            
            // If 720p fails, try 480p for video
            if (!json.status && !isAudio) {
                json = await neoxrApi.youtube(args[0], type, '480p');
            }
            
            if (!json.status) {
                return reply(`❌ Failed to download: ${json.message || 'Unknown error'}`);
            }
            
            // Send success reaction
            await conn.sendMessage(from, {
                react: { text: '✅', key: mek.key }
            });
            
            let caption = `『 ʏᴏᴜᴛᴜʙᴇ ${isAudio ? 'ᴀᴜᴅɪᴏ' : 'ᴠɪᴅᴇᴏ'} 』\n\n`;
            caption += `◦ *Title:* ${json.title}\n`;
            caption += `◦ *Duration:* ${json.duration}\n`;
            caption += `◦ *Size:* ${json.data.size}\n`;
            caption += `◦ *Quality:* ${json.data.quality}\n\n`;
            caption += `> *MALVIN LITE*`;
            
            // Send thumbnail first
            if (json.thumbnail) {
                await conn.sendMessage(from, {
                    image: { url: json.thumbnail },
                    caption: caption
                }, { quoted: mek });
            }
            
            // Check file size (basic check - you might want to implement actual size checking)
            const sizeInMB = parseFloat(json.data.size.replace(/MB|mb/g, '').trim());
            const isLargeFile = sizeInMB > 99;
            
            if (isAudio) {
                await conn.sendMessage(from, {
                    document: { url: json.data.url },
                    mimetype: 'audio/mp4',
                    fileName: json.data.filename || `${json.title}.mp3`,
                    caption: isLargeFile ? '📁 Large file sent as document' : undefined
                }, { quoted: mek });
            } else {
                if (isLargeFile) {
                    await conn.sendMessage(from, {
                        document: { url: json.data.url },
                        mimetype: 'video/mp4',
                        fileName: json.data.filename || `${json.title}.mp4`,
                        caption: '📁 Large file sent as document'
                    }, { quoted: mek });
                } else {
                    await conn.sendMessage(from, {
                        video: { url: json.data.url },
                        caption: `🎬 ${json.title}`
                    }, { quoted: mek });
                }
            }
            
        } catch (error) {
            console.error('YouTube download error:', error);
            await reply('❌ An error occurred while downloading. Please try again later.');
        }
    }
};