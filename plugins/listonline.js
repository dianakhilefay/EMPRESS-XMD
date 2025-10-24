// === listonline.js ===
// Adapted from external bot for Malvin-Lite
// List online group members
const fakevCard = require('../lib/fakevcard');

module.exports = {
    pattern: "listonline",
    desc: "List online users in the group",
    category: "group",
    react: "👥",
    filename: __filename,
    use: ".listonline",
    
    execute: async (conn, mek, m, { from, reply, isGroup, isAdmins, isBotAdmin }) => {
        try {
            if (!isGroup) {
                return reply('❌ This command can only be used in groups.');
            }

            // Note: Removed admin check to allow all members to use this command
            // if (!isAdmins && !isBotAdmin) {
            //     return reply('❌ This command requires admin privileges.');
            // }

            await conn.sendMessage(from, {
                react: { text: '⏳', key: mek.key }
            });

            const groupId = from;

            try {
                // Try to get online users from store
                let onlineUsers = [];
                
                // First try: check if conn.chats exists and has the group
                if (conn.chats && conn.chats[groupId]) {
                    const chatData = conn.chats[groupId];
                    
                    // Try to extract participants from messages
                    if (chatData.messages && typeof chatData.messages === 'object') {
                        const messages = Object.values(chatData.messages);
                        onlineUsers = messages
                            .map(msg => msg.key?.participant)
                            .filter(Boolean);
                    }
                }
                
                // Second try: use fetchGroupMetadata to get all participants
                if (onlineUsers.length === 0) {
                    try {
                        const groupMetadata = await conn.groupMetadata(groupId);
                        // Since we can't reliably detect online status, show all participants
                        onlineUsers = groupMetadata.participants.map(p => p.id);
                    } catch (error) {
                        console.error('Error fetching group metadata:', error);
                    }
                }
                
                // Remove duplicates
                const uniqueOnline = [...new Set(onlineUsers)];
                
                if (uniqueOnline.length === 0) {
                    return reply('👥 **No users detected**\n\nThis might be because:\n• The group has limited activity\n• Bot doesn\'t have message history\n• Technical error occurred');
                }

                let message = `👥 **Active Users in Group**\n\n`;
                message += `📊 **Total Users:** ${uniqueOnline.length} members\n\n`;
                message += `┌─〔 Group Members 〕\n`;
                message += uniqueOnline.map((v, i) => `├ ${i + 1}. @${v.replace(/@.+/, '')}`).join('\n');
                message += '\n└────\n\n';
                message += '💡 **Note:** This shows group members. Online status detection is limited by WhatsApp.\n';
                message += '⏱️ **Updated:** ' + new Date().toLocaleString();

                await conn.sendMessage(from, {
                    text: message,
                    contextInfo: { mentionedJid: uniqueOnline }
                }, { quoted: fakevCard });

                await conn.sendMessage(from, {
                    react: { text: '✅', key: mek.key }
                });

            } catch (dataError) {
                console.error('Data retrieval error:', dataError);
                return reply('❌ **Failed to retrieve users**\n\nPossible reasons:\n• Bot lacks necessary permissions\n• Group data is not accessible\n• Technical error occurred\n\nTry again later or check bot permissions.');
            }

        } catch (error) {
            console.error('ListOnline error:', error);
            await conn.sendMessage(from, {
                react: { text: '❌', key: mek.key }
            });
            
            return reply('❌ An error occurred while fetching online users. Please try again later.');
        }
    }
};