// === aimusic.js ===
// Adapted from external bot for Malvin-Lite
// plugin by noureddine ouafy
// scrape by rynn-stuff
const axios = require('axios');
const fakevCard = require('../lib/fakevcard');

module.exports = {
    pattern: "aimusic",
    desc: "Generate AI music with lyrics and composition",
    category: "ai",
    react: "🎵",
    filename: __filename,
    use: ".aimusic <description> | <tags>",
    
    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args.length) {
                return reply(
                    `🎵 **AI Music Generator**\n\n` +
                    `🎯 **Usage:** \`.aimusic <description> | <tags>\`\n\n` +
                    `📝 **Format:** \`<song description> | <music tags>\`\n\n` +
                    `🎼 **Examples:**\n` +
                    `• \`.aimusic a song about a lonely robot in space | cinematic, ambient\`\n` +
                    `• \`.aimusic love ballad about summer nights | pop, acoustic, romantic\`\n` +
                    `• \`.aimusic epic battle theme | rock, orchestral, intense\`\n\n` +
                    `🎨 **Popular Tags:** pop, rock, jazz, classical, ambient, electronic, acoustic, cinematic\n\n` +
                    `⏱️ **Processing:** Takes 2-5 minutes to generate complete song\n` +
                    `🎧 **Output:** High-quality WAV audio file`
                );
            }

            // Parse input
            const text = args.join(' ');
            let prompt = text;
            let tags = 'pop, acoustic, happy'; // Default tags
            
            if (text.includes('|')) {
                const parts = text.split('|');
                prompt = parts[0].trim();
                tags = parts[1].trim();
            }

            if (!prompt) {
                return reply(
                    `❌ **Invalid Format**\n\n` +
                    `**Correct usage:** \`.aimusic <description> | <tags>\`\n\n` +
                    `**Example:** \`.aimusic a song about love | romantic, pop\``
                );
            }

            await conn.sendMessage(from, {
                react: { text: '⏳', key: mek.key }
            });

            // Step 1: Generate Lyrics
            await reply('✍️ **Step 1/2:** Generating song lyrics...');

            const { data: lyricsResponse } = await axios.get('https://8pe3nv3qha.execute-api.us-east-1.amazonaws.com/default/llm_chat', {
                params: {
                    query: JSON.stringify([
                        {
                            role: 'system',
                            content: 'You are a professional lyricist AI trained to write poetic and rhythmic song lyrics. Respond with lyrics only, using [verse], [chorus], [bridge], and [instrumental] or [inst] tags to structure the song. Use only the tag (e.g., [verse]) without any numbering or extra text (e.g., do not write [verse 1], [chorus x2], etc). Do not add explanations, titles, or any other text outside of the lyrics. Focus on vivid imagery, emotional flow, and strong lyrical rhythm. Refrain from labeling genre or giving commentary. Respond in clean plain text, exactly as if it were a song lyric sheet.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ]),
                    link: 'writecream.com'
                },
                timeout: 30000
            });

            const lyrics = lyricsResponse.response_content;
            if (!lyrics) {
                return reply('❌ Failed to generate lyrics. The AI might be busy. Please try again.');
            }

            // Step 2: Generate Music
            await reply(`🎼 **Step 2/2:** Lyrics generated! Now composing music with tags: **${tags}**\n\nThis may take a few minutes... ⏳`);

            const session_hash = Math.random().toString(36).substring(2);
            
            // Join the processing queue on the Hugging Face Space
            await axios.post(`https://ace-step-ace-step.hf.space/gradio_api/queue/join?`, {
                data: [240, tags, lyrics, 60, 15, 'euler', 'apg', 10, '', 0.5, 0, 3, true, false, true, '', 0, 0, false, 0.5, null, 'none'],
                event_data: null,
                fn_index: 11,
                trigger_id: 45,
                session_hash: session_hash
            }, {
                timeout: 30000
            });

            // Poll the data endpoint until the process is complete
            let audioUrl;
            const maxAttempts = 60; // Poll for a maximum of 2 minutes (60 * 2s)
            
            for (let i = 0; i < maxAttempts; i++) {
                await new Promise(res => setTimeout(res, 2000)); // Wait 2 seconds between checks

                const { data: queueData } = await axios.get(`https://ace-step-ace-step.hf.space/gradio_api/queue/data?session_hash=${session_hash}`, {
                    timeout: 20000
                });
                
                // The response is a stream of server-sent events, we look for the completion message
                const lines = queueData.split('\n\n');
                for (const line of lines) {
                    if (line.startsWith('data:')) {
                        try {
                            const d = JSON.parse(line.substring(6));
                            if (d.msg === 'process_completed') {
                                audioUrl = d.output.data[0].url;
                                break;
                            } else if (d.msg === 'process_failed') {
                                return reply('❌ Music generation failed in the processing queue. Please try again.');
                            }
                        } catch (parseError) {
                            // Continue if JSON parsing fails
                            continue;
                        }
                    }
                }
                if (audioUrl) break; // Exit loop if we have the URL
                
                // Send progress update every 20 seconds
                if (i > 0 && i % 10 === 0) {
                    await reply(`🎵 Still processing... (${Math.round((i/maxAttempts)*100)}% estimated)`);
                }
            }

            if (!audioUrl) {
                return reply('⏰ Music generation timed out. The AI service might be overloaded. Please try again later.');
            }

            // Step 3: Send the final audio file
            await conn.sendMessage(from, {
                audio: { url: audioUrl },
                fileName: 'ai_music.wav',
                mimetype: 'audio/wav',
                caption: `🎵 **AI Music Generated!**\n\n` +
                        `📝 **Description:** ${prompt}\n` +
                        `🎼 **Tags:** ${tags}\n` +
                        `🤖 **Generator:** AI Music Composer\n` +
                        `🎧 **Format:** High-Quality WAV\n\n` +
                        `> © Generated by ${process.env.BOT_NAME || 'Malvin Lite'}`
            }, { quoted: fakevCard });

            await conn.sendMessage(from, {
                react: { text: '✅', key: mek.key }
            });

        } catch (error) {
            console.error('AI Music error:', error);
            await conn.sendMessage(from, {
                react: { text: '❌', key: mek.key }
            });
            
            let errorMsg = '❌ Music generation failed: ';
            if (error.message.includes('timeout')) {
                errorMsg += 'Request timeout. The AI service might be busy.';
            } else if (error.message.includes('network')) {
                errorMsg += 'Network error. Please check your connection.';
            } else if (error.response?.status === 429) {
                errorMsg += 'Rate limit exceeded. Please try again later.';
            } else {
                errorMsg += error.message || 'Unknown error occurred.';
            }
            
            return reply(errorMsg + '\n\nPlease try again later or with a simpler prompt.');
        }
    }
};