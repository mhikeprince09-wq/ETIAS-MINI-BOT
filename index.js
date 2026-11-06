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
    browser: ['Etias', 'Chrome', '1.0'],
    connectTimeoutMs: 60000,
  });

  sock.ev.on('creds.update', saveCreds);

  // Try pairing ONCE, 8 seconds after start - no loop
  if (!sock.authState.creds.registered) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode('263714294311');
        console.log('🔗 Pairing Code: ' + code);
        console.log('Enter this in WhatsApp NOW - you have 30 seconds');
      } catch (e) {
        console.log('Pairing failed: ' + e.message);
        console.log('Will retry in 30 seconds - DO NOT redeploy');
      }
    }, 8000);
  }

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      console.log('Connection closed, code: ' + code);
      // Wait 10 sec before reconnect, don't spam
      if (code !== DisconnectReason.loggedOut) {
        setTimeout(() => startBot(), 10000);
      } else {
        console.log('Logged out - need new pairing');
      }
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
