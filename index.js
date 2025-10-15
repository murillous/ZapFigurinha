const {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  downloadMediaMessage,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { exec } = require("child_process");
const { promisify } = require("util");
const pino = require("pino");

let qrcode;
try {
  qrcode = require("qrcode-terminal");
} catch (e) {
  console.log("💡 Para QR Code visual, instale: npm install qrcode-terminal");
}

const execAsync = promisify(exec);

class WhatsAppStickerBot {
  constructor() {
    this.tempDir = "./temp";
    this.authDir = "./auth_info";
    this.sock = null;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.reconnectDelay = 5000;
    this.lastCleanTime = 0;
    this.minCleanInterval = 60000; // Mínimo 1 minuto entre limpezas

    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }

    process.on("SIGINT", () => this.gracefulShutdown());
    process.on("SIGTERM", () => this.gracefulShutdown());

    console.log("🤖 WhatsApp Sticker Bot - Conversor Bidirecional");
    console.log("🔄 !sticker - Converte imagem/vídeo para sticker");
    console.log("🖼️ !image - Converte sticker para imagem");
    console.log("📱 Aguarde o QR Code...\n");
  }

  async startBot() {
    if (this.isConnecting) {
      console.log("⏳ Já existe uma tentativa de conexão em andamento...");
      return;
    }

    this.isConnecting = true;

    try {
      if (this.sock) {
        try {
          this.sock.end(undefined);
        } catch (error) {
          // Ignora erros ao fechar socket
        }
        this.sock = null;
      }

      console.log("🔄 Iniciando conexão com WhatsApp...");

      // Busca versão mais recente do Baileys
      const { version, isLatest } = await fetchLatestBaileysVersion();
      console.log(`📦 Usando WA v${version.join(".")}, isLatest: ${isLatest}`);

      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);

      // Logger silencioso para reduzir poluição
      const logger = pino({
        level: process.env.LOG_LEVEL || "silent",
      });

      this.sock = makeWASocket({
        version,
        auth: state,
        logger,
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        printQRInTerminal: false, // Controlamos manualmente
        defaultQueryTimeoutMs: 60000,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
        emitOwnEvents: false,
        markOnlineOnConnect: true,
        syncFullHistory: false,
        generateHighQualityLinkPreview: false,
        getMessage: async () => undefined,
      });

      this.setupEventHandlers(saveCreds);
    } catch (error) {
      console.error("❌ Erro ao iniciar o bot:", error.message);
      this.isConnecting = false;

      // Evita limpezas muito frequentes
      const now = Date.now();
      if (now - this.lastCleanTime > this.minCleanInterval) {
        if (
          error.message.includes("405") ||
          error.message.includes("auth") ||
          error.message.includes("401") ||
          error.message.includes("Connection Failure")
        ) {
          await this.cleanAuthAndRestart();
        } else {
          await this.handleReconnect();
        }
      } else {
        console.log("⏳ Aguardando antes de tentar novamente...");
        await new Promise((r) => setTimeout(r, 10000));
        await this.handleReconnect();
      }
    }
  }

  setupEventHandlers(saveCreds) {
    this.sock.ev.on("connection.update", async (update) => {
      await this.handleConnectionUpdate(update);
    });

    this.sock.ev.on("creds.update", saveCreds);

    this.sock.ev.on("messages.upsert", async (m) => {
      try {
        const message = m.messages[0];
        if (!message?.key?.fromMe && message) {
          await this.handleMessage(message);
        }
      } catch (error) {
        console.error("Erro ao processar mensagem:", error.message);
      }
    });
  }

  async handleConnectionUpdate(update) {
    const { connection, lastDisconnect, qr } = update;

    try {
      if (qr) {
        console.log("\n📱 QR Code gerado! Escaneie com seu WhatsApp:\n");

        if (qrcode) {
          qrcode.generate(qr, { small: true });
        } else {
          console.log("QR Code (texto):", qr);
          console.log("\n💡 Instale qrcode-terminal para QR visual\n");
        }
        console.log("⏰ QR Code expira em ~60 segundos\n");
      }

      if (connection === "close") {
        this.isConnecting = false;
        const shouldReconnect =
          lastDisconnect?.error?.output?.statusCode !==
          DisconnectReason.loggedOut;
        const statusCode = lastDisconnect?.error?.output?.statusCode;

        console.log(
          "❌ Conexão fechada:",
          lastDisconnect?.error?.message || "Desconhecido"
        );

        if (statusCode) {
          console.log(`📊 Status Code: ${statusCode}`);
        }

        // Análise do erro
        if (statusCode === 405 || statusCode === 401 || statusCode === 403) {
          console.log("🔐 Erro de autenticação detectado");
          const now = Date.now();
          if (now - this.lastCleanTime > this.minCleanInterval) {
            await this.cleanAuthAndRestart();
          } else {
            console.log("⏳ Aguardando cooldown de limpeza...");
            await new Promise((r) =>
              setTimeout(r, this.minCleanInterval - (now - this.lastCleanTime))
            );
            await this.cleanAuthAndRestart();
          }
        } else if (statusCode === DisconnectReason.loggedOut) {
          console.log("🔄 Deslogado do WhatsApp - gerando novo QR");
          await this.cleanAuthAndRestart();
        } else if (shouldReconnect) {
          await this.handleReconnect();
        } else {
          console.log("🛑 Bot finalizado");
          process.exit(0);
        }
      } else if (connection === "connecting") {
        console.log("🔗 Conectando...");
      } else if (connection === "open") {
        console.log("✅ Conectado com sucesso!");
        console.log("🎯 Bot pronto para uso\n");
        this.isConnecting = false;
        this.reconnectAttempts = 0;
      }
    } catch (error) {
      console.error("Erro no handler de conexão:", error.message);
      this.isConnecting = false;
    }
  }

  async cleanAuthAndRestart() {
    console.log("🧹 Limpando sessão...");
    this.lastCleanTime = Date.now();

    try {
      // Fecha socket atual
      if (this.sock) {
        try {
          await this.sock.end(undefined);
        } catch (e) {}
        this.sock = null;
      }

      // Remove pasta de autenticação
      if (fs.existsSync(this.authDir)) {
        await this.removeDirectory(this.authDir);
        console.log("✅ Sessão removida");
      }

      // Aguarda antes de reiniciar
      await new Promise((r) => setTimeout(r, 3000));

      console.log("🚀 Reiniciando...\n");
      this.reconnectAttempts = 0;
      this.isConnecting = false;
      await this.startBot();
    } catch (error) {
      console.error("❌ Erro ao limpar:", error.message);
      console.log("⚠️ Remova manualmente a pasta 'auth_info' e reinicie");
      process.exit(1);
    }
  }

  async removeDirectory(dirPath) {
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        if (fs.statSync(filePath).isDirectory()) {
          await this.removeDirectory(filePath);
        } else {
          fs.unlinkSync(filePath);
        }
      }
      fs.rmdirSync(dirPath);
    }
  }

  async handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log(
        `❌ Máximo de ${this.maxReconnectAttempts} tentativas atingido`
      );
      console.log("🧹 Limpando sessão...\n");
      await this.cleanAuthAndRestart();
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * this.reconnectAttempts, 15000);

    console.log(
      `⏳ Reconectando em ${delay / 1000}s (${this.reconnectAttempts}/${
        this.maxReconnectAttempts
      })...`
    );

    await new Promise((r) => setTimeout(r, delay));

    this.isConnecting = false;
    await this.startBot();
  }

  async gracefulShutdown() {
    console.log("\n🛑 Finalizando...");
    if (this.sock) {
      try {
        await this.sock.end(undefined);
      } catch (e) {}
    }
    this.cleanupTempDir();
    console.log("✅ Finalizado");
    process.exit(0);
  }

  cleanupTempDir() {
    try {
      if (fs.existsSync(this.tempDir)) {
        fs.readdirSync(this.tempDir).forEach((file) => {
          try {
            fs.unlinkSync(path.join(this.tempDir, file));
          } catch (e) {}
        });
      }
    } catch (e) {}
  }

  async handleMessage(message) {
    try {
      const text = this.extractMessageText(message);
      const hasSticker = text?.toLowerCase().includes("!sticker");
      const hasImage = text?.toLowerCase().includes("!image");

      if (hasSticker) {
        await this.handleStickerCommand(message);
      } else if (hasImage) {
        await this.handleImageCommand(message);
      }
    } catch (error) {
      console.error("Erro:", error.message);
    }
  }

  async handleStickerCommand(message) {
    if (this.hasMedia(message)) {
      await this.processSticker(message);
    } else if (
      message.message?.extendedTextMessage?.contextInfo?.quotedMessage
    ) {
      const quoted = {
        message: message.message.extendedTextMessage.contextInfo.quotedMessage,
        key: {
          remoteJid: message.key.remoteJid,
          id: message.message.extendedTextMessage.contextInfo.stanzaId,
        },
      };
      if (this.hasMedia(quoted)) {
        await this.processSticker(quoted, message.key.remoteJid);
      } else {
        await this.sendMessage(
          message.key.remoteJid,
          "ℹ️ Responda a uma imagem/vídeo com !sticker"
        );
      }
    } else {
      await this.sendMessage(
        message.key.remoteJid,
        "ℹ️ Envie uma mídia com !sticker"
      );
    }
  }

  async handleImageCommand(message) {
    if (this.hasSticker(message)) {
      await this.processStickerToImage(message);
    } else if (
      message.message?.extendedTextMessage?.contextInfo?.quotedMessage
    ) {
      const quoted = {
        message: message.message.extendedTextMessage.contextInfo.quotedMessage,
        key: {
          remoteJid: message.key.remoteJid,
          id: message.message.extendedTextMessage.contextInfo.stanzaId,
        },
      };
      if (this.hasSticker(quoted)) {
        await this.processStickerToImage(quoted, message.key.remoteJid);
      } else {
        await this.sendMessage(
          message.key.remoteJid,
          "ℹ️ Responda a um sticker com !image"
        );
      }
    } else {
      await this.sendMessage(
        message.key.remoteJid,
        "ℹ️ Envie um sticker com !image"
      );
    }
  }

  async processStickerToImage(message, targetJid = null) {
    try {
      const jid = targetJid || message.key.remoteJid;
      const buffer = await downloadMediaMessage(
        message,
        "buffer",
        {},
        {
          logger: undefined,
          reuploadRequest: this.sock.updateMediaMessage,
        }
      );

      if (!buffer) {
        await this.sendMessage(jid, "❌ Erro ao baixar");
        return;
      }

      const imageBuffer = await sharp(buffer).png({ quality: 100 }).toBuffer();

      await this.sock.sendMessage(jid, {
        image: imageBuffer,
        caption: "🖼️ Convertido!",
      });

      console.log("✅ Imagem enviada");
    } catch (error) {
      console.error("Erro:", error.message);
      await this.sendMessage(
        targetJid || message.key.remoteJid,
        "❌ Erro na conversão"
      );
    }
  }

  extractMessageText(message) {
    return (
      message.message?.conversation ||
      message.message?.extendedTextMessage?.text ||
      message.message?.imageMessage?.caption ||
      message.message?.videoMessage?.caption ||
      null
    );
  }

  hasMedia(message) {
    return !!(message.message?.imageMessage || message.message?.videoMessage);
  }

  hasSticker(message) {
    return !!message.message?.stickerMessage;
  }

  async processSticker(message, targetJid = null) {
    try {
      const jid = targetJid || message.key.remoteJid;
      const buffer = await downloadMediaMessage(
        message,
        "buffer",
        {},
        {
          logger: undefined,
          reuploadRequest: this.sock.updateMediaMessage,
        }
      );

      if (!buffer) {
        await this.sendMessage(jid, "❌ Erro ao baixar");
        return;
      }

      const type = this.getMessageType(message);
      let stickerBuffer;

      if (type === "image") {
        stickerBuffer = await sharp(buffer)
          .resize(512, 512, {
            fit: "contain",
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .webp({ quality: 90 })
          .toBuffer();
      } else {
        stickerBuffer = await this.convertVideo(buffer, type);
      }

      if (stickerBuffer) {
        await this.sock.sendMessage(jid, { sticker: stickerBuffer });
        console.log("✅ Sticker enviado");
      } else {
        await this.sendMessage(jid, "❌ Erro na conversão");
      }
    } catch (error) {
      console.error("Erro:", error.message);
      await this.sendMessage(targetJid || message.key.remoteJid, "❌ Erro");
    }
  }

  async convertVideo(buffer, type) {
    try {
      const input = path.join(
        this.tempDir,
        `in_${Date.now()}.${type === "gif" ? "gif" : "mp4"}`
      );
      const output = path.join(this.tempDir, `out_${Date.now()}.webp`);

      fs.writeFileSync(input, buffer);

      const duration = type === "gif" ? 8 : 6;
      const cmd = `ffmpeg -i "${input}" -t ${duration} -vf "scale=512:512:force_original_aspect_ratio=increase,crop=512:512,fps=15" -c:v libwebp -quality 75 -loop 0 -an -fs 800K "${output}"`;

      await execAsync(cmd);

      if (fs.existsSync(output)) {
        const result = fs.readFileSync(output);
        this.cleanup([input, output]);
        return result;
      }

      this.cleanup([input]);
      return null;
    } catch (error) {
      console.error("Erro no vídeo:", error.message);
      return null;
    }
  }

  getMessageType(message) {
    if (message.message?.imageMessage) {
      return message.message.imageMessage.mimetype?.includes("gif")
        ? "gif"
        : "image";
    }
    if (message.message?.videoMessage) {
      return message.message.videoMessage.gifPlayback ? "gif" : "video";
    }
    return "image";
  }

  async sendMessage(jid, text) {
    try {
      if (this.sock?.user) {
        await this.sock.sendMessage(jid, { text });
      }
    } catch (error) {
      console.error("Erro ao enviar:", error.message);
    }
  }

  cleanup(files) {
    files.forEach((file) => {
      try {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      } catch (e) {}
    });
  }
}

async function initBot() {
  try {
    const bot = new WhatsAppStickerBot();
    await bot.startBot();
  } catch (error) {
    console.error("❌ Erro fatal:", error.message);
    process.exit(1);
  }
}

process.on("unhandledRejection", (reason) => {
  console.error("❌ Rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Exception:", error.message);
});

initBot();

module.exports = WhatsAppStickerBot;
