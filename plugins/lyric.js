// === lyric.js ===
// Adapted from external bot for Malvin-Lite
// plugin by Noureddine Ouafy
// scrape by NekoLabs
const axios = require('axios');
const fakevCard = require('../lib/fakevcard');

/**
 * Searches for lyrics on lrclib.net.
 * @param {string} title The title of the song to search for.
 * @returns {Promise<Object[]>} A promise that resolves to an array of song results.
 */
async function fetchLyrics(title) {
    if (!title) throw new Error('A song title is required.');
    
    // The API endpoint for searching lyrics.
    const url = `https://lrclib.net/api/search?q=${encodeURIComponent(title)}`;
    
    // Making the GET request to the API.
    const { data } = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
        },
        timeout: 30000
    });
    
    return data;
}

module.exports = {
    pattern: "lyric",
    desc: "Search for song lyrics by title",
    category: "search",
    react: "🎵",
    filename: __filename,
    use: ".lyric <song_title>",
    
    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args.length) {
                return reply(
                    `🎵 **Lyrics Search**\n\n` +
                    `🎯 **Usage:** \`.lyric <song_title>\`\n\n` +
                    `📝 **Examples:**\n` +
                    `• \`.lyric Faded\` - Search for "Faded" lyrics\n` +
                    `• \`.lyric Shape of You\` - Ed Sheeran's hit\n` +
                    `• \`.lyric Bohemian Rhapsody\` - Queen classic\n` +
                    `• \`.lyric Despacito\` - Luis Fonsi song\n\n` +
                    `🎼 **Features:**\n` +
                    `• Full song lyrics\n` +
                    `• Artist information\n` +
                    `• Album details (when available)\n` +
                    `• Synced lyrics support\n\n` +
                    `💡 **Tip:** Be specific with song titles for better results!`
                );
            }

            const songTitle = args.join(' ');

            await conn.sendMessage(from, {
                react: { text: '⏳', key: mek.key }
            });

            await reply(`🔍 **Searching for lyrics: "${songTitle}"**\n\nPlease wait while I find the song lyrics...`);

            // Fetch the lyric search results
            const results = await fetchLyrics(songTitle);

            // Handle the case where no results are found
            if (!results || results.length === 0) {
                return reply(`😔 **No lyrics found for "${songTitle}"**\n\nTry:\n• Different spelling\n• Adding artist name\n• Using the exact song title\n\n**Example:** \`.lyric Faded Alan Walker\``);
            }

            // Select the first (most likely) result
            const song = results[0];
            
            // Prioritize synced lyrics, but fall back to plain lyrics
            const lyricsText = song.syncedLyrics || song.plainLyrics;

            // Handle the case where the song entry exists but has no lyrics
            if (!lyricsText) {
                return reply(`😞 **Lyrics not available**\n\n**Song:** ${song.trackName || 'Unknown'}\n**Artist:** ${song.artistName || 'Unknown'}\n\nTry searching for a different version or check the spelling.`);
            }
            
            // Prepare song info
            let songInfo = `🎵 **Lyrics Found!**\n\n`;
            songInfo += `**🎧 Title:** ${song.trackName || 'Unknown'}\n`;
            songInfo += `**🎤 Artist:** ${song.artistName || 'Unknown'}\n`;
            if (song.albumName) songInfo += `**💿 Album:** ${song.albumName}\n`;
            if (song.duration) songInfo += `**⏱️ Duration:** ${Math.floor(song.duration / 60)}:${(song.duration % 60).toString().padStart(2, '0')}\n`;
            
            songInfo += `\n${'─'.repeat(30)}\n\n`;
            
            // Split lyrics into chunks if too long
            const maxLength = 3000; // WhatsApp message limit consideration
            const lyricsChunks = [];
            
            if (lyricsText.length > maxLength) {
                const lines = lyricsText.split('\n');
                let currentChunk = '';
                
                for (const line of lines) {
                    if ((currentChunk + line + '\n').length > maxLength) {
                        if (currentChunk) lyricsChunks.push(currentChunk.trim());
                        currentChunk = line + '\n';
                    } else {
                        currentChunk += line + '\n';
                    }
                }
                if (currentChunk) lyricsChunks.push(currentChunk.trim());
            } else {
                lyricsChunks.push(lyricsText);
            }

            // Send first chunk with song info
            const firstMessage = songInfo + lyricsChunks[0];
            await conn.sendMessage(from, {
                text: firstMessage + (lyricsChunks.length > 1 ? '\n\n🔄 **Continued in next message...**' : '\n\n> © Lyrics from LRCLib'),
            }, { quoted: fakevCard });

            // Send additional chunks if needed
            for (let i = 1; i < lyricsChunks.length; i++) {
                await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay between messages
                await conn.sendMessage(from, {
                    text: `🎵 **${song.trackName} (Part ${i + 1}/${lyricsChunks.length})**\n\n${'─'.repeat(30)}\n\n${lyricsChunks[i]}${i === lyricsChunks.length - 1 ? '\n\n> © Lyrics from LRCLib' : '\n\n🔄 **Continued...**'}`,
                }, { quoted: fakevCard });
            }

            await conn.sendMessage(from, {
                react: { text: '✅', key: mek.key }
            });

        } catch (error) {
            console.error('Lyrics search error:', error);
            await conn.sendMessage(from, {
                react: { text: '❌', key: mek.key }
            });
            
            let errorMsg = '❌ Lyrics search failed: ';
            if (error.message.includes('timeout')) {
                errorMsg += 'Request timeout. Please try again.';
            } else if (error.message.includes('network')) {
                errorMsg += 'Network error. Please check your connection.';
            } else if (error.message.includes('required')) {
                errorMsg += 'Please provide a song title to search for.';
            } else {
                errorMsg += error.message || 'Unknown error occurred.';
            }
            
            return reply(errorMsg);
        }
    }
};