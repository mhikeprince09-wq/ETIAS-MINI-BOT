const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('Etias Mini Bot is Live!'));
app.listen(process.env.PORT || 3000, () => console.log('Server running'));

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    auth: state,
    printQRInTerminal: false,
    browser: ['Chrome', 'Mac OS', '']
  });

  sock.ev.on('creds.update', saveCreds);

  if (!sock.authState.creds.registered) {
    const phone = '263714294311';
    await new Promise(r => setTimeout(r, 3000));
    try {
      const code = await sock.requestPairingCode(phone);
      console.log('🔗 Pairing Code: ' + code);
      console.log('Open WhatsApp > Linked Devices > Link a Device > Enter this code');
    } catch (e) {
      console.log('Pairing failed: ' + e.message);
    }
  }

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      console.log('Connection closed. Reconnecting...');
      startBot();
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
