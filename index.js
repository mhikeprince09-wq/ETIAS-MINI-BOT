const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('Etias Mini Bot is Live!'));
app.listen(process.env.PORT || 3000, () => console.log('Server running'));

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');

let pairingDone = false;

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    auth: state,
    printQRInTerminal: false,
    browser: ['Chrome', 'Mac OS', '']
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    
    // Ask for pairing code ONLY after connection is ready, and only once
    if (!sock.authState.creds.registered && !pairingDone) {
      pairingDone = true;
      await new Promise(r => setTimeout(r, 5000));
      try {
        const code = await sock.requestPairingCode('263714294311');
        console.log('🔗 Pairing Code: ' + code);
        console.log('Go to WhatsApp > Linked Devices > Link with phone number');
      } catch (e) {
        console.log('Pairing failed: ' + e.message);
        pairingDone = false;
      }
    }

    if (connection === 'close') {
      console.log('Connection closed. Reconnecting...');
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('✅ WhatsApp connected!');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
    console.log('Message: ' + text);
    await sock.sendMessage(msg.key.remoteJid, { text: 'hie' });
  });
}
startBot();
