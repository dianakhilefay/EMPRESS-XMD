const neoxrApi = require('../lib/neoxrApi');

module.exports = {
    pattern: 'twitter',
    alias: ['tw', 'twdl', 'x'],
    category: 'downloader',
    desc: 'Download media from Twitter/X',
    react: '🐦',
    filename: __filename,
    use: '.twitter <url>',
    
    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args[0]) {
                return reply("❌ *Usage:* .twitter <Twitter URL>\n\n*Example:* .twitter https://twitter.com/user/status/123456789");
            }
            
            if (!args[0].match(/(x.com|twitter.com)/gi)) {
                return reply('❌ Please provide a valid Twitter/X URL!');
            }
            
            // Send loading reaction
            await conn.sendMessage(from, {
                react: { text: '🕒', key: mek.key }
            });
            
            const json = await neoxrApi.twitter(args[0]);
            
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
                        caption: `『 ᴛᴡɪᴛᴛᴇʀ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ 』\n\n◦ *Type:* Video\n◦ *Format:* MP4\n\n> *MALVIN LITE*`
                    }, { quoted: mek });
                } else {
                    await conn.sendMessage(from, {
                        image: { url: file.url },
                        caption: `『 ᴛᴡɪᴛᴛᴇʀ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ 』\n\n◦ *Type:* Photo\n◦ *Format:* JPEG\n\n> *MALVIN LITE*`
                    }, { quoted: mek });
                }
            } else {
                // Multiple files
                await conn.sendMessage(from, {
                    text: `『 ᴛᴡɪᴛᴛᴇʀ ᴍᴇᴅɪᴀ 』\n\n◦ *Total Files:* ${files.length}\n◦ *Downloading...*\n\n> *MALVIN LITE*`
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
                            caption: `📷 Photo ${index + 1}/${files.length}`
                        });
                    }
                    
                    // Delay between sends
                    if (index < files.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 1500));
                    }
                }
            }
            
        } catch (error) {
            console.error('Twitter download error:', error);
            return reply('❌ An error occurred while downloading. Please try again later.');
        }
    }
};