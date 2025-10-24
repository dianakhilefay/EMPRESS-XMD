// === translate.js ===
// Adapted from external bot for Malvin-Lite
// INSTAGRAM: instagram.com/noureddine_ouafy
const axios = require('axios');
const fakevCard = require('../lib/fakevcard');

async function getLangList() {
    try {
        const res = await axios.get('https://translate.google.com/translate_a/l?client=webapp&sl=auto&tl=en&v=1.0&hl=en&pv=1&tk=&source=bh&ssel=0&tsel=0&kc=1&tk=626515.626515&q=');
        return res.data.tl;
    } catch (error) {
        return {};
    }
}

async function translate(query = '', lang) {
    if (!query.trim()) return '';

    const url = new URL('https://translate.googleapis.com/translate_a/single');
    url.searchParams.append('client', 'gtx');
    url.searchParams.append('sl', 'auto');
    url.searchParams.append('tl', lang);
    url.searchParams.append('dt', 't');
    url.searchParams.append('q', query);

    try {
        const res = await axios.get(url.href);
        const json = res.data;
        if (json && json[0]) {
            return [json[0].map(item => item[0].trim()).join('\n'), json[2]];
        } else {
            return ['Translation failed', 'auto'];
        }
    } catch (error) {
        throw error;
    }
}

module.exports = {
    pattern: "translate",
    desc: "Translate text to any language (default: Arabic)",
    category: "tools",
    react: "🌐",
    filename: __filename,
    use: ".translate <lang> <text> | .translate <lang> (reply to message)",
    
    execute: async (conn, mek, m, { from, args, reply, quoted }) => {
        try {
            let lang, text;

            // Check if replying to a message
            const quotedMsg = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            
            if (args.length >= 2) {
                // Direct text provided: .translate fr Hello World
                lang = args[0] || 'ar';
                text = args.slice(1).join(' ');
            } else if (args.length === 1 && quotedMsg) {
                // Reply to message: .translate fr (reply to message)
                lang = args[0] || 'ar';
                text = quotedMsg.conversation || 
                       quotedMsg.extendedTextMessage?.text || 
                       quotedMsg.imageMessage?.caption || 
                       quotedMsg.videoMessage?.caption || '';
            } else if (quoted && quoted.text) {
                // Fallback: using quoted parameter
                lang = args[0] || 'ar';
                text = quoted.text;
            } else {
                return reply(
                    `🌐 **Universal Translator**\n\n` +
                    `🎯 **Two Ways to Use:**\n\n` +
                    `**1️⃣ Direct Translation:**\n` +
                    `\`.translate ar Hello World\`\n\n` +
                    `**2️⃣ Reply to Message:**\n` +
                    `• Reply to any message\n` +
                    `• Type: \`.translate fr\`\n\n` +
                    `📝 **Examples:**\n` +
                    `• \`.translate ar Hello, how are you?\`\n` +
                    `• \`.translate fr Good morning\`\n` +
                    `• Reply + \`.translate es\`\n` +
                    `• Reply + \`.translate de\`\n\n` +
                    `🔤 **Popular Language Codes:**\n` +
                    `• \`ar\` - Arabic • \`en\` - English\n` +
                    `• \`fr\` - French • \`es\` - Spanish\n` +
                    `• \`de\` - German • \`it\` - Italian\n` +
                    `• \`pt\` - Portuguese • \`ru\` - Russian\n` +
                    `• \`zh\` - Chinese • \`ja\` - Japanese\n` +
                    `• \`ko\` - Korean • \`hi\` - Hindi\n\n` +
                    `✅ **Works with:** Text, Image captions, Video captions`
                );
            }

            if (!text || !text.trim()) {
                if (args.length === 1 && !quotedMsg) {
                    return reply(`❌ **No message to translate**\n\nYou provided language code "${args[0]}" but didn't reply to any message.\n\n💡 **How to use:**\n• Reply to any message\n• Then type: \`.translate ${args[0]}\``);
                }
                return reply('❌ Please provide text to translate or reply to a message with text.');
            }

            await conn.sendMessage(from, {
                react: { text: '⏳', key: mek.key }
            });

            await reply(`🌐 **Translating to ${lang.toUpperCase()}...**\n\n💭 **Original text:** ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}\n\nPlease wait...`);

            const result = await translate(text.trim(), lang);
            const supportedLangs = Object.keys(await getLangList());

            if (!supportedLangs.includes(lang) && supportedLangs.length > 0) {
                return await conn.sendMessage(from, {
                    text: `❌ **Language "${lang}" not supported**\n\n` +
                          `🎯 **Example:** \`.translate ar Hello\`\n\n` +
                          `🔤 **Available languages:** ${supportedLangs.slice(0, 20).join(', ')}` +
                          `${supportedLangs.length > 20 ? '...' : ''}\n\n` +
                          `💡 Use common codes like: ar, en, fr, es, de, it, pt, ru, zh, ja, ko, hi`
                }, { quoted: fakevCard });
            }

            const translation = result[0] ? result[0].trim() : 'Translation failed';
            const detectedLang = result[1] || 'auto';

            await conn.sendMessage(from, {
                text: `🌐 **Translation Complete**\n\n` +
                      `🔤 **From:** ${detectedLang.toUpperCase()} ➜ **To:** ${lang.toUpperCase()}\n\n` +
                      `📝 **Original:**\n${text}\n\n` +
                      `✅ **Translation:**\n${translation}\n\n` +
                      `> © Universal Translator`
            }, { quoted: fakevCard });

            await conn.sendMessage(from, {
                react: { text: '✅', key: mek.key }
            });

        } catch (error) {
            console.error('Translation error:', error);
            await conn.sendMessage(from, {
                react: { text: '❌', key: mek.key }
            });
            
            let errorMsg = '❌ Translation failed: ';
            if (error.message.includes('timeout')) {
                errorMsg += 'Request timeout. Please try again.';
            } else if (error.message.includes('network')) {
                errorMsg += 'Network error. Check your connection.';
            } else {
                errorMsg += 'Translation service temporarily unavailable.';
            }
            
            return reply(errorMsg);
        }
    }
};