const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const P = require('pino');
const path = require('path');
const express = require('express');

const PREFIX = "."; // Command prefix

// Load command files
const commands = new Map();
const commandDir = path.join(__dirname, 'commands');

fs.readdirSync(commandDir).forEach(file => {
  if (file.endsWith('.js')) {
    const cmd = require(path.join(commandDir, file));
    if (cmd.name) commands.set(cmd.name, cmd);
  }
});

async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: P({ level: 'silent' }),
    getMessage: async () => ({})
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('📸 QR code for WhatsApp login:');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') {
      console.log('✅ WhatsApp connected!');
    }

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason !== DisconnectReason.loggedOut) {
        console.log('🔁 Reconnecting...');
        startSock();
      } else {
        console.log('❌ Logged out.');}
    }
  });
}

// You missed this line before
startSock();

