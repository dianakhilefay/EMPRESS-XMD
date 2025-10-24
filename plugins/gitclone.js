// === gitclone.js ===
// Adapted from Noroshi bot for Malvin-Lite
const axios = require('axios');
const fakevCard = require('../lib/fakevcard');

module.exports = {
    pattern: "gitclone",
    desc: "Clone GitHub repositories, gists, and raw files",
    category: "downloader",
    react: "📂",
    filename: __filename,
    use: ".gitclone <github_url>",
    
    execute: async (conn, mek, m, { from, args, reply }) => {
        try {
            if (!args.length) {
                return reply(
                    `📂 **GitHub Cloner**\n\n` +
                    `**Usage:** \`.gitclone <github_url>\`\n\n` +
                    `**Supported URLs:**\n` +
                    `• Repository: \`github.com/user/repo\`\n` +
                    `• Gist: \`gist.github.com/user/id\`\n` +
                    `• Raw file: \`raw.githubusercontent.com/...\`\n\n` +
                    `**Examples:**\n` +
                    `• \`.gitclone https://github.com/nodejs/node\`\n` +
                    `• \`.gitclone https://gist.github.com/user/abc123\``
                );
            }

            const url = args[0];

            // Regex patterns for different GitHub URL types
            const regexRepo = /(?:https|git)(?::\/\/|@)github\.com[\/:]([^\/:]+)\/([^\/:]+)(?:\/tree\/[^\/]+|\/blob\/[^\/]+)?(?:\/(.+))?/i;
            const regexGist = /https:\/\/gist\.github\.com\/([^\/]+)\/([a-zA-Z0-9]+)/i;
            const regexRawGitHub = /https:\/\/raw\.githubusercontent\.com\/([^\/]+)\/([^\/]+)\/([^\/]+)\/(.+)/i;

            const isRepo = regexRepo.test(url);
            const isGist = regexGist.test(url);
            const isRawGitHub = regexRawGitHub.test(url);

            if (!isRepo && !isGist && !isRawGitHub) {
                return reply('❌ Invalid GitHub URL! Please provide a valid repository, gist, or raw file URL.');
            }

            await conn.sendMessage(from, {
                react: { text: '⏳', key: mek.key }
            });

            if (isRepo) {
                // Handle repository cloning
                let [, user, repo] = url.match(regexRepo) || [];
                repo = repo.replace(/.git$/, '');
                
                await reply('📥 Downloading repository... Please wait.');

                const downloadUrl = `https://api.github.com/repos/${user}/${repo}/zipball`;
                
                // Get filename from headers
                let filename;
                try {
                    const headResponse = await axios.head(downloadUrl);
                    const contentDisposition = headResponse.headers['content-disposition'];
                    filename = contentDisposition ? contentDisposition.match(/attachment; filename=(.*)/)?.[1] : `${repo}.zip`;
                } catch {
                    filename = `${repo}.zip`;
                }

                await conn.sendMessage(from, {
                    document: { url: downloadUrl },
                    fileName: filename || `${repo}.zip`,
                    mimetype: "application/zip",
                    caption: `📂 **Repository Downloaded**\n\n` +
                            `👤 **User:** ${user}\n` +
                            `📦 **Repository:** ${repo}\n` +
                            `🔗 **Source:** ${url}\n\n` +
                            `> © Downloaded by ${process.env.BOT_NAME || 'Malvin Lite'}`
                }, { quoted: fakevCard });

            } else if (isGist) {
                // Handle gist cloning
                let [, user, gistId] = url.match(regexGist) || [];
                
                await reply('📥 Downloading gist... Please wait.');

                const downloadUrl = `https://gist.github.com/${user}/${gistId}/download`;

                await conn.sendMessage(from, {
                    document: { url: downloadUrl },
                    fileName: `${gistId}.zip`,
                    mimetype: "application/zip",
                    caption: `📄 **Gist Downloaded**\n\n` +
                            `👤 **User:** ${user}\n` +
                            `🆔 **Gist ID:** ${gistId}\n` +
                            `🔗 **Source:** ${url}\n\n` +
                            `> © Downloaded by ${process.env.BOT_NAME || 'Malvin Lite'}`
                }, { quoted: fakevCard });

            } else if (isRawGitHub) {
                // Handle raw file download
                let [, user, repo, branch, filepath] = url.match(regexRawGitHub) || [];
                const filename = filepath.split('/').pop();
                
                await reply('📥 Downloading raw file... Please wait.');

                const downloadUrl = `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${filepath}`;

                await conn.sendMessage(from, {
                    document: { url: downloadUrl },
                    fileName: filename,
                    mimetype: "application/octet-stream",
                    caption: `📄 **Raw File Downloaded**\n\n` +
                            `👤 **User:** ${user}\n` +
                            `📦 **Repository:** ${repo}\n` +
                            `🌿 **Branch:** ${branch}\n` +
                            `📄 **File:** ${filename}\n` +
                            `🔗 **Source:** ${url}\n\n` +
                            `> © Downloaded by ${process.env.BOT_NAME || 'Malvin Lite'}`
                }, { quoted: fakevCard });
            }

            await conn.sendMessage(from, {
                react: { text: '✅', key: mek.key }
            });

        } catch (error) {
            console.error('Git clone error:', error);
            await conn.sendMessage(from, {
                react: { text: '❌', key: mek.key }
            });
            
            let errorMsg = '❌ Failed to clone repository: ';
            if (error.message.includes('404')) {
                errorMsg += 'Repository not found or private.';
            } else if (error.message.includes('403')) {
                errorMsg += 'Access denied. Repository might be private.';
            } else if (error.message.includes('rate limit')) {
                errorMsg += 'GitHub API rate limit exceeded. Try again later.';
            } else {
                errorMsg += error.message;
            }
            
            return reply(errorMsg);
        }
    }
};