const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  generatePairingCode
} = require("@whiskeysockets/baileys");
const P = require("pino");
const fs = require("fs");
const path = require("path");

const PREFIX = "."; // Command prefix

// Load commands from 'commands' folder
const commands = new Map();
const commandsPath = path.join(__dirname, "commands");
fs.readdirSync(commandsPath).forEach(file => {
  if (file.endsWith(".js")) {
    const command = require(path.join(commandsPath, file));
    commands.set(command.name, command);
  }
});

async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
  const sock = makeWASocket({
    auth: state,
    logger: P({ level: 'silent' }),
    browser: Browsers.macOS('EtiasBot')
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
const { connection, lastDisconnect, isNewLogin } = update;

    if (connection === 'open') {
      console.log('✅ Bot connected!');
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) startSock();
    }
   
   if (connection === 'connecting' && isNewLogin === "True")

    if (isNewLogin === 'true') {
      console.log("🔑 New login detected, generating pairing code...");
      const phoneNumber = "263XXXXXXXXX"; // Replace with your full number eg 263711466227
      const code = await generatePairingCode(phoneNumber, sock);
      console.log(`🔗 Pairing Code: ${code}`);
      console.log("📲 Open WhatsApp > Linked Devices > Link a Device > Enter this code");
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    if (!messages || messages.length === 0) return;
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const body = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
    if (!body.startsWith(PREFIX)) return;

    const args = body.slice(PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const command = commands.get(commandName);

    if (command) {
      try {
        await command.execute(sock, msg, args);
      } catch (err) {
        await sock.sendMessage(from, {
          text: `❌ Error executing command:{commandName}`
        });
      }
    }
  });
}

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

console.log("🚀 ETIAS-MINI-BOT is starting...");
console.log("🟢 Socket initialized...");
startSock();


