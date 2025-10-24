// plugins/viewonce.js
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const fakevCard = require('../lib/fakevcard');

module.exports = {
  pattern: "vv",
  desc: "Download view once media",
  react: "👁️",
  category: "utility",
  filename: __filename,
  use: ".vv [reply to view once message]",

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
          "❌ Please reply to a view once message with `.vv`"
        );
      }

      // 2) Detect view once media type & node
      let mediaNode = null;
      let mediaType = null;
      let caption = "";

      if (target.imageMessage?.viewOnce) {
        mediaNode = target.imageMessage;
        mediaType = "image";
        caption = target.imageMessage.caption || "";
      } else if (target.videoMessage?.viewOnce) {
        mediaNode = target.videoMessage;
        mediaType = "video";
        caption = target.videoMessage.caption || "";
      } else if (target.audioMessage?.viewOnce) {
        mediaNode = target.audioMessage;
        mediaType = "audio";
        caption = target.audioMessage.caption || "";
      } else {
        return await sendMessageWithContext(
          "❌ Please reply to a view once image, video, or audio with `.vv`"
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

      // 4) Download view once media
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
          "❌ Failed to download view once media. The media might have expired."
        );
      }

      if (!buffer || buffer.length === 0) {
        return await sendMessageWithContext(
          "❌ Downloaded media is empty or expired."
        );
      }

      // 5) Prepare caption for downloaded media
      let downloadCaption = `*VIEW ONCE MEDIA DOWNLOADED*\n\n`;
      if (caption) {
        downloadCaption += `*Original Caption:* ${caption}\n\n`;
      }
      downloadCaption += `*sɪᴢᴇ:* ${formatBytes(buffer.length)}\n`;
      downloadCaption += `*ᴛʏᴘᴇ:* ${mediaType.toUpperCase()}\n\n`;
      downloadCaption += `> © ᴅᴏᴡɴʟᴏᴀᴅᴇᴅ ʙʏ ᴍᴀʟᴠɪɴ-ʟɪᴛᴇ 👁️`;

      // 6) Send the downloaded media based on type
      if (mediaType === "image") {
        await conn.sendMessage(from, {
          image: buffer,
          caption: downloadCaption
        }, { quoted: fakevCard });
      } else if (mediaType === "video") {
        await conn.sendMessage(from, {
          video: buffer,
          caption: downloadCaption
        }, { quoted: fakevCard });
      } else if (mediaType === "audio") {
        await conn.sendMessage(from, {
          audio: buffer,
          mimetype: mediaNode.mimetype || 'audio/mp4',
          ptt: mediaNode.ptt || false
        }, { quoted: fakevCard });
        
        // Send info message for audio
        await sendMessageWithContext(downloadCaption);
      }

      // 7) Success message
      await sendMessageWithContext(
        `✅ *View Once Media Downloaded Successfully!*\n\n` +
        `*ᴛʏᴘᴇ:* ${mediaType.toUpperCase()}\n` +
        `*sɪᴢᴇ:* ${formatBytes(buffer.length)}\n\n` +
        `> © ᴘʀᴏᴄᴇssᴇᴅ ʙʏ ᴍᴀʟᴠɪɴ-ʟɪᴛᴇ 👁️`
      );

    } catch (err) {
      console.error("VV execution error:", err);
      await sendMessageWithContext(
        `⚠️ Error: ${err.message || "Failed to download view once media"}`
      );
    }
  },
};

function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (
    parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  );
  }
