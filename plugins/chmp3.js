const fakevCard = require('../lib/fakevcard');

module.exports = {
  pattern: "chmp3",
  desc: "Send replied audio to channel",
  react: "📤",
  category: "tools",
  filename: __filename,
  use: ".chmp3 <channel_id> [reply to audio]",

  execute: async (conn, message, m, { from, args }) => {
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
      // 1) Require channel id
      if (!args.length) {
        return await sendMessageWithContext("❌ Usage: .chmp3 <channel_id> (reply to audio)");
      }
      const channelId = args[0];

      // 2) Get quoted message and its mime
      const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const quotedMedia = quotedMsg?.audioMessage || quotedMsg?.documentMessage;
      const mime = quotedMedia?.mimetype || "";

      // Check quoted and audio
      if (!quotedMedia || !/audio/.test(mime)) {
        return await sendMessageWithContext("❌ Please reply to an audio file with this command.");
      }

      // 3) React
      if (module.exports.react) {
        try {
          await conn.sendMessage(from, { react: { text: module.exports.react, key: message.key } });
        } catch {}
      }

      // 4) Download audio buffer
      let buffer;
      try {
        const stream = await require('@whiskeysockets/baileys').downloadContentFromMessage(quotedMedia, "audio");
        let _buf = Buffer.from([]);
        for await (const chunk of stream) {
          _buf = Buffer.concat([_buf, chunk]);
        }
        buffer = _buf;
      } catch (e) {
        console.error("Audio download error:", e);
        return await sendMessageWithContext("❌ Failed to download audio.");
      }

      if (!buffer || buffer.length === 0) {
        return await sendMessageWithContext("❌ Audio is empty or too large.");
      }

      // 5) Send info message about upload
      let sending = await conn.sendMessage(from, { text: "📤 Sending audio to channel..." }, { quoted: fakevCard });

      // 6) Send audio to channel
      await conn.sendMessage(
        channelId,
        {
          audio: buffer,
          mimetype: "audio/mpeg",
          ptt: true,
        },
        { quoted: fakevCard }
      );

      // 7) Confirm success
      await conn.sendMessage(from, { text: "✅ Audio sent to channel.", edit: sending.key }, { quoted: fakevCard });

    } catch (err) {
      console.error("Failed to send audio:", err);
      await sendMessageWithContext("❌ Failed to send audio to channel.");
    }
  },
};

/*
CHMP3
CREATOR : MARSELLMAWUJADIDEV 
CH CREATOR : https://whatsapp.com/channel/0029VbBFzoWDDmFYnclusM13
NOTED : SESUAIKAN DENGAN SETTINGS KALIAN YGY 
*/
