const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeInMemoryStore, generatePairingCode, Browsers } = require('@whiskeysockets/baileys');
const P = require('pino');

async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

  const sock = makeWASocket({
    version: await fetchLatestBaileysVersion().then(v => v.version),
    logger: P({ level: 'info' }),
    printQRInTerminal: true,
    generateHighQualityLinkPreview: false, // turn Off QR output
    syncFullHistory: false,
    markOnlineOnConnect: true,
    connectTimeoutMs: 60_000,
    getMessage: async () => ({}),
    auth: state,
    browser:
    Browsers.macOS('EtiasBot'),
    // Add this:
    mobile: {
      /** Enables pairing code mode */
      /** This is the key part */
      registration: {
        phoneNumber: '263714294311', // <-- Your full phone number here
      },
    },
  });

  console.log("🟢 Socket initialized...");

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, isNewLogin } = update;

    if (connection === 'open') {
      console.log('✅ WhatsApp connected!');
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('🔁 Connection closed. Reconnecting...');
      if (shouldReconnect) startSock();
    }

    if (isNewLogin) {
      console.log("New login detected. Generating pairing code...")
      try {
        const phoneNumber = "263714294311"; // Your full international phone number
        await new Promise(resolve => setTimeout(resolve, 3000)); // wait 3 seconds
        const code = await generatePairingCode(phoneNumber, sock);
        console.log(`🔗 Pairing Code: ${code}`);
        console.log("📲 Open WhatsApp > Linked Devices > Link a Device > Enter this code");
      } catch (err) {
        console.error("❌ Failed to generate pairing code:", err);
      }
    }
  });
}

startSock();

