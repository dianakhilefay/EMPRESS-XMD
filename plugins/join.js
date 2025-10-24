// === join.js ===
// Adapted from external bot for Malvin-Lite
// Join WhatsApp groups via invitation links
const fakevCard = require('../lib/fakevcard');

const linkRegex = /chat.whatsapp.com\/([0-9A-Za-z]{20,24})( [0-9]{1,3})?/i;

module.exports = {
    pattern: "join",
    desc: "Join WhatsApp groups via invitation link",
    category: "owner",
    react: "🔗",
    filename: __filename,
    use: ".join <group_link>",
    
    execute: async (conn, mek, m, { from, args, reply, isOwner }) => {
        try {
            // Allow if user is owner OR if message is from bot owner (fromMe)
            const isFromMe = mek.key.fromMe;
            if (!isOwner && !isFromMe) {
                return reply('❌ This command is restricted to bot owners only.');
            }

            if (!args.length) {
                return reply(
                    `🔗 **Join WhatsApp Group**\n\n` +
                    `🎯 **Usage:** \`.join <group_link>\`\n\n` +
                    `📝 **Example:**\n\`\`.join https://chat.whatsapp.com/ABC123...\`\`\n\n` +
                    `📋 **Requirements:**\n` +
                    `• Valid WhatsApp group invitation link\n` +
                    `• Bot owner privileges\n` +
                    `• Active group invitation\n\n` +
                    `⚠️ **Note:** This command is restricted to bot owners for security reasons.\n\n` +
                    `🔍 **Link format:** https://chat.whatsapp.com/[CODE]`
                );
            }

            const text = args.join(' ');
            const match = text.match(linkRegex);

            if (!match) {
                return reply(
                    `❌ **Invalid Group Link**\n\n` +
                    `The link format should be:\n\`https://chat.whatsapp.com/[CODE]\`\n\n` +
                    `📝 **Example of valid link:**\n\`https://chat.whatsapp.com/ABC123DEF456GHI789\`\n\n` +
                    `💡 **Tip:** Copy the complete invitation link from WhatsApp.`
                );
            }

            const [_, code] = match;

            await conn.sendMessage(from, {
                react: { text: '⏳', key: mek.key }
            });

            await reply(`🔗 **Attempting to join group...**\n\nProcessing invitation code: \`${code}\``);

            try {
                const result = await conn.groupAcceptInvite(code);
                
                await conn.sendMessage(from, {
                    text: `✅ **Successfully Joined Group!**\n\n` +
                          `🎉 **Status:** Group joined successfully\n` +
                          `🆔 **Group ID:** ${result}\n` +
                          `🔗 **Invitation Code:** ${code}\n\n` +
                          `💡 The bot is now a member of the group and ready to assist!\n\n` +
                          `> © Group Join Service`
                }, { quoted: fakevCard });

                await conn.sendMessage(from, {
                    react: { text: '✅', key: mek.key }
                });

            } catch (joinError) {
                console.error('Group join error:', joinError);
                
                let errorMsg = '❌ **Failed to join group:** ';
                if (joinError.message.includes('invite')) {
                    errorMsg += 'Invalid or expired invitation link.';
                } else if (joinError.message.includes('forbidden')) {
                    errorMsg += 'Bot is not allowed to join this group.';
                } else if (joinError.message.includes('not-found')) {
                    errorMsg += 'Group not found. Link might be invalid.';
                } else if (joinError.message.includes('gone')) {
                    errorMsg += 'Invitation link has expired.';
                } else if (joinError.message.includes('participant-limit-reached')) {
                    errorMsg += 'Group has reached maximum member limit.';
                } else {
                    errorMsg += joinError.message || 'Unknown error occurred.';
                }

                await conn.sendMessage(from, {
                    text: errorMsg + '\n\n🔍 **Please verify:**\n• Link is complete and valid\n• Invitation hasn\'t expired\n• Group allows new members\n• Bot isn\'t already in the group'
                }, { quoted: fakevCard });

                await conn.sendMessage(from, {
                    react: { text: '❌', key: mek.key }
                });
            }

        } catch (error) {
            console.error('Join command error:', error);
            await conn.sendMessage(from, {
                react: { text: '❌', key: mek.key }
            });
            
            return reply('❌ An unexpected error occurred while processing the join request. Please try again later.');
        }
    }
};