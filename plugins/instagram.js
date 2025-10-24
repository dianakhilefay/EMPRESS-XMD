const neoxrApi = require('../lib/neoxrApi');

module.exports = {
    pattern: 'instagram',
    alias: ['ig', 'igdl', 'insta'],
    category: 'downloader',
    desc: 'Download media from Instagram',
    react: '📷',
    filename: __filename,
    use: '.instagram <url>',
    
    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args[0]) {
                return reply("❌ *Usage:* .instagram <Instagram URL>\n\n*Example:* .instagram https://www.instagram.com/p/ABC123/");
            }
            
            if (!args[0].match(/(https:\/\/www.instagram.com)/gi)) {
                return reply('❌ Please provide a valid Instagram URL!');
            }
            
            // Send loading reaction
            await conn.sendMessage(from, {
                react: { text: '🕒', key: mek.key }
            });
            
            const json = await neoxrApi.instagram(args[0]);
            
            if (!json.status) {
                return reply(`❌ Failed to download: ${json.message || 'Unknown error'}`);
            }
            
            // Send success reaction
            await conn.sendMessage(from, {
                react: { text: '✅', key: mek.key }
            });
            
            const files = json.data;
            
            if (files.length === 1) {
                // Single file
                const file = files[0];
                const isVideo = file.type === 'mp4' || file.url.includes('.mp4');
                
                if (isVideo) {
                    await conn.sendMessage(from, {
                        video: { url: file.url },
                        caption: `『 ɪɴsᴛᴀɢʀᴀᴍ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ 』\n\n◦ *Type:* Video\n◦ *Format:* MP4\n\n> *MALVIN LITE*`
                    }, { quoted: mek });
                } else {
                    await conn.sendMessage(from, {
                        image: { url: file.url },
                        caption: `『 ɪɴsᴛᴀɢʀᴀᴍ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ 』\n\n◦ *Type:* Photo\n◦ *Format:* JPEG\n\n> *MALVIN LITE*`
                    }, { quoted: mek });
                }
            } else {
                // Multiple files (carousel)
                await conn.sendMessage(from, {
                    text: `『 ɪɴsᴛᴀɢʀᴀᴍ ᴄᴀʀᴏᴜsᴇʟ 』\n\n◦ *Total Files:* ${files.length}\n◦ *Downloading...*\n\n> *MALVIN LITE*`
                }, { quoted: mek });
                
                for (const [index, file] of files.entries()) {
                    const isVideo = file.type === 'mp4' || file.url.includes('.mp4');
                    
                    if (isVideo) {
                        await conn.sendMessage(from, {
                            video: { url: file.url },
                            caption: `📹 Video ${index + 1}/${files.length}`
                        });
                    } else {
                        await conn.sendMessage(from, {
                            image: { url: file.url },
                            caption: ` Photo ${index + 1}/${files.length}`
                        });
                    }
                    
                    // Delay between sends
                    if (index < files.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 1500));
                    }
                }
            }
            
        } catch (error) {
            console.error('Instagram download error:', error);
            return reply('❌ An error occurred while downloading. Please try again later.');
        }
    }
};