// === lib/fakevcard.js ===
// Generate random serial ID
function createSerial(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

const fakevCard = {
    key: {
        remoteJid: 'status@broadcast',
        participant: '13135550002@s.whatsapp.net',
        fromMe: false,
        id: createSerial(16).toUpperCase()
    },
    message: {
        contactMessage: {
            displayName: "THE VOID 3.0",
            vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:THE VOID 3.0\nORG:THE VOID 3.0;\nTEL;type=CELL;type=VOICE;waid=13056978303:13056978303\nEND:VCARD`,
            contextInfo: {
                stanzaId: createSerial(16).toUpperCase(),
                participant: "0@s.whatsapp.net",
                quotedMessage: {
                    conversation: "THE VOID 3.0"
                }
            }
        }
    },
    messageTimestamp: Math.floor(Date.now() / 1000),
    status: 1,
    verifiedBizName: "Meta"
};

module.exports = fakevCard;