// === modapk.js ===
// Adapted from external bot for Malvin-Lite
// instagram.com/noureddine_ouafy
// scrape by shaanz
const axios = require('axios');
const cheerio = require('cheerio');
const fakevCard = require('../lib/fakevcard');

const mod = {
    search: async (query) => {
        try {
            const response = await axios.get(`https://modded-by-yadi.blogspot.com/search?q=${encodeURIComponent(query)}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 30000
            });
            const html = response.data;
            const $ = cheerio.load(html);

            const articles = [];

            $('article.post.post-wrapper').each((_, element) => {
                const article = {
                    headline: $(element).find('h2.post-title.entry-title a').text().trim(),
                    link: $(element).find('h2.post-title.entry-title a').attr('href'),
                    imageSrc: $(element).find('img.post-thumbnail').attr('src'),
                    publishedDate: $(element).find('abbr.published.updated').attr('title'),
                };
                if (article.headline && article.link) {
                    articles.push(article);
                }
            });

            return articles;
        } catch (error) {
            console.error('Error fetching data:', error);
            return [];
        }
    },

    detailDownload: async (url) => {
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 30000
            });
            const html = response.data;
            const $ = cheerio.load(html);

            const appInfo = {
                Thumbnail: null,
                NamaApp: null,
                Versi: null,
                Developer: { Nama: null, Link: null },
                ArmDevice: { SupportedArchitecture: null, MinimalAndroid: null },
                NamaPaket: { ID: null, PlayStoreLink: null },
                DeskripsiApp: null,
                DownloadLinks: { MediaFire: null, GoogleDrive: null }
            };

            appInfo.Thumbnail = $('table img').attr('src') || null;

            $('table').each((_, table) => {
                $(table).find('tr').each((_, row) => {
                    const header = $(row).find('td').eq(0).text().trim();
                    const value = $(row).find('td').eq(1).text().trim();
                    const link = $(row).find('a').attr('href');

                    if (header === 'Nama App') appInfo.NamaApp = value;
                    if (header === 'Versi') appInfo.Versi = value;
                    if (header === 'Developer') {
                        appInfo.Developer.Nama = value;
                        appInfo.Developer.Link = link;
                    }
                    if (header === 'Arm / Device') {
                        const [arch, android] = value.split('Minimal Android');
                        appInfo.ArmDevice.SupportedArchitecture = arch?.trim();
                        appInfo.ArmDevice.MinimalAndroid = android?.trim();
                    }
                    if (header === 'Nama Paket') {
                        appInfo.NamaPaket.ID = value;
                        appInfo.NamaPaket.PlayStoreLink = link;
                    }
                });
            });

            appInfo.DeskripsiApp = $('#hidedesc td p').text().trim() || null;

            $('a').each((_, el) => {
                const href = $(el).attr('href');
                if (!href) return;
                if (href.includes('mediafire.com')) appInfo.DownloadLinks.MediaFire = href;
                if (href.includes('drive.google.com')) appInfo.DownloadLinks.GoogleDrive = href;
            });

            return appInfo;
        } catch (error) {
            console.error('Error fetching details:', error);
            return null;
        }
    }
};

module.exports = {
    pattern: "modapk",
    desc: "Search for modded APK applications",
    category: "downloader",
    react: "📱",
    filename: __filename,
    use: ".modapk <app_name>",
    
    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args.length) {
                return reply(
                    `📱 **Mod APK Search**\n\n` +
                    `🎯 **Usage:** \`.modapk <app_name>\`\n\n` +
                    `📝 **Examples:**\n` +
                    `• \`.modapk whatsapp\` - Search WhatsApp mods\n` +
                    `• \`.modapk spotify\` - Search Spotify premium\n` +
                    `• \`.modapk minecraft\` - Search Minecraft mods\n` +
                    `• \`.modapk instagram\` - Search Instagram mods\n\n` +
                    `📦 **What you'll get:**\n` +
                    `• Modded app versions\n` +
                    `• Download links (MediaFire, GDrive)\n` +
                    `• App details and versions\n` +
                    `• Developer information\n\n` +
                    `⚠️ **Use \`.moddetail <link>\` to get detailed info about any app**\n\n` +
                    `🛡️ **Security:** Always scan downloaded APKs before installing!`
                );
            }

            const query = args.join(' ');

            await conn.sendMessage(from, {
                react: { text: '⏳', key: mek.key }
            });

            await reply(`📱 **Searching for "${query}" mods...**\n\nPlease wait while I find available modded applications...`);

            const results = await mod.search(query);
            
            if (!results.length) {
                return reply(`😔 **No modded apps found for "${query}"**\n\nTry different keywords or check spelling.\n\n**Popular searches:** WhatsApp, Spotify, Instagram, YouTube, TikTok`);
            }

            let responseText = `📱 **Found ${results.length} Mod APKs for "${query}"**\n\n`;
            
            const displayResults = results.slice(0, 8); // Limit to 8 results
            
            responseText += displayResults.map((app, i) => {
                let result = `**${i + 1}. ${app.headline}**\n`;
                result += `🔗 **Link:** ${app.link}\n`;
                if (app.publishedDate) result += `📅 **Published:** ${new Date(app.publishedDate).toLocaleDateString()}`;
                return result;
            }).join('\n\n');

            if (results.length > 8) {
                responseText += `\n\n📋 **Note:** Showing first 8 results out of ${results.length} found.`;
            }

            responseText += `\n\n📦 **Get detailed info:** Use \`.moddetail <app_link>\` for download links and full details.`;
            responseText += `\n\n⚠️ **Disclaimer:** Always verify APK safety before installing.`;
            responseText += `\n\n> © Search results for modded applications`;

            await conn.sendMessage(from, {
                text: responseText,
            }, { quoted: fakevCard });

            await conn.sendMessage(from, {
                react: { text: '✅', key: mek.key }
            });

        } catch (error) {
            console.error('ModAPK search error:', error);
            await conn.sendMessage(from, {
                react: { text: '❌', key: mek.key }
            });
            
            let errorMsg = '❌ Search failed: ';
            if (error.message.includes('timeout')) {
                errorMsg += 'Request timeout. Please try again.';
            } else if (error.message.includes('network')) {
                errorMsg += 'Network error. Please check your connection.';
            } else {
                errorMsg += error.message || 'Unknown error occurred.';
            }
            
            return reply(errorMsg);
        }
    }
};

// Export the mod object for potential use in moddetail command
module.exports.mod = mod;