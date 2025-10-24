const neoxrApi = require('../lib/neoxrApi');

module.exports = {
    pattern: 'pinterest',
    alias: ['pin', 'pinsearch'],
    category: 'downloader',
    desc: 'Download from Pinterest or search Pinterest images',
    react: '📌',
    filename: __filename,
    use: '.pinterest <url or search query>',
    
    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args.length) {
                return reply("❌ *Usage:* .pinterest <Pinterest URL or search query>\n\n*Examples:*\n• .pinterest https://pin.it/5fXaAWE\n• .pinterest cute cats");
            }
            
            const input = args.join(' ');
            
            // Send loading reaction
            await conn.sendMessage(from, {
                react: { text: '🕒', key: mek.key }
            });
            
            // Check if input is a URL
            const isUrl = /^https?:\/\//.test(input);
            
            let json;
            if (isUrl) {
                // Download specific pin
                json = await neoxrApi.pinterestdl(input);
            } else {
                // Search Pinterest
                json = await neoxrApi.pinterest(input);
            }
            
            if (!json.status) {
                return reply(`❌ Failed to ${isUrl ? 'download' : 'search'}: ${json.message || 'Unknown error'}`);
            }
            
            // Send success reaction
            await conn.sendMessage(from, {
                react: { text: '✅', key: mek.key }
            });
            
            if (isUrl) {
                // Single download
                const data = json.data;
                if (data.url) {
                    await conn.sendMessage(from, {
                        image: { url: data.url },
                        caption: `『 ᴘɪɴᴛᴇʀᴇsᴛ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ 』\n\n◦ *Title:* ${data.title || 'No title'}\n◦ *Type:* Image\n\n> *MALVIN LITE*`
                    }, { quoted: mek });
                } else {
                    return reply('❌ Could not find downloadable content!');
                }
            } else {
                // Search results
                const results = json.data.slice(0, 5); // Limit to 5 results
                
                if (!results.length) {
                    return reply('❌ No results found for your search!');
                }
                
                await conn.sendMessage(from, {
                    text: `『 ᴘɪɴᴛᴇʀᴇsᴛ sᴇᴀʀᴄʜ 』\n\n◦ *Query:* ${input}\n◦ *Results:* ${results.length}\n◦ *Sending images...*\n\n> *MALVIN LITE*`
                }, { quoted: mek });
                
                for (const [index, result] of results.entries()) {
                    try {
                        await conn.sendMessage(from, {
                            image: { url: result.pin },
                            caption: `📌 Result ${index + 1}/${results.length}\n${result.title || 'No title'}`
                        });
                        
                        // Delay between sends
                        if (index < results.length - 1) {
                            await new Promise(resolve => setTimeout(resolve, 2000));
                        }
                    } catch (err) {
                        console.error(`Error sending Pinterest result ${index + 1}:`, err);
                    }
                }
            }
            
        } catch (error) {
            console.error('Pinterest error:', error);
            return reply('❌ An error occurred while processing your request. Please try again later.');
        }
    }
};