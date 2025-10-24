// === moddetail.js ===
// Companion to modapk.js for detailed app information
// Adapted from external bot for Malvin-Lite
const { mod } = require('./modapk');
const fakevCard = require('../lib/fakevcard');

module.exports = {
    pattern: "moddetail",
    desc: "Get detailed information about a modded APK",
    category: "downloader",
    react: "📋",
    filename: __filename,
    use: ".moddetail <app_link>",
    
    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args.length) {
                return reply(
                    `📋 **Mod APK Details**\n\n` +
                    `🎯 **Usage:** \`.moddetail <app_link>\`\n\n` +
                    `📝 **Example:**\n\`\`.moddetail https://modded-by-yadi.blogspot.com/2023/...\`\`\n\n` +
                    `💡 **How to use:**\n` +
                    `1. First search using \`.modapk <app_name>\`\n` +
                    `2. Copy any app link from the results\n` +
                    `3. Use \`.moddetail <link>\` to get full details\n\n` +
                    `📦 **What you'll get:**\n` +
                    `• App version and developer info\n` +
                    `• System requirements\n` +
                    `• Direct download links\n` +
                    `• App description and features`
                );
            }

            const url = args[0];
            
            // Validate URL
            if (!url.includes('modded-by-yadi.blogspot.com')) {
                return reply('❌ Invalid URL. Please provide a valid link from the modapk search results.');
            }

            await conn.sendMessage(from, {
                react: { text: '⏳', key: mek.key }
            });

            await reply('📋 **Fetching detailed app information...**\n\nPlease wait while I get all the details...');

            const appInfo = await mod.detailDownload(url);
            
            if (!appInfo || !appInfo.NamaApp) {
                return reply('❌ Failed to get app details. The link might be invalid or the page is not accessible.');
            }

            let detailText = `📱 **${appInfo.NamaApp} - Detailed Info**\n\n`;
            
            if (appInfo.Versi) detailText += `📌 **Version:** ${appInfo.Versi}\n`;
            if (appInfo.Developer.Nama) detailText += `👨‍💻 **Developer:** ${appInfo.Developer.Nama}\n`;
            if (appInfo.Developer.Link) detailText += `🔗 **Developer Link:** ${appInfo.Developer.Link}\n`;
            
            if (appInfo.ArmDevice.SupportedArchitecture || appInfo.ArmDevice.MinimalAndroid) {
                detailText += `\n📱 **System Requirements:**\n`;
                if (appInfo.ArmDevice.SupportedArchitecture) detailText += `• **Architecture:** ${appInfo.ArmDevice.SupportedArchitecture}\n`;
                if (appInfo.ArmDevice.MinimalAndroid) detailText += `• **Minimal Android:** ${appInfo.ArmDevice.MinimalAndroid}\n`;
            }
            
            if (appInfo.NamaPaket.ID || appInfo.NamaPaket.PlayStoreLink) {
                detailText += `\n📦 **Package Information:**\n`;
                if (appInfo.NamaPaket.ID) detailText += `• **Package ID:** ${appInfo.NamaPaket.ID}\n`;
                if (appInfo.NamaPaket.PlayStoreLink) detailText += `• **Play Store:** ${appInfo.NamaPaket.PlayStoreLink}\n`;
            }
            
            if (appInfo.DeskripsiApp) {
                detailText += `\n📝 **Description:**\n${appInfo.DeskripsiApp.substring(0, 300)}${appInfo.DeskripsiApp.length > 300 ? '...' : ''}\n`;
            }
            
            if (appInfo.DownloadLinks.MediaFire || appInfo.DownloadLinks.GoogleDrive) {
                detailText += `\n📥 **Download Links:**\n`;
                if (appInfo.DownloadLinks.MediaFire) detailText += `• **MediaFire:** ${appInfo.DownloadLinks.MediaFire}\n`;
                if (appInfo.DownloadLinks.GoogleDrive) detailText += `• **Google Drive:** ${appInfo.DownloadLinks.GoogleDrive}\n`;
            }
            
            detailText += `\n⚠️ **Security Notice:**\n• Always scan APK files before installation\n• Enable "Install from Unknown Sources" in settings\n• Install at your own risk\n\n> © Detailed app information`;

            await conn.sendMessage(from, {
                text: detailText,
            }, { quoted: fakevCard });

            // Send thumbnail if available
            if (appInfo.Thumbnail && appInfo.Thumbnail.startsWith('http')) {
                try {
                    await conn.sendMessage(from, {
                        image: { url: appInfo.Thumbnail },
                        caption: `🖼️ **${appInfo.NamaApp}** - App Thumbnail`
                    }, { quoted: fakevCard });
                } catch (imgError) {
                    console.log('Failed to send thumbnail:', imgError.message);
                }
            }

            await conn.sendMessage(from, {
                react: { text: '✅', key: mek.key }
            });

        } catch (error) {
            console.error('ModDetail error:', error);
            await conn.sendMessage(from, {
                react: { text: '❌', key: mek.key }
            });
            
            let errorMsg = '❌ Failed to get app details: ';
            if (error.message.includes('timeout')) {
                errorMsg += 'Request timeout. Please try again.';
            } else if (error.message.includes('network')) {
                errorMsg += 'Network error. Please check your connection.';
            } else {
                errorMsg += error.message || 'The app page might be unavailable.';
            }
            
            return reply(errorMsg);
        }
    }
};