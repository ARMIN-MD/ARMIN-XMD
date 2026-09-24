const {
  default: makeWASocket,
  initAuthCreds,
  BufferJSON,
  proto,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

const { Redis } = require("@upstash/redis");
const P = require("pino");
const http = require("http");

const PREFIX = ".";
const BOT_NAME = "ARMIN-XMD";
const OWNER_NAME = "ARMIN";
const PHONE_NUMBER = process.env.PHONE_NUMBER;
const PORT = process.env.PORT || 3000;

const REDIS_PREFIX = "armin-xmd:auth:main:";

if (
  !process.env.UPSTASH_REDIS_REST_URL ||
  !process.env.UPSTASH_REDIS_REST_TOKEN
) {
  console.error("❌ متغیرهای Redis تنظیم نشده‌اند.");
  process.exit(1);
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("ARMIN-XMD is running!");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Server running on port ${PORT}`);
});

async function useRedisAuthState() {
  const prefix = REDIS_PREFIX;

  const writeData = async (key, data) => {
    if (data === null || data === undefined) {
      await redis.del(prefix + key);
      return;
    }

    const value = JSON.stringify(data, BufferJSON.replacer);
    await redis.set(prefix + key, value);
  };

  const readData = async (key) => {
    const value = await redis.get(prefix + key);

    if (!value) return null;

    try {
      if (typeof value === "string") {
        return JSON.parse(value, BufferJSON.reviver);
      }

      return JSON.parse(
        JSON.stringify(value),
        BufferJSON.reviver
      );
    } catch (err) {
      console.log("❌ Redis JSON error:", key, err.message);
      return null;
    }
  };

  const creds = (await readData("creds.json")) || initAuthCreds();

  return {
    state: {
      creds,

      keys: {
        get: async (type, ids) => {
          const data = {};

          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}.json`);

              if (
                type === "app-state-sync-key" &&
                value
              ) {
                value =
                  proto.Message.AppStateSyncKeyData.fromObject(value);
              }

              data[id] = value;
            })
          );

          return data;
        },

        set: async (data) => {
          const tasks = [];

          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const key = `${category}-${id}.json`;

              if (value) {
                tasks.push(writeData(key, value));
              } else {
                tasks.push(redis.del(prefix + key));
              }
            }
          }

          await Promise.all(tasks);
        }
      }
    },

    saveCreds: async () => {
      await writeData("creds.json", creds);
      console.log("💾 Session در Redis ذخیره شد.");
    }
  };
}

async function startBot() {
  try {
    console.log("🔄 در حال خواندن Session از Redis...");

    const { state, saveCreds } =
      await useRedisAuthState();

    const { version } =
      await fetchLatestBaileysVersion();

    const sock = makeWASocket({
  version,
  auth: state,
  logger: P({ level: "silent" }),
  printQRInTerminal: false,
  markOnlineOnConnect: false,
  syncFullHistory: false,
  browser: ["Ubuntu", "Chrome", "122.0.0.0"]
});

    sock.ev.on("creds.update", saveCreds);


let pairingRequested = false;
let reconnecting = false;

sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {

  if (connection === "open") {
    console.log(`✅ ${BOT_NAME} وصل شد!`);
    reconnecting = false;
  }

  if (connection === "close") {
    const code =
      lastDisconnect?.error?.output?.statusCode;

    console.log("❌ اتصال قطع شد. کد:", code);

    if (code === DisconnectReason.loggedOut && state.creds.registered) {
      console.log("🚪 Session از واتساپ خارج شده است.");
      return;
    }

    if (state.creds.registered && !reconnecting) {
      reconnecting = true;

      console.log("🔄 اتصال دوباره در 5 ثانیه...");

      setTimeout(() => {
        startBot();
      }, 5000);
    }
  }
});

// درخواست Pairing Code بعد از ساخته شدن Socket
if (!state.creds.registered && !pairingRequested) {
  pairingRequested = true;

  try {
    await new Promise(resolve =>
      setTimeout(resolve, 1500)
    );

    if (state.creds.registered) {
      return;
    }

    const code = await sock.requestPairingCode(PHONE_NUMBER);

    console.log("\n🔐 کد اتصال واتساپ:");
    console.log(code);

    console.log(
      "\n📱 WhatsApp → Settings → Linked devices → " +
      "Link a device → Link with phone number instead\n"
    );

  } catch (err) {
    console.log("❌ خطای Pairing Code:", err.message);
  }
}
sock.ev.on(
      "messages.upsert",
      async ({ messages }) => {
        try {
          const msg = messages[0];

          if (!msg?.message || msg.key.fromMe) return;

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

          console.log(`📩 Command: ${command}`);

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
┃ • .menu
┃ • .ping
┃ • .alive
┃ • .uptime
┃ • .owner
┃
┣━━━〔 👥 GROUP 〕━━━
┃ • .groupinfo
┃ • .tagall
┃
┣━━━〔 🎵 MUSIC 〕━━━
┃ • .play
┃ • .song
┃
┣━━━〔 🤖 AI 〕━━━
┃ • .ai
┃ • .chat
┃
┣━━━〔 🎨 IMAGE 〕━━━
┃ • .sticker
┃ • .toimg
┃
┣━━━〔 📥 DOWNLOADER 〕━━━
┃ • .video
┃ • .audio
┃
┣━━━〔 👑 OWNER 〕━━━
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
              text:
                `🤖 ${BOT_NAME}\n\n` +
                `✅ ربات آنلاین است.`
            });
          }

          else if (command === "uptime") {
            const seconds =
              Math.floor(process.uptime());

            const days =
              Math.floor(seconds / 86400);

            const hours =
              Math.floor((seconds % 86400) / 3600);

            const minutes =
              Math.floor((seconds % 3600) / 60);

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
              text:
                `👑 Owner: ${OWNER_NAME}\n` +
                `🤖 Bot: ${BOT_NAME}`
            });
          }

          else if (command === "groupinfo") {
            if (!jid.endsWith("@g.us")) {
              return sock.sendMessage(jid, {
                text:
                  "❌ این دستور فقط داخل گروه کار می‌کند."
              });
            }

            const metadata =
              await sock.groupMetadata(jid);

            const admins =
              metadata.participants.filter(
                p =>
                  p.admin === "admin" ||
                  p.admin === "superadmin"
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
                text:
                  "❌ این دستور فقط داخل گروه کار می‌کند."
              });
            }

            const metadata =
              await sock.groupMetadata(jid);

            const mentions =
              metadata.participants.map(p => p.id);

            let tagText =
              "📢 اعضای گروه:\n\n";

            for (const participant of metadata.participants) {
              tagText +=
                `@${participant.id.split("@")[0]}\n`;
            }

            await sock.sendMessage(jid, {
              text: tagText,
              mentions
            });
          }

        } catch (err) {
          console.log(
            "❌ خطای دستور:",
            err.message
          );
        }
      }
    );

  } catch (err) {
    console.log(
      "❌ خطای اجرای ربات:",
      err.message
    );

    setTimeout(startBot, 5000);
  }
}

startBot();
