// === ppcouple.js ===
// Adapted from external bot for Malvin-Lite
// Couple profile pictures generator
const axios = require('axios');
const fakevCard = require('../lib/fakevcard');

module.exports = {
    pattern: "ppcouple",
    desc: "Get matching couple profile pictures",
    category: "tools",
    react: "💑",
    filename: __filename,
    use: ".ppcouple",
    
    execute: async (conn, mek, m, { from, reply }) => {
        try {
            await conn.sendMessage(from, {
                react: { text: '⏳', key: mek.key }
            });

            await reply('💑 **Generating couple profile pictures...**\n\nFinding matching couple avatars for you...');

            // Fetch couple pictures data
            const response = await axios.get('https://raw.githubusercontent.com/KazukoGans/database/main/anime/ppcouple.json', {
                timeout: 30000
            });
            const data = response.data;

            if (!data || !Array.isArray(data) || data.length === 0) {
                return reply('❌ Failed to fetch couple pictures. Please try again later.');
            }

            // Select random couple
            const randomCouple = data[Math.floor(Math.random() * data.length)];
            
            if (!randomCouple.cowo || !randomCouple.cewe) {
                return reply('❌ Invalid couple data received. Please try again.');
            }

            // Download male profile picture
            const maleImageResponse = await axios.get(randomCouple.cowo, {
                responseType: 'arraybuffer',
                timeout: 30000
            });
            const maleImage = Buffer.from(maleImageResponse.data);

            // Send male profile picture
            await conn.sendMessage(from, {
                image: maleImage,
                caption: `👨 **Male Profile Picture**\n\n💝 Send this to your girlfriend! ♂️\n\n💡 **Tip:** Perfect for couples who want matching avatars!\n\n> © Couple Profile Pictures`
            }, { quoted: fakevCard });

            // Small delay before sending second image
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Download female profile picture
            const femaleImageResponse = await axios.get(randomCouple.cewe, {
                responseType: 'arraybuffer',
                timeout: 30000
            });
            const femaleImage = Buffer.from(femaleImageResponse.data);

            // Send female profile picture
            await conn.sendMessage(from, {
                image: femaleImage,
                caption: `👩 **Female Profile Picture**\n\n💝 Send this to your boyfriend! ♀️\n\n🎨 **Style:** Matching anime couple avatars\n📱 **Perfect for:** WhatsApp, Telegram, Discord profiles\n\n> © Couple Profile Pictures`
            }, { quoted: fakevCard });

            await conn.sendMessage(from, {
                react: { text: '✅', key: mek.key }
            });

        } catch (error) {
            console.error('PPCouple error:', error);
            await conn.sendMessage(from, {
                react: { text: '❌', key: mek.key }
            });
            
            let errorMsg = '❌ Failed to get couple pictures: ';
            if (error.message.includes('timeout')) {
                errorMsg += 'Request timeout. Please try again.';
            } else if (error.message.includes('network')) {
                errorMsg += 'Network error. Please check your connection.';
            } else if (error.code === 'ECONNRESET') {
                errorMsg += 'Connection reset. Please try again.';
            } else {
                errorMsg += error.message || 'Unknown error occurred.';
            }
            
            return reply(errorMsg);
        }
    }
};