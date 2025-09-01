const {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  downloadMediaMessage,
} = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { exec } = require("child_process");
const { promisify } = require("util");

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
    this.reconnectDelay = 3000; 
    this.autoCleanSession = true; 
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }


    process.on("SIGINT", () => this.gracefulShutdown());
    process.on("SIGTERM", () => this.gracefulShutdown());

    console.log("🤖 WhatsApp Sticker Bot com Auto QR Code");
    console.log(
      "📱 Quando desconectar no app, o bot gerará novo QR automaticamente\n"
    );
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
          this.sock.end();
        } catch (error) {
          console.log("Limpando socket anterior...");
        }
        this.sock = null;
      }

      console.log("🔄 Iniciando conexão com WhatsApp...");

      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);

      this.sock = makeWASocket({
        auth: state,
        browser: ["WhatsApp Sticker Bot", "Chrome", "1.0.0"],
        generateHighQualityLinkPreview: true,
        connectTimeoutMs: 30000, 
        defaultQueryTimeoutMs: 30000,
        emitOwnEvents: false,
        fireInitQueries: true,
        markOnlineOnConnect: true,
      });

      this.setupEventHandlers(saveCreds);
    } catch (error) {
      console.error("❌ Erro ao iniciar o bot:", error.message);
      this.isConnecting = false;

      if (error.message.includes("auth") || error.message.includes("creds")) {
        await this.cleanAuthAndRestart();
      } else {
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

    
    this.sock.ev.on("CB:call", (call) => {
      console.log("📞 Chamada recebida e rejeitada automaticamente");
    });
  }

  async handleConnectionUpdate(update) {
    const { connection, lastDisconnect, qr } = update;

    try {
      if (qr) {
        console.log("\n📱 Novo QR Code gerado! Escaneie com seu WhatsApp:\n");

        if (qrcode) {
          qrcode.generate(qr, { small: true });
        } else {
          console.log("QR Code (texto):", qr);
          console.log(
            "\n💡 Para ver o QR Code visual, instale: npm install qrcode-terminal\n"
          );
        }
        console.log(
          "⏰ QR Code expira em ~60 segundos. Escaneie rapidamente!\n"
        );
      }

      if (connection === "close") {
        this.isConnecting = false;

        const reconnectAction = await this.analyzeDisconnection(lastDisconnect);

        console.log(
          "❌ Conexão fechada:",
          lastDisconnect?.error?.message || "Motivo desconhecido"
        );

        switch (reconnectAction) {
          case "clean_and_restart":
            await this.cleanAuthAndRestart();
            break;
          case "reconnect":
            await this.handleReconnect();
            break;
          case "stop":
            console.log(
              "🛑 Bot finalizado. Reinicie manualmente se necessário."
            );
            process.exit(1);
            break;
        }
      } else if (connection === "connecting") {
        console.log("🔗 Conectando ao WhatsApp...");
      } else if (connection === "open") {
        console.log("✅ Bot conectado com sucesso!");
        console.log(
          "🎯 Envie !sticker respondendo a uma imagem/vídeo/GIF para criar stickers\n"
        );
        this.isConnecting = false;
        this.reconnectAttempts = 0; 
      }
    } catch (error) {
      console.error("Erro no handler de conexão:", error.message);
      this.isConnecting = false;
    }
  }

  async analyzeDisconnection(lastDisconnect) {
    if (!lastDisconnect?.error) return "reconnect";

    const error = lastDisconnect.error;

    if (error instanceof Boom) {
      const statusCode = error.output?.statusCode;

      switch (statusCode) {
        case DisconnectReason.loggedOut:
          console.log("🔄 Detectado: Desconectado no app do WhatsApp");
          console.log(
            "🧹 Limpando sessão automaticamente para gerar novo QR...\n"
          );
          return "clean_and_restart";

        case DisconnectReason.forbidden:
          console.log("🚫 Conta banida/restrita pelo WhatsApp");
          return "stop";

        case DisconnectReason.badSession:
          console.log("🔄 Sessão corrompida detectada");
          console.log("🧹 Limpando sessão automaticamente...\n");
          return "clean_and_restart";

        case DisconnectReason.timedOut:
          console.log("⏰ Timeout de conexão - tentando reconectar...");
          return "reconnect";

        case DisconnectReason.connectionLost:
        case DisconnectReason.connectionClosed:
          console.log("📡 Conexão perdida - tentando reconectar...");
          return "reconnect";

        case DisconnectReason.connectionReplaced:
          console.log("🔄 WhatsApp aberto em outro dispositivo");
          console.log("🧹 Gerando novo QR para este dispositivo...\n");
          return "clean_and_restart";

        case DisconnectReason.multideviceMismatch:
          console.log("📱 Incompatibilidade de multidispositivos");
          console.log("🧹 Limpando sessão automaticamente...\n");
          return "clean_and_restart";

        case DisconnectReason.restartRequired:
          console.log("🔄 Reinício necessário pelo WhatsApp");
          return "reconnect";

        default:
          console.log(`❓ Código de desconexão: ${statusCode}`);
   
          if (statusCode >= 400 && statusCode < 500) {
            console.log("🧹 Erro de autenticação - limpando sessão...\n");
            return "clean_and_restart";
          }
          return "reconnect";
      }
    }

    return "reconnect";
  }

  async cleanAuthAndRestart() {
    console.log("🧹 Limpando sessão de autenticação...");

    try {
     
      if (fs.existsSync(this.authDir)) {
        await this.removeDirectory(this.authDir);
        console.log("✅ Sessão anterior removida com sucesso");
      }

      
      await new Promise((resolve) => setTimeout(resolve, 2000));

      console.log("🚀 Iniciando nova sessão...\n");

      
      this.reconnectAttempts = 0;

 
      await this.startBot();
    } catch (error) {
      console.error("❌ Erro ao limpar autenticação:", error.message);
      console.log('⚠️ Remova manualmente a pasta "auth_info" e reinicie o bot');
      process.exit(1);
    }
  }

  async removeDirectory(dirPath) {
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
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
        `❌ Máximo de tentativas atingido (${this.maxReconnectAttempts})`
      );
      console.log("🧹 Tentando limpar sessão e gerar novo QR...\n");
      await this.cleanAuthAndRestart();
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * this.reconnectAttempts, 10000); // Max 10s

    console.log(
      `⏳ Tentativa ${this.reconnectAttempts}/${this.maxReconnectAttempts} em ${
        delay / 1000
      }s...`
    );

    await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      await this.startBot();
    } catch (error) {
      console.error("❌ Erro na reconexão:", error.message);
      await this.handleReconnect();
    }
  }

  async gracefulShutdown() {
    console.log("\n🛑 Finalizando bot...");

    if (this.sock) {
      try {
        await this.sock.end();
      } catch (error) {
        console.log("Socket fechado");
      }
    }

    this.cleanupTempDir();

    console.log("✅ Bot finalizado com sucesso.");
    process.exit(0);
  }

  cleanupTempDir() {
    try {
      if (fs.existsSync(this.tempDir)) {
        const files = fs.readdirSync(this.tempDir);
        files.forEach((file) => {
          const filePath = path.join(this.tempDir, file);
          try {
            fs.unlinkSync(filePath);
          } catch (error) {
           
          }
        });
      }
    } catch (error) {
      
    }
  }

  async handleMessage(message) {
    try {
      if (message?.message) {
        const messageText = this.extractMessageText(message);
        const hasSticker = messageText?.toLowerCase().includes("!sticker");

        if (hasSticker) {
          if (this.hasMedia(message)) {
            await this.processSticker(message);
          } else if (
            message.message?.extendedTextMessage?.contextInfo?.quotedMessage
          ) {
            const quotedMessage = {
              message:
                message.message.extendedTextMessage.contextInfo.quotedMessage,
              key: {
                remoteJid: message.key.remoteJid,
                id: message.message.extendedTextMessage.contextInfo.stanzaId,
              },
            };

            if (this.hasMedia(quotedMessage)) {
              console.log("📋 Processando mídia da mensagem respondida...");
              await this.processSticker(quotedMessage, message.key.remoteJid);
            } else {
              await this.sendMessage(
                message.key.remoteJid,
                "ℹ️ Responda a uma imagem/vídeo/GIF com !sticker para criar um sticker"
              );
            }
          } else {
            await this.sendMessage(
              message.key.remoteJid,
              "ℹ️ Envie uma imagem/vídeo/GIF com !sticker ou responda a uma mídia com !sticker"
            );
          }
        }
      }
    } catch (error) {
      console.error("Erro ao processar mensagem:", error.message);
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
    return !!(
      message.message?.imageMessage ||
      message.message?.videoMessage ||
      message.message?.documentMessage
    );
  }

  async processSticker(message, targetJid = null) {
    try {
      console.log("🔎 Processando sticker...");

      const jid = targetJid || message.key.remoteJid;

    
      if (!this.sock || !this.sock.user) {
        console.log("❌ Socket não disponível");
        return;
      }

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
        await this.sendMessage(
          jid,
          "❌ Erro ao baixar a mídia. Tente novamente."
        );
        return;
      }

      const messageType = this.getMessageType(message);
      let stickerBuffer;

      if (messageType === "image") {
        stickerBuffer = await this.convertImageWithSharp(buffer);
      } else {
        stickerBuffer = await this.convertVideoWithoutBorders(
          buffer,
          messageType
        );
      }

      if (stickerBuffer) {
        await this.sock.sendMessage(jid, {
          sticker: stickerBuffer,
          mimetype: "image/webp",
        });
        console.log("✅ Sticker enviado com sucesso!");
      } else {
        await this.sendMessage(
          jid,
          "❌ Erro ao converter mídia para sticker. Verifique se é uma imagem/vídeo válido."
        );
      }
    } catch (error) {
      console.error("Erro ao processar sticker:", error.message);
      const jid = targetJid || message.key.remoteJid;
      await this.sendMessage(
        jid,
        "❌ Erro interno. Tente novamente em alguns segundos."
      );
    }
  }

  async convertImageWithSharp(buffer) {
    try {
      console.log("🖼️ Convertendo imagem...");

      const stickerBuffer = await sharp(buffer)
        .resize(512, 512, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .webp({
          quality: 90,
          alphaQuality: 90,
          force: true,
        })
        .toBuffer();

      console.log(
        `✅ Imagem convertida: ${(stickerBuffer.length / 1024).toFixed(1)}KB`
      );
      return stickerBuffer;
    } catch (error) {
      console.error("Erro na conversão de imagem:", error.message);
      return null;
    }
  }

  async convertVideoWithoutBorders(buffer, type) {
    try {
      console.log("🎥 Convertendo vídeo/GIF...");

      const inputPath = path.join(
        this.tempDir,
        `input_${Date.now()}.${this.getFileExtension(type)}`
      );
      const outputPath = path.join(this.tempDir, `sticker_${Date.now()}.webp`);

      fs.writeFileSync(inputPath, buffer);

      let ffmpegCommand;

      if (type === "gif") {
        ffmpegCommand = `ffmpeg -i "${inputPath}" -t 8 -vf "scale=512:512:force_original_aspect_ratio=increase,crop=512:512,fps=15" -c:v libwebp -quality 75 -method 6 -preset default -loop 0 -an -fs 800K "${outputPath}"`;
      } else {
        ffmpegCommand = `ffmpeg -i "${inputPath}" -t 6 -vf "scale=512:512:force_original_aspect_ratio=increase,crop=512:512,fps=15" -c:v libwebp -quality 75 -method 6 -preset default -loop 0 -an -fs 800K "${outputPath}"`;
      }

      await execAsync(ffmpegCommand);

      if (fs.existsSync(outputPath)) {
        const stickerBuffer = fs.readFileSync(outputPath);
        console.log(
          `✅ Vídeo convertido: ${(stickerBuffer.length / 1024).toFixed(1)}KB`
        );

        this.cleanup([inputPath, outputPath]);
        return stickerBuffer;
      } else {
        console.error("❌ Erro na conversão do vídeo");
        this.cleanup([inputPath]);
        return null;
      }
    } catch (error) {
      console.error("Erro na conversão de vídeo:", error.message);
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
    if (message.message?.documentMessage) {
      const mimetype = message.message.documentMessage.mimetype || "";
      if (mimetype.includes("gif")) return "gif";
      if (mimetype.includes("video")) return "video";
      if (mimetype.includes("image")) return "image";
    }
    return "image";
  }

  getFileExtension(type) {
    switch (type) {
      case "video":
        return "mp4";
      case "gif":
        return "gif";
      default:
        return "jpg";
    }
  }

  async sendMessage(jid, text) {
    try {
      if (this.sock && this.sock.user) {
        await this.sock.sendMessage(jid, { text });
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error.message);
    }
  }

  cleanup(files) {
    files.forEach((file) => {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      } catch (error) {
        
      }
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


process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Erro não tratado:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Exceção não capturada:", error.message);
});

initBot();

module.exports = WhatsAppStickerBot;
