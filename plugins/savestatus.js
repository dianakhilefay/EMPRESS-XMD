const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const fakevCard = require('../lib/fakevcard');

module.exports = {
  pattern: "save",
  desc: "Forwards quoted message back to user",
  category: "utility",
  react: "📤",
  filename: __filename,

  execute: async (conn, message, m, { from, q, reply, isGroup, groupMetadata, sender, isAdmins, isCreator }) => {
    try {
      // Check for quoted message
      const quotedMsg = m.quoted;
      
      if (!quotedMsg) {
        return await reply("*🍁 Please reply to a message!*");
      }

      // Determine media type from quoted message
      let mediaNode = null;
      let mtype = null;
      
      if (quotedMsg.message?.imageMessage) {
        mediaNode = quotedMsg.message.imageMessage;
        mtype = "imageMessage";
      } else if (quotedMsg.message?.videoMessage) {
        mediaNode = quotedMsg.message.videoMessage;
        mtype = "videoMessage";
      } else if (quotedMsg.message?.audioMessage) {
        mediaNode = quotedMsg.message.audioMessage;
        mtype = "audioMessage";
      } else {
        return await reply("❌ Only image, video, and audio messages are supported");
      }

      // Download media buffer
      let buffer;
      try {
        const mediaType = mtype.replace('Message', '').toLowerCase();
        const stream = await downloadContentFromMessage(mediaNode, mediaType);
        let _buf = Buffer.from([]);
        for await (const chunk of stream) {
          _buf = Buffer.concat([_buf, chunk]);
        }
        buffer = _buf;
      } catch (error) {
        console.error("Download error:", error);
        return await reply("❌ Failed to download media. Please try again.");
      }

      if (!buffer || buffer.length === 0) {
        return await reply("❌ Downloaded media is empty.");
      }

      const options = { quoted: fakevCard };
      let messageContent = {};

      switch (mtype) {
        case "imageMessage":
          messageContent = {
            image: buffer,
            caption: quotedMsg.message.imageMessage?.caption || '',
            mimetype: quotedMsg.message.imageMessage?.mimetype || "image/jpeg"
          };
          break;
        case "videoMessage":
          messageContent = {
            video: buffer,
            caption: quotedMsg.message.videoMessage?.caption || '',
            mimetype: quotedMsg.message.videoMessage?.mimetype || "video/mp4"
          };
          break;
        case "audioMessage":
          messageContent = {
            audio: buffer,
            mimetype: "audio/mp4",
            ptt: quotedMsg.message.audioMessage?.ptt || false
          };
          break;
      }

      await conn.sendMessage(from, messageContent, options);

    } catch (error) {
      console.error("Forward Error:", error);
      await reply("❌ Error forwarding message:\n" + error.message);
    }
  }
};
