// === maps.js ===
// Adapted from Noroshi bot for Malvin-Lite
const axios = require('axios');
const fakevCard = require('../lib/fakevcard');

// Generate random string for User-Agent
const generateRandomString = (length) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};

// Fetch location data from OpenStreetMap API
const fetchLocationData = async (text, retries = 3, delayMs = 2000) => {
    const randomAppName = `AppName${generateRandomString(5)}`;
    const randomEmail = `user${generateRandomString(5)}@example.com`;

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=1`;
    const options = {
        headers: {
            'User-Agent': `${randomAppName}/1.0 (${randomEmail})`
        },
        timeout: 10000
    };

    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.get(url, options);
            
            if (response.status === 200) {
                const data = response.data;
                if (data.length === 0) {
                    throw new Error(`Location "${text}" not found!`);
                }
                return data[0];
            } else if (response.status === 403) {
                if (i < retries - 1) {
                    await delay(delayMs);
                    continue;
                } else {
                    throw new Error('Access denied to mapping service');
                }
            } else {
                throw new Error(`Error fetching data: ${response.statusText}`);
            }
        } catch (error) {
            if (i === retries - 1) {
                throw error;
            }
            await delay(delayMs);
        }
    }
};

// Delay function
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    pattern: "maps",
    alias: ["map", "location"],
    desc: "Find locations and get coordinates",
    category: "tools",
    react: "🗺️",
    filename: __filename,
    use: ".maps <location>",
    
    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args.length) {
                return reply(
                    `🗺️ **Maps & Location Finder**\n\n` +
                    `**Usage:** \`.maps <location>\`\n\n` +
                    `**Examples:**\n` +
                    `• \`.maps New York\`\n` +
                    `• \`.maps Paris, France\`\n` +
                    `• \`.maps Tokyo Station\`\n` +
                    `• \`.maps 123 Main St, Los Angeles\`\n\n` +
                    `💡 Works with cities, addresses, landmarks, and more!`
                );
            }

            const location = args.join(' ').trim();

            await conn.sendMessage(from, {
                react: { text: '🔍', key: mek.key }
            });

            await reply('🔍 Searching for location... Please wait.');

            const locationData = await fetchLocationData(location);
            
            const city = locationData.display_name;
            const latitude = parseFloat(locationData.lat);
            const longitude = parseFloat(locationData.lon);
            
            // Get additional location info
            const locationInfo = `🗺️ **Location Found**\n\n` +
                               `📍 **Name:** ${city}\n` +
                               `🌐 **Coordinates:**\n` +
                               `• Latitude: \`${latitude}\`\n` +
                               `• Longitude: \`${longitude}\`\n\n` +
                               `🎯 **Sending location pin...**`;

            await reply(locationInfo);

            // Send location on WhatsApp
            await conn.sendMessage(from, {
                location: { 
                    degreesLatitude: latitude, 
                    degreesLongitude: longitude 
                }
            }, { 
                ephemeralExpiration: 604800, // 7 days
                quoted: fakevCard 
            });

            // Send additional info after delay
            setTimeout(async () => {
                const detailedInfo = `📍 **Location Details**\n\n` +
                                   `🏠 **Full Address:** ${city}\n` +
                                   `🌍 **Coordinates:** ${latitude}, ${longitude}\n\n` +
                                   `🔗 **Google Maps:** https://maps.google.com/maps?q=${latitude},${longitude}\n` +
                                   `🗺️ **OpenStreetMap:** https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}\n\n` +
                                   `💡 **Tip:** You can share this location with others!\n\n` +
                                   `> © Powered by ${process.env.BOT_NAME || 'Malvin Lite'}`;

                await conn.sendMessage(from, {
                    text: detailedInfo,
                    contextInfo: {
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: "120363402507750390@newsletter",
                            newsletterName: "ᴍᴀʟᴠɪɴ ᴛᴇᴄʜ🪀",
                            serverMessageId: 200
                        },
                        externalAdReply: {
                            title: `Location: ${location}`,
                            body: `Lat: ${latitude}, Lng: ${longitude}`,
                            thumbnailUrl: "https://telegra.ph/file/1ecdb5a0aee62ef17d7fc.jpg",
                            sourceUrl: `https://maps.google.com/maps?q=${latitude},${longitude}`,
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: fakevCard });
            }, 2000);

            await conn.sendMessage(from, {
                react: { text: '✅', key: mek.key }
            });

        } catch (error) {
            console.error('Maps error:', error);
            await conn.sendMessage(from, {
                react: { text: '❌', key: mek.key }
            });
            
            let errorMsg = '❌ Failed to find location: ';
            if (error.message.includes('not found')) {
                errorMsg += 'Location not found. Try a different search term.';
            } else if (error.message.includes('403')) {
                errorMsg += 'Service temporarily unavailable. Try again later.';
            } else if (error.message.includes('timeout')) {
                errorMsg += 'Search timed out. Try again with a more specific location.';
            } else {
                errorMsg += error.message;
            }
            
            return reply(errorMsg);
        }
    }
};