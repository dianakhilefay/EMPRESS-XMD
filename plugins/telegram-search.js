// === telegram-search.js ===
// Adapted from external bot for Malvin-Lite
// Author: gienetic, Plugin Conversion: By noureddine ouafy using Gemini
const axios = require("axios");
const cheerio = require("cheerio");
const fakevCard = require('../lib/fakevcard');

// Helper function to get the real t.me link from a join page
async function getRealTelegramLink(joinUrl) {
    try {
        const { data } = await axios.get(joinUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
            },
            timeout: 10000
        });
        const $ = cheerio.load(data);
        const realLink = $('a[href^="tg://resolve"]').attr("href");

        if (realLink) {
            const username = realLink.split("tg://resolve?domain=")[1];
            return `https://t.me/${username}`;
        }
    } catch (e) {
        // Silently fail and fallback to the original URL
        console.error(`Failed to resolve Telegram link: ${e.message}`);
    }
    return joinUrl;
}

// Main function to search for Telegram channels
async function searchTelegramChannels(query) {
    try {
        const url = `https://en.tgramsearch.com/search?query=${encodeURIComponent(query)}`;
        const { data } = await axios.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
            },
            timeout: 30000
        });

        const $ = cheerio.load(data);
        const results = [];

        for (const el of $(".tg-channel-wrapper").toArray()) {
            const name = $(el).find(".tg-channel-link a").text().trim();
            let link = $(el).find(".tg-channel-link a").attr("href");
            const image = $(el).find(".tg-channel-img img").attr("src");
            const members = $(el).find(".tg-user-count").text().trim();
            const description = $(el).find(".tg-channel-description").text().trim();
            const category = $(el).find(".tg-channel-categories a").text().trim();

            if (link?.startsWith("/join/")) {
                link = await getRealTelegramLink(`https://en.tgramsearch.com${link}`);
            } else if (link?.startsWith("tg://resolve?domain=")) {
                const username = link.split("tg://resolve?domain=")[1];
                link = `https://t.me/${username}`;
            }

            if (name && link) {
                results.push({ name, link, image, members, description, category });
            }
        }
        return results;
    } catch (err) {
        console.error(`Telegram Search Scraping Error: ${err.message}`);
        throw new Error("Could not fetch data from the source.");
    }
}

module.exports = {
    pattern: "telegram-search",
    desc: "Search for Telegram channels and groups",
    category: "search",
    react: "📱",
    filename: __filename,
    use: ".telegram-search <query>",
    
    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args.length) {
                return reply(
                    `📱 **Telegram Channel Search**\n\n` +
                    `🎯 **Usage:** \`.telegram-search <query>\`\n\n` +
                    `📝 **Examples:**\n` +
                    `• \`.telegram-search android\` - Android channels\n` +
                    `• \`.telegram-search movies\` - Movie channels\n` +
                    `• \`.telegram-search news\` - News channels\n` +
                    `• \`.telegram-search tech\` - Technology channels\n\n` +
                    `🔍 **What you'll get:**\n` +
                    `• Channel/Group names\n` +
                    `• Member counts\n` +
                    `• Descriptions\n` +
                    `• Direct Telegram links\n` +
                    `• Category information\n\n` +
                    `💡 **Tip:** Use specific keywords for better results!`
                );
            }

            const query = args.join(' ');

            await conn.sendMessage(from, {
                react: { text: '⏳', key: mek.key }
            });

            await reply("🔍 **Searching for Telegram channels...**\n\nPlease wait while I find relevant channels...");

            const results = await searchTelegramChannels(query);

            if (results.length === 0) {
                return reply(`😔 **No channels found for "${query}"**\n\nTry different keywords or check your spelling.`);
            }

            let replyText = `✅ **Found ${results.length} channels for "${query}"**\n\n`;
            
            const displayResults = results.slice(0, 8); // Limit to 8 results to avoid message length issues
            
            replyText += displayResults.map((item, i) => {
                let result = `**${i + 1}. ${item.name}**\n`;
                if (item.members) result += `👥 **Members:** ${item.members}\n`;
                if (item.category) result += `🏷️ **Category:** ${item.category}\n`;
                result += `🔗 **Link:** ${item.link}\n`;
                if (item.description) result += `📝 **Description:** ${item.description.substring(0, 100)}${item.description.length > 100 ? '...' : ''}`;
                return result;
            }).join("\n\n---\n\n");

            if (results.length > 8) {
                replyText += `\n\n📋 **Note:** Showing first 8 results out of ${results.length} found.`;
            }

            replyText += `\n\n> © Search results from Telegram | Query: ${query}`;

            await conn.sendMessage(from, {
                text: replyText,
            }, { quoted: fakevCard });

            await conn.sendMessage(from, {
                react: { text: '✅', key: mek.key }
            });

        } catch (error) {
            console.error('Telegram search error:', error);
            await conn.sendMessage(from, {
                react: { text: '❌', key: mek.key }
            });
            
            let errorMsg = '❌ Search failed: ';
            if (error.message.includes('timeout')) {
                errorMsg += 'Request timeout. Please try again.';
            } else if (error.message.includes('network')) {
                errorMsg += 'Network error. Please check your connection.';
            } else if (error.message.includes('fetch data')) {
                errorMsg += 'Unable to access search service. Please try again later.';
            } else {
                errorMsg += error.message || 'Unknown error occurred.';
            }
            
            return reply(errorMsg);
        }
    }
};