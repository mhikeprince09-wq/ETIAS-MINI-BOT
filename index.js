const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } = require('@whiskeysockets/baileys');
const P = require('pino');

async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: P({ level: 'silent' }),
    printQRInTerminal: false,
    browser: Browsers.macOS('Chrome'),
    auth: state,
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
    markOnlineOnConnect: true,
    connectTimeoutMs: 60000,
    getMessage: async () => ({}),
  });

  console.log("🟢 Socket initialized...");

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'open') {
      console.log('✅ WhatsApp connected!');
    }
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('🔄 Connection closed. Reconnecting...');
      if (shouldReconnect) startSock();
    }
  });

  // Pairing code - only if not registered yet
  if (!sock.authState.creds.registered) {
    console.log("New login detected. Generating pairing code...");
    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      const code = await sock.requestPairingCode("263714294311");
      console.log(`🔗 Pairing Code: ${code}`);
      console.log("📲 Open WhatsApp > Linked Devices > Link a Device > Enter this code");
    } catch (err) {
      console.error("❌ Failed to generate pairing code:", err);
    }
  }
}

startSock();
