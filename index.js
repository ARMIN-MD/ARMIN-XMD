const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

const P = require("pino");

const PREFIX = ".";
const BOT_NAME = "ARMIN-XMD";
const OWNER_NAME = "ARMIN";
const http = require("http");

const PORT = process.env.PORT || 3000;

http.createserver.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Server running on port ${PORT}`);
});
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("ARMIN-XMD is running!");
}).listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Server running on port ${PORT}`);
});
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: P({ level: "silent" }),
    printQRInTerminal: false
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      console.log(`✅ ${BOT_NAME} وصل شد!`);
    }

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      console.log("❌ اتصال قطع شد. کد:", code);

      if (code !== DisconnectReason.loggedOut) {
        console.log("🔄 اتصال دوباره...");
        setTimeout(startBot, 3000);
      }
    }
  });

  if (!sock.authState.creds.registered) {
    const phoneNumber = "93796274067";

    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
const code = await sock.requestPairingCode(phoneNumber);

      console.log("\n🔐 کد اتصال واتساپ:");
      console.log(code);
      console.log("\n📱 WhatsApp → Settings → Linked devices → Link a device → Link with phone number instead\n");
    } catch (err) {
      console.log("❌ خطای Pairing Code:", err.message);
    }
  }

  sock.ev.on("messages.upsert", async ({ messages }) => {
    try {
      const msg = messages[0];

      if (!msg.message || msg.key.fromMe) return;

      const jid = msg.key.remoteJid;

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        "";

      if (!text.startsWith(PREFIX)) return;

      const command = text
        .slice(PREFIX.length)
        .trim()
        .split(/\s+/)[0]
        .toLowerCase();

      if (command === "menu") {
  const menu = `
╭━━━〔 🤖 ARMIN-XMD 〕━━━╮
┃
┃ 👑 OWNER : ARMIN
┃ ⚙️ PREFIX : .
┃ 🚀 VERSION : 1.0.0
┃ 🌐 MODE : PUBLIC
┃
┣━━━〔 🤖 MAIN 〕━━━
┃
┃ • .menu
┃ • .ping
┃ • .alive
┃ • .uptime
┃ • .owner
┃
┣━━━〔 👥 GROUP 〕━━━
┃
┃ • .groupinfo
┃ • .tagall
┃
┣━━━〔 🛠️ TOOLS 〕━━━
┃
┃ • .ping
┃ • .uptime
┃
┣━━━〔 🎵 MUSIC 〕━━━
┃
┃ • .play
┃ • .song
┃
┣━━━〔 🤖 AI 〕━━━
┃
┃ • .ai
┃ • .chat
┃
┣━━━〔 🎨 IMAGE 〕━━━
┃
┃ • .sticker
┃ • .toimg
┃
┣━━━〔 📥 DOWNLOADER 〕━━━
┃
┃ • .video
┃ • .audio
┃
┣━━━〔 👑 OWNER 〕━━━
┃
┃ • .owner
┃ • .restart
┃
╰━━━━━━━━━━━━━━━━━━╯

✨ ${BOT_NAME}
🔥 Powered by ARMIN
`;

  await sock.sendMessage(jid, { text: menu });
}

      else if (command === "ping") {
        await sock.sendMessage(jid, {
          text: "🏓 Pong!\n✅ ARMIN-XMD فعال است."
        });
      }

      else if (command === "alive") {
        await sock.sendMessage(jid, {
          text: `🤖 ${BOT_NAME}\n\n✅ ربات آنلاین است.`
        });
      }

      else if (command === "uptime") {
        const seconds = Math.floor(process.uptime());

        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        await sock.sendMessage(jid, {
          text:
            `⏱️ Uptime\n\n` +
            `${days} روز\n` +
            `${hours} ساعت\n` +
            `${minutes} دقیقه\n` +
            `${secs} ثانیه`
        });
      }

      else if (command === "owner") {
        await sock.sendMessage(jid, {
          text: `👑 Owner: ${OWNER_NAME}\n🤖 Bot: ${BOT_NAME}`
        });
      }

      else if (command === "groupinfo") {
        if (!jid.endsWith("@g.us")) {
          return sock.sendMessage(jid, {
            text: "❌ این دستور فقط داخل گروه کار می‌کند."
          });
        }

        const metadata = await sock.groupMetadata(jid);

        const admins = metadata.participants.filter(
          p => p.admin === "admin" || p.admin === "superadmin"
        );

        await sock.sendMessage(jid, {
          text:
            `👥 اطلاعات گروه\n\n` +
            `📌 نام: ${metadata.subject}\n` +
            `👤 اعضا: ${metadata.participants.length}\n` +
            `👮 ادمین‌ها: ${admins.length}`
        });
      }

      else if (command === "tagall") {
        if (!jid.endsWith("@g.us")) {
          return sock.sendMessage(jid, {
            text: "❌ این دستور فقط داخل گروه کار می‌کند."
          });
        }

        const metadata = await sock.groupMetadata(jid);

        const mentions = metadata.participants.map(p => p.id);

        let text = "📢 اعضای گروه:\n\n";

        for (const participant of metadata.participants) {
          text += `@${participant.id.split("@")[0]}\n`;
        }

        await sock.sendMessage(jid, {
          text,
          mentions
        });
      }

    } catch (err) {
      console.log("❌ خطای دستور:", err);
    }
  });
}

startBot();
