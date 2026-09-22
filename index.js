const makeWASocketModule = require("@whiskeysockets/baileys");

const {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = makeWASocketModule;

const makeWASocket =
  makeWASocketModule.default || makeWASocketModule;

const P = require("pino");

const phoneNumber = "93796274067";

async function startBot() {
  const { state, saveCreds } =
    await useMultiFileAuthState("auth_info");

  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    auth: state,
    version,
    logger: P({ level: "silent" })
  });

  sock.ev.on("creds.update", saveCreds);

  let pairingRequested = false;

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "open") {
      console.log("✅ ARMIN-XMD وصل شد!");
    }

    if (
      connection === "connecting" &&
      !state.creds.registered &&
      !pairingRequested
    ) {
      pairingRequested = true;

      setTimeout(async () => {
        try {
          const code = await sock.requestPairingCode(phoneNumber);
          console.log("");
          console.log("🔐 کد اتصال واتساپ:");
          console.log(code);
          console.log("");
        } catch (error) {
          console.log("❌ دریافت کد ناموفق بود:");
          console.log(error);
          pairingRequested = false;
        }
      }, 3000);
    }

    if (connection === "close") {
      const statusCode =
        lastDisconnect?.error?.output?.statusCode;

      console.log("❌ اتصال قطع شد.");
      console.log("کد خطا:", statusCode);

      if (statusCode !== DisconnectReason.loggedOut) {
        setTimeout(startBot, 5000);
      }
    }
  });

  // دریافت پیام‌ها
  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const jid = msg.key.remoteJid;

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        "";

      const command = text.trim().toLowerCase();

      // =========================
      // سلام
      // =========================

      if (command === "سلام") {
        await sock.sendMessage(jid, {
          text: "سلام 👋\nمن ARMIN-XMD هستم 🤖"
        });
      }

      // =========================
      // PING
      // =========================

      if (
        command === "ping" ||
        command === "!ping" ||
        command === ".ping"
      ) {
        await sock.sendMessage(jid, {
          text: "🏓 Pong!\n\n🤖 ARMIN-XMD فعال است."
        });
      }

      // =========================
      // MENU
      // =========================

      if (
        command === "menu" ||
        command === "!menu" ||
        command === ".menu" ||
        command === "/menu" ||
        command === "منو"
      ) {
        const menu = `
╭━━━━━━━━━━━━━━━━━━━━╮
┃     🤖 ARMIN-XMD
┃     ⚡ WHATSAPP BOT
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━━〔 📋 GENERAL 〕━━━╮
┃
┃ 👋 سلام
┃ 🏓 ping
┃ ℹ️ info
┃ 📋 menu
┃
╰━━━━━━━━━━━━━━━━━━╯

╭━━━〔 👥 GROUP 〕━━━╮
┃
┃ 👥 groupinfo
┃ 📢 tagall
┃ 🔗 link
┃
╰━━━━━━━━━━━━━━━━━━╯

╭━━━〔 🛠️ ADMIN 〕━━━╮
┃
┃ 🚫 kick
┃ ➕ add
┃ ⬆️ promote
┃ ⬇️ demote
┃
╰━━━━━━━━━━━━━━━━━━╯

╭━━━〔 🎵 MEDIA 〕━━━╮
┃
┃ 🎵 music
┃ 🎵 play
┃
╰━━━━━━━━━━━━━━━━━━╯

╭━━━〔 👨‍💻 BOT 〕━━━╮
┃
┃ 🤖 ARMIN-XMD
┃ ⚡ Version 1.0.0
┃
╰━━━━━━━━━━━━━━━━━━╯

       ❤️ Powered by ARMIN
`;

        await sock.sendMessage(jid, {
          text: menu
        });
      }

      // =========================
      // INFO
      // =========================

      if (
        command === "info" ||
        command === "!info" ||
        command === ".info"
      ) {
        await sock.sendMessage(jid, {
          text:
            "🤖 نام ربات: ARMIN-XMD\n" +
            "⚡ نسخه: 1.0.0\n" +
            "👨‍💻 سازنده: ARMIN\n" +
            "📱 پلتفرم: WhatsApp\n" +
            "✅ وضعیت: فعال"
        });
      }

      // =========================
      // GROUP INFO
      // =========================

      if (
        command === "groupinfo" ||
        command === "!groupinfo" ||
        command === ".groupinfo"
      ) {
        if (!jid.endsWith("@g.us")) {
          await sock.sendMessage(jid, {
            text: "❌ این دستور فقط داخل گروه کار می‌کند."
          });
          continue;
        }

        try {
          const metadata = await sock.groupMetadata(jid);

          await sock.sendMessage(jid, {
            text:
              "👥 اطلاعات گروه\n\n" +
              "📌 نام: " + metadata.subject + "\n" +
              "👤 اعضا: " + metadata.participants.length + "\n" +
              "🆔 ID: " + jid
          });
        } catch (error) {
          await sock.sendMessage(jid, {
            text: "❌ دریافت اطلاعات گروه ناموفق بود."
          });
        }
      }

      // =========================
      // TAG ALL
      // =========================

      if (
        command === "tagall" ||
        command === "!tagall" ||
        command === ".tagall"
      ) {
        if (!jid.endsWith("@g.us")) {
          await sock.sendMessage(jid, {
            text: "❌ این دستور فقط داخل گروه کار می‌کند."
          });
          continue;
        }

        try {
          const metadata = await sock.groupMetadata(jid);

          let mentions = [];
          let message = "📢 اعضای گروه:\n\n";

          for (const member of metadata.participants) {
            mentions.push(member.id);
            message += "👤 @" + member.id.split("@")[0] + "\n";
          }

          await sock.sendMessage(jid, {
            text: message,
            mentions: mentions
          });
        } catch (error) {
          await sock.sendMessage(jid, {
            text: "❌ اجرای tagall ناموفق بود."
          });
        }
      }

      // =========================
      // GROUP LINK
      // =========================

      if (
        command === "link" ||
        command === "!link" ||
        command === ".link"
      ) {
        if (!jid.endsWith("@g.us")) {
          await sock.sendMessage(jid, {
            text: "❌ این دستور فقط داخل گروه کار می‌کند."
          });
          continue;
        }

        try {
          const code = await sock.groupInviteCode(jid);

          await sock.sendMessage(jid, {
            text:
              "🔗 لینک دعوت گروه:\n\n" +
              "https://chat.whatsapp.com/" + code
          });
        } catch (error) {
          await sock.sendMessage(jid, {
            text: "❌ دریافت لینک گروه ناموفق بود."
          });
        }
      }

      // =========================
      // MUSIC
      // =========================

      if (
        command === "music" ||
        command === "!music" ||
        command === ".music" ||
        command === "play" ||
        command === "!play" ||
        command === ".play"
      ) {
        await sock.sendMessage(jid, {
          text:
            "🎵 ARMIN-XMD MUSIC\n\n" +
            "این بخش آماده است.\n" +
            "برای پخش موسیقی باید منبع مجاز موسیقی را به ربات وصل کنیم."
        });
      }
    }
  });
}

startBot();
