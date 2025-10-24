const axios = require('axios');
const FormData = require('form-data');
const fakevCard = require('../lib/fakevcard');

module.exports = {
  pattern: "tofigure",
  desc: "Convert image to anime figure",
  react: "🎨",
  category: "ai",
  filename: __filename,
  use: ".tofigure [reply to image]",

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

      let mediaNode = null;
      let mediaType = null;

      if (target.imageMessage) {
        mediaNode = target.imageMessage;
        mediaType = "image";
      } else if (target.documentMessage && target.documentMessage.mimetype?.startsWith('image/')) {
        mediaNode = target.documentMessage;
        mediaType = "document";
      } else {
        return await sendMessageWithContext("❌ Please reply to an image with `.tofigure`");
      }

      // React
      if (module.exports.react) {
        try {
          await conn.sendMessage(from, {
            react: { text: module.exports.react, key: message.key },
          });
        } catch {}
      }

      // Download image
      let buffer;
      try {
        const stream = await require('@whiskeysockets/baileys').downloadContentFromMessage(mediaNode, mediaType);
        let _buf = Buffer.from([]);
        for await (const chunk of stream) {
          _buf = Buffer.concat([_buf, chunk]);
        }
        buffer = _buf;
      } catch (e) {
        console.error("Download error:", e);
        return await sendMessageWithContext("❌ Failed to download image. Try replying to a valid image.");
      }

      if (!buffer || buffer.length === 0) {
        return await sendMessageWithContext("❌ Downloaded image is empty or too large.");
      }

      // Upload image to uguu.se
      let figureUrl;
      try {
        const form = new FormData();
        form.append('files[]', buffer, { filename: 'image.jpg' });
        const uploadRes = await axios.post('https://uguu.se/upload.php', form, { headers: form.getHeaders() });
        const uploadedUrl = uploadRes.data.files[0].url;

        // Convert to anime figure using nekolabs
        const apiRes = await axios.get(`https://api.nekolabs.my.id/tools/convert/tofigure?imageUrl=${encodeURIComponent(uploadedUrl)}`);
        figureUrl = apiRes.data.result;

      } catch (e) {
        console.error("Conversion error:", e);
        return await sendMessageWithContext("❌ Failed to convert image. Please try again later.");
      }

      // Send the anime figure image
      await conn.sendMessage(from, {
        image: { url: figureUrl },
        caption: "🎨 *Anime Figure Generated!*\n> Powered by Malvin Lite",
      }, { quoted: fakevCard });

      await sendMessageWithContext("✅ *Anime figure sent successfully!*");

    } catch (err) {
      await sendMessageWithContext(`❌ Error: ${err.message}`);
    }
  },
};
