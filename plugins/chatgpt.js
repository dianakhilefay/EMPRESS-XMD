// === chatgpt.js ===
// Adapted from external bot for Malvin-Lite
// instagram.com/noureddine_ouafy
// scrape by nekolabs
const axios = require("axios");
const fakevCard = require('../lib/fakevcard');

async function chatgpt2022(question, { model = 'gpt-3.5', reasoning_effort = 'medium' } = {}) {
    try {
        if (!question) throw new Error('❌ Question is required');

        // Try multiple APIs in order
        const apis = [
            {
                name: 'OpenAI-like API',
                url: 'https://api.openai-api.org/v1/chat/completions',
                payload: {
                    model: "gpt-3.5-turbo",
                    messages: [{ role: 'user', content: question }],
                    max_tokens: 1000,
                    temperature: 0.7
                },
                headers: {
                    'content-type': 'application/json',
                    'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
                    'origin': 'https://api.openai-api.org',
                    'referer': 'https://api.openai-api.org/'
                },
                parseResponse: (data) => data.choices?.[0]?.message?.content || data.message || null
            },
            {
                name: 'Alternative ChatGPT API',
                url: 'https://chatgpt-best-api.vercel.app/api/chat',
                payload: {
                    message: question,
                    model: 'gpt-3.5-turbo'
                },
                headers: {
                    'content-type': 'application/json',
                    'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'
                },
                parseResponse: (data) => data.response || data.text || data.message || null
            },
            {
                name: 'Backup GPT API',
                url: 'https://api.yanzgpt.my.id/v1/chat',
                payload: {
                    query: question,
                    model: 'gpt-3.5-turbo'
                },
                headers: {
                    'content-type': 'application/json',
                    'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'
                },
                parseResponse: (data) => data.result || data.response || data.answer || null
            }
        ];

        let lastError = null;

        for (const api of apis) {
            try {
                console.log(`Trying ${api.name}...`);
                const { data } = await axios.post(api.url, api.payload, {
                    headers: api.headers,
                    timeout: 30000
                });

                const text = api.parseResponse(data);
                if (text) {
                    console.log(`✅ Success with ${api.name}`);
                    return { reasoning: '', text };
                }
            } catch (error) {
                console.log(`❌ ${api.name} failed:`, error.response?.status || error.message);
                lastError = error;
                continue;
            }
        }

        throw lastError || new Error('All ChatGPT APIs are currently unavailable');

    } catch (error) {
        throw new Error(String(error.response?.data?.message || error.message || error));
    }
}

module.exports = {
    pattern: "chatgpt",
    desc: "Chat with ChatGPT AI assistant",
    category: "ai",
    react: "🤖",
    filename: __filename,
    use: ".chatgpt <question>",
    
    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args.length) {
                return reply(
                    `🤖 **ChatGPT AI Assistant**\n\n` +
                    `🎯 **Usage:** \`.chatgpt <question>\`\n\n` +
                    `📝 **Examples:**\n` +
                    `• \`.chatgpt What is artificial intelligence?\`\n` +
                    `• \`.chatgpt How to learn programming?\`\n` +
                    `• \`.chatgpt Write a poem about love\`\n` +
                    `• \`.chatgpt Explain quantum physics simply\`\n\n` +
                    `🧠 **Features:**\n` +
                    `• GPT-5 powered responses\n` +
                    `• Advanced reasoning capabilities\n` +
                    `• Natural conversation flow\n` +
                    `• Wide knowledge base\n\n` +
                    `⚡ **Model:** GPT-5 with medium reasoning effort\n` +
                    `💡 **Tip:** Ask detailed questions for better responses!`
                );
            }

            const question = args.join(' ');

            await conn.sendMessage(from, {
                react: { text: '⏳', key: mek.key }
            });

            await reply(`🤖 **ChatGPT is thinking...**\n\n💭 **Your question:** ${question}\n\nPlease wait while I process your request...`);

            const response = await chatgpt2022(question, { model: 'gpt-5' });
            let replyMsg = response.text || "❌ No response received from ChatGPT.";

            // If response is too long, split into chunks
            const maxLength = 4000;
            if (replyMsg.length > maxLength) {
                const chunks = [];
                let currentChunk = '';
                const sentences = replyMsg.split('. ');
                
                for (const sentence of sentences) {
                    if ((currentChunk + sentence + '. ').length > maxLength) {
                        if (currentChunk) chunks.push(currentChunk.trim());
                        currentChunk = sentence + '. ';
                    } else {
                        currentChunk += sentence + '. ';
                    }
                }
                if (currentChunk) chunks.push(currentChunk.trim());

                // Send first chunk
                await conn.sendMessage(from, {
                    text: `🤖 **ChatGPT Response (Part 1/${chunks.length}):**\n\n${chunks[0]}\n\n${chunks.length > 1 ? '🔄 **Continued in next message...**' : '> © Powered by GPT-5'}`,
                }, { quoted: fakevCard });

                // Send remaining chunks
                for (let i = 1; i < chunks.length; i++) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    await conn.sendMessage(from, {
                        text: `🤖 **ChatGPT Response (Part ${i + 1}/${chunks.length}):**\n\n${chunks[i]}\n\n${i === chunks.length - 1 ? '> © Powered by GPT-5' : '🔄 **Continued...**'}`,
                    }, { quoted: fakevCard });
                }
            } else {
                await conn.sendMessage(from, {
                    text: `🤖 **ChatGPT Response:**\n\n${replyMsg}\n\n> © Powered by GPT-5`,
                }, { quoted: fakevCard });
            }

            await conn.sendMessage(from, {
                react: { text: '✅', key: mek.key }
            });

        } catch (error) {
            console.error('ChatGPT error:', error);
            await conn.sendMessage(from, {
                react: { text: '❌', key: mek.key }
            });
            
            let errorMsg = '❌ ChatGPT request failed: ';
            if (error.message.includes('timeout')) {
                errorMsg += 'Request timeout. The AI might be busy.';
            } else if (error.message.includes('network')) {
                errorMsg += 'Network error. Please check your connection.';
            } else if (error.message.includes('required')) {
                errorMsg += 'Please provide a question to ask ChatGPT.';
            } else if (error.response?.status === 429) {
                errorMsg += 'Rate limit exceeded. Please wait before trying again.';
            } else {
                errorMsg += error.message || 'AI service temporarily unavailable.';
            }
            
            return reply(errorMsg);
        }
    }
};