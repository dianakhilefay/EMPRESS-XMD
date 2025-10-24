// plugins/sticker.js
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const { gifToSticker } = require("../lib/sticker-utils");
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
  pattern: "sticker",
  desc: "Convert media to sticker",
  react: "🎭",
  category: "utility",
  filename: __filename,
  use: ".sticker [reply to media or send media with caption]",

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
          "❌ Please reply to an image, video, or GIF with `.sticker`"
        );
      }

      // 2) Detect media type & node
      let mediaNode = null;
      let mediaType = null;
      if (target.imageMessage) {
        mediaNode = target.imageMessage;
        mediaType = "image";
      } else if (target.videoMessage) {
        mediaNode = target.videoMessage;
        mediaType = "video";
      } else if (target.audioMessage) {
        return await sendMessageWithContext(
          "❌ Audio files cannot be converted to stickers"
        );
      } else if (target.documentMessage) {
        mediaNode = target.documentMessage;
        mediaType = "document";
      } else {
        return await sendMessageWithContext(
          "❌ Please reply to an image, video, or GIF with `.sticker`"
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

      // 5) Process to sticker
      let stickerBuffer;
      try {
        if (mediaType === "video" || 
            (mediaType === "document" && 
             (mediaNode.mimetype?.includes('gif') || mediaNode.fileName?.endsWith('.gif')))) {
          // Use existing gifToSticker for animated content
          stickerBuffer = await gifToSticker(buffer);
        } else {
          // Use custom function for static images
          stickerBuffer = await imageToSticker(buffer, mediaType);
        }
      } catch (e) {
        console.error("Sticker conversion error:", e);
        return await sendMessageWithContext(
          "❌ Failed to convert media to sticker. Please try with a different file."
        );
      }

      // 6) Send sticker
      await conn.sendMessage(from, {
        sticker: stickerBuffer
      }, { quoted: fakevCard });

      // 7) Reply with result
      await sendMessageWithContext(
        `*${mediaType.toUpperCase()} Converted Successfully*\n\n` +
        `*sɪᴢᴇ:* ${formatBytes(buffer.length)}\n` +
        `*ᴛʏᴘᴇ:* WEBP STICKER\n\n` +
        `> © ᴄᴏɴᴠᴇʀᴛᴇᴅ ʙʏ ᴍᴀʟᴠɪɴ-ʟɪᴛᴇ 🎭`
      );
    } catch (err) {
      console.error("Sticker execution error:", err);
      await sendMessageWithContext(
        `⚠️ Error: ${err.message || "Failed to process media"}`
      );
    }
  },
};

/**
 * Convert image to sticker format using FFmpeg
 * @param {Buffer} buffer - Media buffer
 * @param {string} mediaType - Type of media (image, video, document)
 * @returns {Promise<Buffer>} - Sticker buffer in WebP format
 */
async function imageToSticker(buffer, mediaType) {
  const inputPath = path.join(os.tmpdir(), `sticker_input_${crypto.randomBytes(6).toString('hex')}`);
  const outputPath = path.join(os.tmpdir(), `sticker_output_${crypto.randomBytes(6).toString('hex')}.webp`);

  // Write input buffer to temp file
  fs.writeFileSync(inputPath, buffer);

  try {
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .on("error", reject)
        .on("end", () => resolve(true))
        .addOutputOptions([
          "-vcodec", "libwebp",
          "-vf", "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,pad=320:320:-1:-1:color=white@0.0",
          "-preset", "default",
          "-an"
        ])
        .toFormat("webp")
        .save(outputPath);
    });

    // Read output and cleanup
    const stickerBuffer = fs.readFileSync(outputPath);
    
    // Cleanup temp files
    try {
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    } catch {}

    return stickerBuffer;

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
