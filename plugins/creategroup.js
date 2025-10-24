// === creategroup.js ===
// Adapted from Noroshi bot for Malvin-Lite
const fakevCard = require('../lib/fakevcard');

module.exports = {
    pattern: "creategroup",
    desc: "Create a new WhatsApp group",
    category: "group",
    react: "👥",
    filename: __filename,
    use: ".creategroup <group name>",
    
    execute: async (conn, mek, m, { from, args, reply, sender, isCreator }) => {
        try {
            // Check if user is bot owner/creator
            const botJid = conn.user.id;
            const botPhoneNumber = botJid.includes(':') ? botJid.split(':')[0] : botJid.split('@')[0];
            const senderPhoneNumber = sender.includes(':') ? sender.split(':')[0] : sender.split('@')[0];
            const isBotOwner = botPhoneNumber === senderPhoneNumber;

            // Check owner permissions from env
            let owners = [];
            if (process.env.OWNER_NUMBER) {
                owners = process.env.OWNER_NUMBER.split(",").map(num => num.trim());
            }
            const isOwner = isBotOwner || owners.includes(senderPhoneNumber);

            if (!isOwner) {
                return reply('❌ Only the bot owner can create groups.');
            }

            if (!args.length) {
                return reply(
                    `👥 **Create Group**\n\n` +
                    `**Usage:** \`.creategroup <group name>\`\n\n` +
                    `**Example:** \`.creategroup My Cool Group\`\n\n` +
                    `💡 You will be added as admin automatically.`
                );
            }

            const groupName = args.join(' ').trim();
            
            if (groupName.length < 3) {
                return reply('❌ Group name must be at least 3 characters long.');
            }

            if (groupName.length > 50) {
                return reply('❌ Group name must be less than 50 characters long.');
            }

            await conn.sendMessage(from, {
                react: { text: '⏳', key: mek.key }
            });

            await reply('⏳ Creating group...');

            // Create the group
            const group = await conn.groupCreate(groupName, [sender]);
            
            // Debug log to see the actual group object structure
            console.log('🔍 Group creation result:', group);
            
            // The group ID might be in different properties depending on Baileys version
            const groupId = group?.gid || group?.id || group?.jid || group;
            
            if (!groupId) {
                console.error('❌ Group object:', JSON.stringify(group, null, 2));
                throw new Error('Failed to create group - no group ID returned');
            }

            // Get group invite link
            const inviteCode = await conn.groupInviteCode(groupId);
            const inviteUrl = 'https://chat.whatsapp.com/' + inviteCode;

            // Send success message
            const successMessage = `✅ **Group Created Successfully!**\n\n` +
                                  `👥 **Name:** ${groupName}\n` +
                                  `🆔 **Group ID:** \`${groupId}\`\n` +
                                  `🔗 **Invite Link:** ${inviteUrl}\n\n` +
                                  `🎉 You have been added as group admin!\n\n` +
                                  `> © Created by ${process.env.BOT_NAME || 'Malvin Lite'}`;

            await conn.sendMessage(from, {
                text: successMessage,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: "120363402507750390@newsletter",
                        newsletterName: "ᴍᴀʟᴠɪɴ ᴛᴇᴄʜ🪀",
                        serverMessageId: 200
                    },
                    externalAdReply: {
                        title: "Group Created!",
                        body: `${groupName} - ${groupId}`,
                        thumbnailUrl: "https://telegra.ph/file/1ecdb5a0aee62ef17d7fc.jpg",
                        sourceUrl: inviteUrl,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: fakevCard });

            // Send welcome message to the new group
            setTimeout(async () => {
                try {
                    const welcomeMsg = `🎉 **Welcome to ${groupName}!**\n\n` +
                                     `👋 This group was created using ${process.env.BOT_NAME || 'Malvin Lite'}\n\n` +
                                     `📋 **Group Rules:**\n` +
                                     `• Be respectful to all members\n` +
                                     `• No spam or inappropriate content\n` +
                                     `• Follow WhatsApp community guidelines\n\n` +
                                     `🤖 Type \`.menu\` to see available bot commands!\n\n` +
                                     `> Enjoy your new group! 🚀`;

                    await conn.sendMessage(groupId, {
                        text: welcomeMsg,
                        contextInfo: {
                            forwardingScore: 999,
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: "120363402507750390@newsletter",
                                newsletterName: "ᴍᴀʟᴠɪɴ ᴛᴇᴄʜ🪀",
                                serverMessageId: 200
                            }
                        }
                    });
                } catch (error) {
                    console.error('Error sending welcome message:', error);
                }
            }, 2000);

            await conn.sendMessage(from, {
                react: { text: '✅', key: mek.key }
            });

            console.log(`✅ Group created: ${groupId} | Name: ${groupName} | Creator: ${sender}`);

        } catch (error) {
            console.error('Create group error:', error);
            await conn.sendMessage(from, {
                react: { text: '❌', key: mek.key }
            });
            
            let errorMsg = '❌ Failed to create group: ';
            
            if (error.message.includes('not-authorized')) {
                errorMsg += 'Bot does not have permission to create groups.';
            } else if (error.message.includes('rate-limit')) {
                errorMsg += 'Too many groups created recently. Try again later.';
            } else if (error.message.includes('invalid-parameter')) {
                errorMsg += 'Invalid group name. Use only letters, numbers, and spaces.';
            } else {
                errorMsg += error.message;
            }
            
            return reply(errorMsg);
        }
    }
};