// === gmailprofile.js ===
// Adapted from external bot for Malvin-Lite
const axios = require('axios');
const cheerio = require('cheerio');
const fakevCard = require('../lib/fakevcard');

const gmailProfile = {
    check: async function(email) {
        try {
            const username = email.split('@')[0];
            const { data } = await axios.post('https://gmail-osint.activetk.jp/', 
                new URLSearchParams({ q: username, domain: 'gmail.com' }), {
                headers: { 
                    'Content-Type': 'application/x-www-form-urlencoded', 
                    'User-Agent': 'Postify/1.0.0' 
                }
            });
            
            const $ = cheerio.load(data);
            const text = $('pre').text();
            
            return {
                photoProfile: this.extract(text, /Custom profile picture !\s*=>\s*(.*)/, 'No photo'),
                email,
                lastEditProfile: this.extract(text, /Last profile edit : (.*)/),
                googleID: this.extract(text, /Gaia ID : (.*)/),
                userTypes: this.extract(text, /User types : (.*)/),
                googleChat: {
                    entityType: this.extract(text, /Entity Type : (.*)/),
                    customerID: this.extract(text, /Customer ID : (.*)/, 'No ID', true),
                },
                googlePlus: {
                    enterpriseUser: this.extract(text, /Entreprise User : (.*)/),
                },
                mapsData: {
                    profilePage: this.extract(text, /Profile page : (.*)/),
                },
                ipAddress: text.includes('Your IP has been blocked by Google') ? 'Blocked by Google' : 'Safe',
                calendar: text.includes('No public Google Calendar') ? 'None' : 'Available'
            };
        } catch (error) {
            console.error('Gmail profile error:', error);
            throw error;
        }
    },

    extract: function(text, regex, defaultValue = 'No data', checkNotFound = false) {
        const result = (text.match(regex) || [null, defaultValue])[1];
        if (!result) return defaultValue;
        const trimmed = result.trim();
        return checkNotFound && trimmed === 'Not found.' ? 'No data' : trimmed;
    }
};

module.exports = {
    pattern: "gmailprofile",
    desc: "Get detailed Gmail profile information",
    category: "tools",
    react: "📧",
    filename: __filename,
    use: ".gmailprofile <email@gmail.com>",
    
    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args.length) {
                return reply(
                    `📧 **Gmail Profile Analyzer**\n\n` +
                    `🎯 **Usage:** \`.gmailprofile <email@gmail.com>\`\n\n` +
                    `📝 **Example:**\n\`\`.gmailprofile john.doe@gmail.com\`\`\n\n` +
                    `🔍 **Information Retrieved:**\n` +
                    `• Profile picture status\n` +
                    `• Last profile edit date\n` +
                    `• Google ID (Gaia ID)\n` +
                    `• User account types\n` +
                    `• Google Chat information\n` +
                    `• Google+ enterprise status\n` +
                    `• Google Maps profile\n` +
                    `• Calendar availability\n` +
                    `• IP security status\n\n` +
                    `⚠️ **Note:** Only works with Gmail addresses (@gmail.com)`
                );
            }

            const email = args[0];
            
            if (!email.includes('@gmail.com')) {
                return reply('❌ Please provide a valid Gmail address (must end with @gmail.com)');
            }

            if (!email.match(/^[^\s@]+@gmail\.com$/)) {
                return reply('❌ Invalid email format. Please provide a valid Gmail address.');
            }

            await conn.sendMessage(from, {
                react: { text: '⏳', key: mek.key }
            });

            await reply(`📧 **Analyzing Gmail Profile...**\n\n🔍 **Email:** ${email}\n\nPlease wait while I gather information...`);

            const result = await gmailProfile.check(email);

            const profileInfo = `📧 **Gmail Profile Analysis**\n\n` +
                `✉️ **Email:** ${result.email}\n` +
                `🖼️ **Profile Picture:** ${result.photoProfile}\n` +
                `📅 **Last Profile Edit:** ${result.lastEditProfile}\n` +
                `🆔 **Google ID:** ${result.googleID}\n` +
                `👤 **User Types:** ${result.userTypes}\n\n` +
                `💬 **Google Chat Info:**\n` +
                `• Entity Type: ${result.googleChat.entityType}\n` +
                `• Customer ID: ${result.googleChat.customerID}\n\n` +
                `➕ **Google Plus:**\n` +
                `• Enterprise User: ${result.googlePlus.enterpriseUser}\n\n` +
                `🗺️ **Google Maps:**\n` +
                `• Profile Page: ${result.mapsData.profilePage}\n\n` +
                `🛡️ **Security Status:**\n` +
                `• IP Address: ${result.ipAddress}\n` +
                `• Calendar: ${result.calendar}\n\n` +
                `> © Gmail Profile Analyzer`;

            await conn.sendMessage(from, {
                text: profileInfo
            }, { quoted: fakevCard });

            await conn.sendMessage(from, {
                react: { text: '✅', key: mek.key }
            });

        } catch (error) {
            console.error('Gmail profile error:', error);
            await conn.sendMessage(from, {
                react: { text: '❌', key: mek.key }
            });
            
            let errorMsg = '❌ Gmail profile analysis failed: ';
            if (error.message.includes('timeout')) {
                errorMsg += 'Request timeout. Please try again.';
            } else if (error.message.includes('blocked')) {
                errorMsg += 'Service temporarily blocked. Try again later.';
            } else if (error.message.includes('network')) {
                errorMsg += 'Network error. Check your connection.';
            } else {
                errorMsg += 'Analysis service temporarily unavailable.';
            }
            
            return reply(errorMsg);
        }
    }
};