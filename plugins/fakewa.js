// === fakewa.js ===
// Adapted from Noroshi bot for Malvin-Lite
const { createCanvas, loadImage } = require('canvas');
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const fs = require('fs');
const path = require('path');
const fakevCard = require('../lib/fakevcard');

module.exports = {
    pattern: "fakewa",
    desc: "Create a fake WhatsApp profile screenshot",
    category: "fun",
    react: "📱",
    filename: __filename,
    use: ".fakewa Name|Phone|Status",
    
    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            const text = args.join(' ');
            
            if (!text || !text.includes('|')) {
                return reply(
                    `🚩 Incorrect format.\n\n` +
                    `**Example:** \`.fakewa Malvin King|+1234567890|Busy\`\n\n` +
                    `💡 **Tip:** Reply to a profile picture for custom avatar.`
                );
            }

            // Split the input text by '|' and trim whitespace
            let [name, number, status] = text.split('|').map(v => v.trim());
            
            if (!name || !number) {
                return reply('❌ Name and number are required.');
            }
            
            status = status || 'Busy';

            await conn.sendMessage(from, {
                react: { text: '⏳', key: mek.key }
            });
            
            await reply('⏳ Creating Fake WhatsApp Profile...');

            let profilePicUrl;
            
            // Check if replying to an image for custom avatar
            const quotedMsg = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            
            if (quotedMsg && quotedMsg.imageMessage) {
                try {
                    // Download the quoted image
                    const stream = await downloadContentFromMessage(quotedMsg.imageMessage, "image");
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) {
                        buffer = Buffer.concat([buffer, chunk]);
                    }
                    
                    // Save temporarily
                    const tempPath = path.join(process.cwd(), 'temp_avatar.jpg');
                    fs.writeFileSync(tempPath, buffer);
                    profilePicUrl = tempPath;
                } catch (error) {
                    console.error('Error downloading avatar:', error);
                    profilePicUrl = 'https://telegra.ph/file/1ecdb5a0aee62ef17d7fc.jpg';
                }
            } else {
                // Try to get sender's profile picture
                try {
                    profilePicUrl = await conn.profilePictureUrl(mek.key.participant || mek.key.remoteJid, 'image');
                } catch {
                    profilePicUrl = 'https://telegra.ph/file/1ecdb5a0aee62ef17d7fc.jpg';
                }
            }

            // Load images
            const [avatar, background] = await Promise.all([
                loadImage(profilePicUrl),
                loadImage('https://files.catbox.moe/1zmbfd.jpg')
            ]);

            // Create canvas
            const canvas = createCanvas(background.width, background.height);
            const ctx = canvas.getContext('2d');

            // Draw background
            ctx.drawImage(background, 0, 0);

            // Draw circular avatar
            const avatarSize = 350;
            const avatarX = (canvas.width - avatarSize) / 2;
            const avatarY = 163;
            
            ctx.save();
            ctx.beginPath();
            ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
            ctx.restore();

            // Draw "Edit" text
            ctx.fillStyle = '#25D366';
            ctx.font = '25px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Edit', avatarX + avatarSize / 2, avatarY + avatarSize + 104);

            // Draw profile information
            const startX = 165;
            const startY = 710;
            const gapY = 150;
            const coverRectHeight = 80;
            const coverRectWidth = 850;
            const labelYOffset = 25;
            const valueYOffset = 70;

            const fields = [
                { label: 'Name', value: name },
                { label: 'About', value: status },
                { label: 'Phone', value: formatPhoneNumber(number) },
                { label: 'Link', value: 'WhatsApp' }
            ];

            fields.forEach((field, index) => {
                const currentY = startY + (index * gapY);
                
                // Cover old text
                ctx.fillStyle = '#111b21';
                ctx.fillRect(startX - 60, currentY, coverRectWidth, coverRectHeight);

                // Draw label
                ctx.textAlign = 'left';
                ctx.font = '30px Arial';
                ctx.fillStyle = '#a7a4a4';
                ctx.fillText(field.label, startX, currentY + labelYOffset);

                // Draw value
                ctx.fillStyle = '#ffffff';
                ctx.fillText(field.value, startX, currentY + valueYOffset);
            });

            // Helper function to format phone number
            function formatPhoneNumber(n) {
                if (n.startsWith('08')) n = '62' + n.slice(1);
                if (n.startsWith('62') && n.length >= 10) {
                    return `+62 ${n.slice(2, 5)}-${n.slice(5, 9)}-${n.slice(9)}`;
                } else if (n.startsWith('+')) {
                    return n;
                } else if (/^\d+$/.test(n)) {
                    return `+${n}`;
                } else {
                    return n;
                }
            }

            const buffer = canvas.toBuffer('image/png');
            
            await conn.sendMessage(from, {
                image: buffer,
                caption: `📱 **Fake WhatsApp Profile**\n\n` +
                        `👤 **Name:** ${name}\n` +
                        `📞 **Phone:** ${formatPhoneNumber(number)}\n` +
                        `📝 **Status:** ${status}\n\n` +
                        `> © Generated by ${process.env.BOT_NAME || 'Malvin Lite'}`
            }, { quoted: fakevCard });

            // Cleanup temp file if created
            if (profilePicUrl.includes('temp_avatar.jpg')) {
                try {
                    fs.unlinkSync(profilePicUrl);
                } catch {}
            }

            await conn.sendMessage(from, {
                react: { text: '✅', key: mek.key }
            });

        } catch (error) {
            console.error('[FAKEWA ERROR]', error);
            await conn.sendMessage(from, {
                react: { text: '❌', key: mek.key }
            });
            return reply(`❌ Failed to create fake profile: ${error.message}`);
        }
    }
};