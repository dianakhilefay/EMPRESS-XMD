// plugins/tovn.js
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const fakevCard = require('../lib/fakevcard');

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

module.exports = {
  pattern: "tovn",
  desc: "Convert video or audio to voice note",
  react: "🎤",
  category: "utility",
  filename: __filename,
  use: ".tovn [reply to video or audio]",

  execute: async (conn, message, m, { from }) => {
    const sendMessageWithContext = async (text, quoted = message) => {
      return conn.sendMessage(
        from,
        {
          text,
          contextInfo: {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363402507750390@newsletter",
              newsletterName: "ᴍᴀʟᴠɪɴ ᴛᴇᴄʜ🪀",
              serverMessageId: 200,
            },
          },
        },
        { quoted: fakevCard }
      );
    };

    try {
      // 1) Use replied message if exists, otherwise current message
      const quotedMsg =
        message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const target = quotedMsg || message.message;

      if (!target) {
        return await sendMessageWithContext(
          "❌ Please reply to a video or audio with `.tovn`"
        );
      }

      // 2) Detect media type & node
      let mediaNode = null;
      let mediaType = null;
      if (target.videoMessage) {
        mediaNode = target.videoMessage;
        mediaType = "video";
      } else if (target.audioMessage) {
        mediaNode = target.audioMessage;
        mediaType = "audio";
      } else if (target.documentMessage && 
                 (target.documentMessage.mimetype?.includes('video') || 
                  target.documentMessage.mimetype?.includes('audio'))) {
        mediaNode = target.documentMessage;
        mediaType = "document";
      } else {
        return await sendMessageWithContext(
          "❌ Please reply to a video or audio with `.tovn`"
        );
      }

      // 3) React
      if (module.exports.react) {
        try {
          await conn.sendMessage(from, {
            react: { text: module.exports.react, key: message.key },
          });
        } catch {}
      }

      // 4) Download media
      let buffer;
      try {
        const stream = await downloadContentFromMessage(mediaNode, mediaType);
        let _buf = Buffer.from([]);
        for await (const chunk of stream) {
          _buf = Buffer.concat([_buf, chunk]);
        }
        buffer = _buf;
      } catch (e) {
        console.error("Download error:", e);
        return await sendMessageWithContext(
          "❌ Failed to download media. Try replying to a valid file."
        );
      }

      if (!buffer || buffer.length === 0) {
        return await sendMessageWithContext(
          "❌ Downloaded media is empty or too large."
        );
      }

      // 5) Convert to voice note
      let voiceBuffer;
      try {
        voiceBuffer = await convertToVoiceNote(buffer);
      } catch (e) {
        console.error("Voice conversion error:", e);
        return await sendMessageWithContext(
          "❌ Failed to convert to voice note. Please try with a different file."
        );
      }

      // 6) Send voice note
      await conn.sendMessage(from, {
        audio: voiceBuffer,
        mimetype: 'audio/ogg; codecs=opus',
        ptt: true
      }, { quoted: fakevCard });

      // 7) Reply with result
      await sendMessageWithContext(
        `*${mediaType.toUpperCase()} Converted Successfully*\n\n` +
        `*sɪᴢᴇ:* ${formatBytes(buffer.length)}\n` +
        `*ᴛʏᴘᴇ:* VOICE NOTE\n\n` +
        `> © ᴄᴏɴᴠᴇʀᴛᴇᴅ ʙʏ ᴍᴀʟᴠɪɴ-ʟɪᴛᴇ 🎤`
      );
    } catch (err) {
      console.error("ToVN execution error:", err);
      await sendMessageWithContext(
        `⚠️ Error: ${err.message || "Failed to process media"}`
      );
    }
  },
};

/**
 * Convert audio/video to voice note format using FFmpeg
 * @param {Buffer} buffer - Media buffer
 * @returns {Promise<Buffer>} - Voice note buffer in OGG format
 */
async function convertToVoiceNote(buffer) {
  const inputPath = path.join(os.tmpdir(), `tovn_input_${crypto.randomBytes(6).toString('hex')}`);
  const outputPath = path.join(os.tmpdir(), `tovn_output_${crypto.randomBytes(6).toString('hex')}.ogg`);

  // Write input buffer to temp file
  fs.writeFileSync(inputPath, buffer);

  try {
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .on("error", reject)
        .on("end", () => resolve(true))
        .addOutputOptions([
          "-c:a", "libopus",
          "-b:a", "128k",
          "-vn",
          "-f", "ogg"
        ])
        .toFormat("ogg")
        .save(outputPath);
    });

    // Read output and cleanup
    const voiceBuffer = fs.readFileSync(outputPath);
    
    // Cleanup temp files
    try {
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    } catch {}

    return voiceBuffer;

  } catch (error) {
    // Cleanup on error
    try {
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    } catch {}
    
    throw new Error(`FFmpeg processing failed: ${error.message}`);
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (
    parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  );
            }
