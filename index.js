import {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  downloadMediaMessage,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { exec } from "child_process";
import { promisify } from "util";
import pino from "pino";

let qrcode;
try {
  const qrcodeModule = await import("qrcode-terminal");
  qrcode = qrcodeModule.default;
} catch (e) {
  console.log("💡 Para QR Code visual, instale: npm install qrcode-terminal");
}


// ============================================================================
// CONSTANTES
// ============================================================================

const execAsync = promisify(exec);

const CONFIG = {
  TEMP_DIR: "./temp",
  AUTH_DIR: "./auth_info",
  BLACKLIST_FILE: "./blacklist.json",
  OWNER_NUMBER: "YOUR_NUMBER",
  MAX_RECONNECT_ATTEMPTS: 3,
  RECONNECT_DELAY: 5000,
  MIN_CLEAN_INTERVAL: 60000,
  STICKER_SIZE: 512,
  STICKER_QUALITY: 90,
  VIDEO_DURATION: 6,
  GIF_DURATION: 8,
  GIF_FPS: 15,
  VIDEO_FPS: 15,
  MAX_FILE_SIZE: 800,
  WEBP_QUALITY: 75,
  MAX_GIF_FRAMES: 50,
  TIMEOUT_MS: 60000,
  KEEPALIVE_MS: 30000,
};

const COMMANDS = {
  STICKER: "!sticker",
  IMAGE: "!image",
  GIF: "!gif",
  EVERYONE: "@everyone",
  BLACKLIST_ADD: "!blacklist add",
  BLACKLIST_REMOVE: "!blacklist remove",
  BLACKLIST_LIST: "!blacklist list",
  BLACKLIST_CLEAR: "!blacklist clear"
};

const MESSAGES = {
  INITIALIZING: "🤖 WhatsApp Sticker Bot - Conversor Completo",
  STICKER_COMMAND: "🔄 !sticker - Converte imagem/vídeo para sticker",
  IMAGE_COMMAND: "🖼️ !image - Converte sticker para imagem",
  GIF_COMMAND: "🎬 !gif - Converte sticker animado para GIF",
  WAITING_QR: "📱 Aguarde o QR Code...",
  CONNECTING: "🔄 Iniciando conexão com WhatsApp...",
  CONNECTED: "✅ Conectado com sucesso!",
  BOT_READY: "🎯 Bot pronto para uso",
  DISCONNECTED: "❌ Conexão fechada:",
  SEND_MEDIA_STICKER: "ℹ️ Envie uma mídia com !sticker",
  REPLY_MEDIA_STICKER: "ℹ️ Responda a uma imagem/vídeo com !sticker",
  SEND_STICKER_IMAGE: "ℹ️ Envie um sticker com !image",
  REPLY_STICKER_IMAGE: "ℹ️ Responda a um sticker com !image",
  SEND_STICKER_GIF: "ℹ️ Envie um sticker animado com !gif",
  REPLY_STICKER_GIF: "ℹ️ Responda a um sticker animado com !gif",
  STATIC_STICKER: "ℹ️ Este é um sticker estático. Use !image para converter",
  CONVERTED_IMAGE: "🖼️ Convertido!",
  EVERYONE_COMMAND: "📢 @everyone - Marca todos os integrantes do grupo",
  CONVERTED_GIF: "🎬 Convertido!",
  DOWNLOAD_ERROR: "❌ Erro ao baixar",
  CONVERSION_ERROR: "❌ Erro na conversão",
  UNSUPPORTED_FORMAT:
    "❌ Este sticker usa um formato que não consigo converter. Desculpe!",
  GENERAL_ERROR: "❌ Erro",
};

// ============================================================================
// UTILIDADES
// ============================================================================

class FileSystem {
  static ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  static removeDir(dirPath) {
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        if (fs.statSync(filePath).isDirectory()) {
          this.removeDir(filePath);
        } else {
          fs.unlinkSync(filePath);
        }
      }
      fs.rmdirSync(dirPath);
    }
  }

  static cleanupFiles(files) {
    files.forEach((file) => {
      try {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      } catch (e) {
        // Ignora erros de limpeza
      }
    });
  }

  static cleanupDir(dirPath) {
    try {
      if (fs.existsSync(dirPath)) {
        fs.readdirSync(dirPath).forEach((file) => {
          try {
            fs.unlinkSync(path.join(dirPath, file));
          } catch (e) {
            // Ignora erros
          }
        });
      }
    } catch (e) {
      // Ignora erros
    }
  }
}

class Logger {
  static info(message) {
    console.log(message);
  }

  static error(message, error = null) {
    console.error(message, error?.message || "");
  }

  static warn(message) {
    console.warn(message);
  }
}

// ============================================================================
// PROCESSADORES DE MÍDIA
// ============================================================================

class ImageProcessor {
  static async toSticker(buffer) {
    return sharp(buffer)
      .resize(CONFIG.STICKER_SIZE, CONFIG.STICKER_SIZE, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .webp({ quality: CONFIG.STICKER_QUALITY })
      .toBuffer();
  }

  static async toPng(buffer) {
    return sharp(buffer).png({ quality: 100 }).toBuffer();
  }

  static async extractFrame(buffer, pageIndex, outputDir) {
    const framePath = path.join(
      outputDir,
      `frame_${String(pageIndex).padStart(3, "0")}.png`
    );

    await sharp(buffer, { page: pageIndex })
      .resize(CONFIG.STICKER_SIZE, CONFIG.STICKER_SIZE, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      })
      .png()
      .toFile(framePath);

    return framePath;
  }

  static async getMetadata(buffer) {
    return sharp(buffer).metadata();
  }
}

class VideoConverter {
  static async toSticker(buffer, isGif = false) {
    const input = this.createTempPath(isGif ? "gif" : "mp4", "in");
    const output = this.createTempPath("webp", "out");

    fs.writeFileSync(input, buffer);

    const duration = isGif ? CONFIG.GIF_DURATION : CONFIG.VIDEO_DURATION;
    const cmd = `ffmpeg -i "${input}" -t ${duration} -vf "scale=512:512:force_original_aspect_ratio=increase,crop=512:512,fps=${CONFIG.VIDEO_FPS}" -c:v libwebp -quality ${CONFIG.WEBP_QUALITY} -loop 0 -an -fs ${CONFIG.MAX_FILE_SIZE}K "${output}"`;

    try {
      await execAsync(cmd);
      const result = fs.existsSync(output) ? fs.readFileSync(output) : null;
      FileSystem.cleanupFiles([input, output]);
      return result;
    } catch (error) {
      FileSystem.cleanupFiles([input, output]);
      throw error;
    }
  }

  static async toGif(framesPattern) {
    const output = this.createTempPath("gif");
    const cmd = `ffmpeg -y -framerate ${CONFIG.GIF_FPS} -i "${framesPattern}" -vf "split[s0][s1];[s0]palettegen=max_colors=256[p];[s1][p]paletteuse=dither=bayer" -loop 0 "${output}"`;

    await execAsync(cmd);
    return output;
  }

  static async toMp4(input) {
    const output = this.createTempPath("mp4", "video");
    const cmd = `ffmpeg -y -i "${input}" -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -c:v libx264 -preset fast -crf 23 "${output}"`;

    await execAsync(cmd);
    return output;
  }

  static createTempPath(extension, prefix = "temp") {
    return path.join(CONFIG.TEMP_DIR, `${prefix}_${Date.now()}.${extension}`);
  }
}

// ============================================================================
// GERENCIADOR DE CONEXÃO
// ============================================================================

class ConnectionManager {
  constructor() {
    this.sock = null;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.lastCleanTime = 0;
  }

  async initialize() {
    if (this.isConnecting) {
      Logger.info("⏳ Já existe uma tentativa de conexão em andamento...");
      return;
    }

    this.isConnecting = true;

    try {
      this.closeSafely();
      Logger.info(MESSAGES.CONNECTING);

      const { version, isLatest } = await fetchLatestBaileysVersion();
      Logger.info(`📦 Usando WA v${version.join(".")}, isLatest: ${isLatest}`);

      const { state, saveCreds } = await useMultiFileAuthState(CONFIG.AUTH_DIR);
      const logger = pino({ level: process.env.LOG_LEVEL || "silent" });

      this.sock = makeWASocket({
        version,
        auth: state,
        logger,
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        printQRInTerminal: false,
        defaultQueryTimeoutMs: CONFIG.TIMEOUT_MS,
        connectTimeoutMs: CONFIG.TIMEOUT_MS,
        keepAliveIntervalMs: CONFIG.KEEPALIVE_MS,
        emitOwnEvents: false,
        markOnlineOnConnect: true,
        syncFullHistory: false,
        generateHighQualityLinkPreview: false,
        getMessage: async () => undefined,
      });

      this.setupEventHandlers(saveCreds);
    } catch (error) {
      Logger.error("❌ Erro ao iniciar o bot:", error);
      this.isConnecting = false;
      await this.handleInitializationError(error);
    }
  }

  closeSafely() {
    if (this.sock) {
      try {
        this.sock.end(undefined);
      } catch (error) {
        // Ignora erros ao fechar
      }
      this.sock = null;
    }
  }

  setupEventHandlers(saveCreds) {
    this.sock.ev.on("connection.update", (update) =>
      this.handleConnectionUpdate(update)
    );

    this.sock.ev.on("creds.update", saveCreds);

    this.sock.ev.on("messages.upsert", (m) => this.handleMessagesUpsert(m));
  }

  async handleConnectionUpdate(update) {
    const { connection, lastDisconnect, qr } = update;

    try {
      if (qr) {
        this.displayQrCode(qr);
      }

      if (connection === "close") {
        await this.handleDisconnection(lastDisconnect);
      } else if (connection === "connecting") {
        Logger.info("🔗 Conectando...");
      } else if (connection === "open") {
        Logger.info(MESSAGES.CONNECTED);
        Logger.info(MESSAGES.BOT_READY);
        this.isConnecting = false;
        this.reconnectAttempts = 0;
      }
    } catch (error) {
      Logger.error("Erro no handler de conexão:", error);
      this.isConnecting = false;
    }
  }

  displayQrCode(qr) {
    Logger.info("\n📱 QR Code gerado! Escaneie com seu WhatsApp:\n");

    if (qrcode) {
      qrcode.generate(qr, { small: true });
    } else {
      Logger.info("QR Code (texto):", qr);
      Logger.info("\n💡 Instale qrcode-terminal para QR visual\n");
    }
    Logger.info("⏰ QR Code expira em ~60 segundos\n");
  }

  async handleDisconnection(lastDisconnect) {
    this.isConnecting = false;
    const statusCode = lastDisconnect?.error?.output?.statusCode;
    const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

    Logger.info(
      MESSAGES.DISCONNECTED,
      lastDisconnect?.error?.message || "Desconhecido"
    );

    if (statusCode) {
      Logger.info(`📊 Status Code: ${statusCode}`);
    }

    if (this.isAuthenticationError(statusCode)) {
      await this.cleanAndRestart();
    } else if (statusCode === DisconnectReason.loggedOut) {
      Logger.info("🔄 Deslogado do WhatsApp - gerando novo QR");
      await this.cleanAndRestart();
    } else if (shouldReconnect) {
      await this.reconnect();
    } else {
      Logger.info("🛑 Bot finalizado");
      process.exit(0);
    }
  }

  isAuthenticationError(statusCode) {
    return [405, 401, 403].includes(statusCode);
  }

  async handleMessagesUpsert(m) {
    try {
      const message = m.messages[0];
      if (message) {
        await MessageHandler.process(message, this.sock);
      }
    } catch (error) {
      Logger.error("Erro ao processar mensagem:", error);
    }
  }

  async cleanAndRestart() {
    Logger.info("🧹 Limpando sessão...");
    this.lastCleanTime = Date.now();

    try {
      this.closeSafely();

      if (fs.existsSync(CONFIG.AUTH_DIR)) {
        FileSystem.removeDir(CONFIG.AUTH_DIR);
        Logger.info("✅ Sessão removida");
      }

      await new Promise((r) => setTimeout(r, 3000));
      Logger.info("🚀 Reiniciando...\n");

      this.reconnectAttempts = 0;
      this.isConnecting = false;
      await this.initialize();
    } catch (error) {
      Logger.error("❌ Erro ao limpar:", error);
      Logger.warn("⚠️ Remova manualmente a pasta 'auth_info' e reinicie");
      process.exit(1);
    }
  }

  async reconnect() {
    if (this.reconnectAttempts >= CONFIG.MAX_RECONNECT_ATTEMPTS) {
      Logger.info(
        `❌ Máximo de ${CONFIG.MAX_RECONNECT_ATTEMPTS} tentativas atingido`
      );
      Logger.info("🧹 Limpando sessão...\n");
      await this.cleanAndRestart();
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      CONFIG.RECONNECT_DELAY * this.reconnectAttempts,
      15000
    );

    Logger.info(
      `⏳ Reconectando em ${delay / 1000}s (${this.reconnectAttempts}/${CONFIG.MAX_RECONNECT_ATTEMPTS
      })...`
    );

    await new Promise((r) => setTimeout(r, delay));
    this.isConnecting = false;
    await this.initialize();
  }

  async handleInitializationError(error) {
    const now = Date.now();
    if (now - this.lastCleanTime > CONFIG.MIN_CLEAN_INTERVAL) {
      if (this.isAuthError(error.message)) {
        await this.cleanAndRestart();
      } else {
        await this.reconnect();
      }
    } else {
      Logger.info("⏳ Aguardando antes de tentar novamente...");
      await new Promise((r) => setTimeout(r, 10000));
      await this.reconnect();
    }
  }

  isAuthError(message) {
    return ["405", "auth", "401", "Connection Failure"].some((err) =>
      message.includes(err)
    );
  }

  gracefulShutdown() {
    Logger.info("\n🛑 Finalizando...");
    this.closeSafely();
    FileSystem.cleanupDir(CONFIG.TEMP_DIR);
    Logger.info("✅ Finalizado");
    process.exit(0);
  }
}

// ============================================================================
// PROCESSADOR DE MENSAGENS
// ============================================================================

class MessageHandler {
  static async process(message, sock) {
  const jid = message.key.remoteJid;
  const text = this.extractText(message);

  if (!text) return;

  if (await this.handleBlacklistCommands(message, sock, text)) {
    return;
  }

  if (BlacklistManager.isBlocked(jid)) {
    Logger.info(`🚫 Mensagem ignorada de grupo bloqueado: ${jid}`);
    return;
  }

  const command = this.detectCommand(text);

  if (command === COMMANDS.STICKER) {
    await this.handleStickerCommand(message, sock);
  } else if (command === COMMANDS.IMAGE) {
    await this.handleImageCommand(message, sock);
  } else if (command === COMMANDS.GIF) {
    await this.handleGifCommand(message, sock);
  } else if (command === COMMANDS.EVERYONE) {
    await GroupManager.mentionEveryone(message, sock);
  }
}

  static detectCommand(text) {
    const lower = text.toLowerCase();
    if (lower.includes(COMMANDS.STICKER)) return COMMANDS.STICKER;
    if (lower.includes(COMMANDS.IMAGE)) return COMMANDS.IMAGE;
    if (lower.includes(COMMANDS.GIF)) return COMMANDS.GIF;
    if (lower.includes(COMMANDS.EVERYONE.toLowerCase())) return COMMANDS.EVERYONE;
    return null;
  }

  static extractText(message) {
    return (
      message.message?.conversation ||
      message.message?.extendedTextMessage?.text ||
      message.message?.imageMessage?.caption ||
      message.message?.videoMessage?.caption ||
      null
    );
  }

  static async handleStickerCommand(message, sock) {
    if (MessageHandler.hasMedia(message)) {
      await MediaProcessor.processToSticker(message, sock);
    } else if (MessageHandler.hasQuotedMessage(message)) {
      const quoted = MessageHandler.extractQuotedMessage(message);
      if (MessageHandler.hasMedia(quoted)) {
        await MediaProcessor.processToSticker(
          quoted,
          sock,
          message.key.remoteJid
        );
      } else {
        await MessageHandler.sendMessage(
          sock,
          message.key.remoteJid,
          MESSAGES.REPLY_MEDIA_STICKER
        );
      }
    } else {
      await MessageHandler.sendMessage(
        sock,
        message.key.remoteJid,
        MESSAGES.SEND_MEDIA_STICKER
      );
    }
  }

  static async handleImageCommand(message, sock) {
    if (MessageHandler.hasSticker(message)) {
      await MediaProcessor.processStickerToImage(message, sock);
    } else if (MessageHandler.hasQuotedMessage(message)) {
      const quoted = MessageHandler.extractQuotedMessage(message);
      if (MessageHandler.hasSticker(quoted)) {
        await MediaProcessor.processStickerToImage(
          quoted,
          sock,
          message.key.remoteJid
        );
      } else {
        await MessageHandler.sendMessage(
          sock,
          message.key.remoteJid,
          MESSAGES.REPLY_STICKER_IMAGE
        );
      }
    } else {
      await MessageHandler.sendMessage(
        sock,
        message.key.remoteJid,
        MESSAGES.SEND_STICKER_IMAGE
      );
    }
  }

  static async handleGifCommand(message, sock) {
    if (MessageHandler.hasSticker(message)) {
      await MediaProcessor.processStickerToGif(message, sock);
    } else if (MessageHandler.hasQuotedMessage(message)) {
      const quoted = MessageHandler.extractQuotedMessage(message);
      if (MessageHandler.hasSticker(quoted)) {
        await MediaProcessor.processStickerToGif(
          quoted,
          sock,
          message.key.remoteJid
        );
      } else {
        await MessageHandler.sendMessage(
          sock,
          message.key.remoteJid,
          MESSAGES.REPLY_STICKER_GIF
        );
      }
    } else {
      await MessageHandler.sendMessage(
        sock,
        message.key.remoteJid,
        MESSAGES.SEND_STICKER_GIF
      );
    }
  }

  static hasMedia(message) {
    return !!(message.message?.imageMessage || message.message?.videoMessage);
  }

  static hasSticker(message) {
    return !!message.message?.stickerMessage;
  }

  static hasQuotedMessage(message) {
    return !!message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  }

  static extractQuotedMessage(message) {
    return {
      message: message.message.extendedTextMessage.contextInfo.quotedMessage,
      key: {
        remoteJid: message.key.remoteJid,
        id: message.message.extendedTextMessage.contextInfo.stanzaId,
      },
    };
  }

  static getMessageType(message) {
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

  static async sendMessage(sock, jid, text) {
    try {
      if (sock?.user) {
        await sock.sendMessage(jid, { text });
      }
    } catch (error) {
      Logger.error("Erro ao enviar:", error);
    }
  }

  static async handleBlacklistCommands(message, sock, text) {
    const jid = message.key.remoteJid;
    const lower = text.toLowerCase();

    let senderNumber = null;
    if (message.key.participantPn) {
      senderNumber = message.key.participantPn.split('@')[0].split(':')[0];
    } else if (message.key.participant) {
      senderNumber = message.key.participant.split('@')[0].split(':')[0];
    } else if (message.key.remoteJid) {
      senderNumber = message.key.remoteJid.split('@')[0].split(':')[0];
    }

    if (lower === "!meunumero") {
      await this.sendMessage(sock, jid,
        `📱 Número detectado: ${senderNumber}\n\n` +
        `Se este for seu número, configure em CONFIG.OWNER_NUMBER`
      );
      return true;
    }

    const fromMe = message.key.fromMe;
    const isOwner = fromMe || senderNumber === CONFIG.OWNER_NUMBER;

    if (!isOwner) {
      return false;
    }

    if (lower.includes("!blacklist")) {
      if (lower.includes("add")) {
        if (BlacklistManager.add(jid)) {
          await this.sendMessage(sock, jid, "🚫 Este grupo foi adicionado à blacklist. Até logo!");
          Logger.info(`✅ Grupo ${jid} bloqueado`);
        } else {
          await this.sendMessage(sock, jid, "⚠️ Só posso bloquear grupos!");
        }
        return true;
      }

      if (lower.includes("remove")) {
        if (BlacklistManager.remove(jid)) {
          await this.sendMessage(sock, jid, "✅ Este grupo foi removido da blacklist!");
        } else {
          await this.sendMessage(sock, jid, "⚠️ Este grupo não estava na blacklist");
        }
        return true;
      }

      if (lower.includes("list")) {
        const list = BlacklistManager.list();
        if (list.length === 0) {
          await this.sendMessage(sock, jid, "📋 Nenhum grupo na blacklist");
        } else {
          const listMessage = `📋 *Grupos bloqueados (${list.length}):*\n\n${list.join('\n')}`;
          await this.sendMessage(sock, jid, listMessage);
        }
        return true;
      }

      if (lower.includes("clear")) {
        BlacklistManager.clear();
        await this.sendMessage(sock, jid, "🗑️ Blacklist limpa!");
        return true;
      }

      await this.sendMessage(sock, jid,
        `📋 *Comandos de Blacklist:*\n\n` +
        `!blacklist add - Bloqueia grupo atual\n` +
        `!blacklist remove - Desbloqueia grupo atual\n` +
        `!blacklist list - Lista grupos bloqueados\n` +
        `!blacklist clear - Limpa toda a blacklist`
      );
      return true;
    }

    return false;
  }
}

// ============================================================================
// PROCESSADOR DE MÍDIA
// ============================================================================

class MediaProcessor {
  static async processToSticker(message, sock, targetJid = null) {
    try {
      const jid = targetJid || message.key.remoteJid;
      const buffer = await this.downloadMedia(message, sock);

      if (!buffer) {
        await MessageHandler.sendMessage(sock, jid, MESSAGES.DOWNLOAD_ERROR);
        return;
      }

      const type = MessageHandler.getMessageType(message);
      let stickerBuffer;

      if (type === "image") {
        stickerBuffer = await ImageProcessor.toSticker(buffer);
      } else {
        stickerBuffer = await VideoConverter.toSticker(buffer, type === "gif");
      }

      if (stickerBuffer) {
        await sock.sendMessage(jid, { sticker: stickerBuffer });
        Logger.info("✅ Sticker enviado");
      } else {
        await MessageHandler.sendMessage(sock, jid, MESSAGES.CONVERSION_ERROR);
      }
    } catch (error) {
      Logger.error("Erro:", error);
      await MessageHandler.sendMessage(
        sock,
        targetJid || message.key.remoteJid,
        MESSAGES.GENERAL_ERROR
      );
    }
  }

  static async processStickerToImage(message, sock, targetJid = null) {
    try {
      const jid = targetJid || message.key.remoteJid;
      const buffer = await this.downloadMedia(message, sock);

      if (!buffer) {
        await MessageHandler.sendMessage(sock, jid, MESSAGES.DOWNLOAD_ERROR);
        return;
      }

      const imageBuffer = await ImageProcessor.toPng(buffer);

      await sock.sendMessage(jid, {
        image: imageBuffer,
        caption: MESSAGES.CONVERTED_IMAGE,
      });

      Logger.info("✅ Imagem enviada");
    } catch (error) {
      Logger.error("Erro:", error);
      await MessageHandler.sendMessage(
        sock,
        targetJid || message.key.remoteJid,
        MESSAGES.CONVERSION_ERROR
      );
    }
  }

  static async processStickerToGif(message, sock, targetJid = null) {
    try {
      Logger.info("🎬 Convertendo sticker para GIF...");
      const jid = targetJid || message.key.remoteJid;

      const buffer = await this.downloadMedia(message, sock);

      if (!buffer) {
        await MessageHandler.sendMessage(sock, jid, MESSAGES.DOWNLOAD_ERROR);
        return;
      }

      Logger.info("📁 Sticker baixado");
      Logger.info(`📊 Tamanho: ${(buffer.length / 1024).toFixed(1)}KB`);

      await this.processAnimatedSticker(buffer, sock, jid);
    } catch (error) {
      Logger.error("❌ Erro geral:", error);
      await MessageHandler.sendMessage(
        sock,
        targetJid || message.key.remoteJid,
        MESSAGES.CONVERSION_ERROR
      );
    }
  }

  static async processAnimatedSticker(buffer, sock, jid) {
    const tempDir = path.join(CONFIG.TEMP_DIR, `frames_${Date.now()}`);
    FileSystem.ensureDir(tempDir);

    try {
      const metadata = await ImageProcessor.getMetadata(buffer);
      Logger.info(
        `📐 Dimensões: ${metadata.width}x${metadata.height}, páginas: ${metadata.pages || 1
        }`
      );

      if (!metadata.pages || metadata.pages === 1) {
        await MessageHandler.sendMessage(sock, jid, MESSAGES.STATIC_STICKER);
        fs.rmSync(tempDir, { recursive: true, force: true });
        return;
      }

      Logger.info(`🎞️ Sticker tem ${metadata.pages} frames`);

      await this.extractFrames(buffer, tempDir, metadata.pages);
      await this.createAndSendGif(tempDir, sock, jid);
    } catch (error) {
      Logger.error("❌ Erro ao processar:", error);
      await this.tryAlternativeMethod(buffer, sock, jid);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }

  static async extractFrames(buffer, tempDir, pageCount) {
    Logger.info("🔄 Extraindo frames do sticker animado...");

    for (let i = 0; i < Math.min(pageCount, CONFIG.MAX_GIF_FRAMES); i++) {
      await ImageProcessor.extractFrame(buffer, i, tempDir);
    }

    Logger.info("✅ Frames extraídos");
  }

  static async createAndSendGif(tempDir, sock, jid) {
    const framesPattern = path.join(tempDir, "frame_%03d.png");
    const gifOutput = await VideoConverter.toGif(framesPattern);

    if (!fs.existsSync(gifOutput) || fs.statSync(gifOutput).size === 0) {
      throw new Error("GIF não foi criado");
    }

    const gifSizeKB = (fs.statSync(gifOutput).size / 1024).toFixed(1);
    Logger.info(`✅ GIF criado: ${gifSizeKB}KB`);

    Logger.info("🔄 Convertendo GIF → MP4 para WhatsApp...");
    const mp4Output = await VideoConverter.toMp4(gifOutput);

    if (!fs.existsSync(mp4Output) || fs.statSync(mp4Output).size === 0) {
      throw new Error("Falha ao criar MP4");
    }

    const mp4Buffer = fs.readFileSync(mp4Output);
    const mp4SizeKB = (mp4Buffer.length / 1024).toFixed(1);
    Logger.info(`✅ MP4 criado: ${mp4SizeKB}KB`);

    await sock.sendMessage(jid, {
      video: mp4Buffer,
      caption: MESSAGES.CONVERTED_GIF,
      gifPlayback: true,
    });

    Logger.info("✅ Enviado como GIF animado!");
    FileSystem.cleanupFiles([mp4Output, gifOutput]);
  }

  static async tryAlternativeMethod(buffer, sock, jid) {
    try {
      Logger.info("🔄 Tentando método alternativo...");

      const inputWebp = path.join(
        CONFIG.TEMP_DIR,
        `sticker_${Date.now()}.webp`
      );
      fs.writeFileSync(inputWebp, buffer);

      const gifOutput = path.join(CONFIG.TEMP_DIR, `gif_${Date.now()}.gif`);

      const altCmd = `ffmpeg -y -i "${inputWebp}" -vf "fps=${CONFIG.GIF_FPS},scale=512:512:flags=lanczos" -loop 0 "${gifOutput}"`;

      await execAsync(altCmd);

      if (!fs.existsSync(gifOutput) || fs.statSync(gifOutput).size === 0) {
        throw new Error("Método alternativo falhou");
      }

      const mp4Output = await VideoConverter.toMp4(gifOutput);

      if (fs.existsSync(mp4Output)) {
        const mp4Buffer = fs.readFileSync(mp4Output);
        await sock.sendMessage(jid, {
          video: mp4Buffer,
          caption: MESSAGES.CONVERTED_GIF,
          gifPlayback: true,
        });
        Logger.info("✅ Método alternativo funcionou!");
        FileSystem.cleanupFiles([mp4Output]);
      }

      FileSystem.cleanupFiles([inputWebp, gifOutput]);
    } catch (error) {
      Logger.error("Todos os métodos falharam", error);
      await MessageHandler.sendMessage(sock, jid, MESSAGES.UNSUPPORTED_FORMAT);
    }
  }

  static async downloadMedia(message, sock) {
    try {
      return await downloadMediaMessage(
        message,
        "buffer",
        {},
        {
          logger: undefined,
          reuploadRequest: sock.updateMediaMessage,
        }
      );
    } catch (error) {
      Logger.error("Erro ao baixar mídia:", error);
      return null;
    }
  }
}

// ============================================================================
// GERENCIADOR DE GRUPOS
// ============================================================================

class GroupManager {
  static async mentionEveryone(message, sock) {
    try {
      const jid = message.key.remoteJid;

      if (!jid.endsWith('@g.us')) {
        await MessageHandler.sendMessage(
          sock,
          jid,
          "⚠️ Este comando só funciona em grupos!"
        );
        return;
      }

      const groupMetadata = await sock.groupMetadata(jid);
      const participants = groupMetadata.participants;

      const sender = message.key.participant || message.key.remoteJid;
      const isAdmin = participants.find(p => p.id === sender)?.admin;

      if (!isAdmin) {
        await MessageHandler.sendMessage(sock, jid, "⚠️ Apenas administradores podem usar este comando!");
        return;
      }

      const mentions = participants.map(p => p.id);

      const text = participants
        .map(p => `@${p.id.split('@')[0]}`)
        .join(' ');

      await sock.sendMessage(jid, {
        text: `📢 *Atenção geral!*\n\n${text}`,
        mentions: mentions
      });

      Logger.info(`✅ Mencionados ${participants.length} participantes`);
    } catch (error) {
      Logger.error("Erro ao mencionar todos:", error);
      await MessageHandler.sendMessage(
        sock,
        message.key.remoteJid,
        "❌ Erro ao mencionar participantes"
      );
    }
  }
}

// ============================================================================
// GERENCIADOR DE BLACKLIST
// ============================================================================

class BlacklistManager {
  static blacklist = new Set();

  static initialize() {
    try {
      if (fs.existsSync(CONFIG.BLACKLIST_FILE)) {
        const data = JSON.parse(fs.readFileSync(CONFIG.BLACKLIST_FILE, 'utf8'));
        this.blacklist = new Set(data.groups || []);
        Logger.info(`📋 Blacklist carregada: ${this.blacklist.size} grupos bloqueados`);
      } else {
        this.save();
        Logger.info("📋 Arquivo de blacklist criado");
      }
    } catch (error) {
      Logger.error("Erro ao carregar blacklist:", error);
      this.blacklist = new Set();
    }
  }

  static save() {
    try {
      const data = {
        groups: Array.from(this.blacklist),
        lastUpdate: new Date().toISOString()
      };
      fs.writeFileSync(CONFIG.BLACKLIST_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      Logger.error("Erro ao salvar blacklist:", error);
    }
  }

  static isBlocked(jid) {
    return this.blacklist.has(jid);
  }

  static add(jid) {
    if (!jid.endsWith('@g.us')) {
      return false; 
    }
    this.blacklist.add(jid);
    this.save();
    Logger.info(`🚫 Grupo adicionado à blacklist: ${jid}`);
    return true;
  }

  static remove(jid) {
    const removed = this.blacklist.delete(jid);
    if (removed) {
      this.save();
      Logger.info(`✅ Grupo removido da blacklist: ${jid}`);
    }
    return removed;
  }

  static list() {
    return Array.from(this.blacklist);
  }

  static clear() {
    this.blacklist.clear();
    this.save();
    Logger.info("🗑️ Blacklist limpa");
  }
}

// ============================================================================
// INICIALIZAÇÃO
// ============================================================================

class BotInitializer {
  static async start() {
    try {
      FileSystem.ensureDir(CONFIG.TEMP_DIR);
      FileSystem.ensureDir(CONFIG.AUTH_DIR);


      BlacklistManager.initialize();

      Logger.info(MESSAGES.INITIALIZING);
      Logger.info(MESSAGES.STICKER_COMMAND);
      Logger.info(MESSAGES.IMAGE_COMMAND);
      Logger.info(MESSAGES.GIF_COMMAND);
      Logger.info(MESSAGES.EVERYONE_COMMAND);
      Logger.info(MESSAGES.WAITING_QR);

      const connectionManager = new ConnectionManager();

      process.on("SIGINT", () => connectionManager.gracefulShutdown());
      process.on("SIGTERM", () => connectionManager.gracefulShutdown());

      await connectionManager.initialize();
    } catch (error) {
      Logger.error("❌ Erro fatal:", error);
      process.exit(1);
    }
  }
}

async function initializeBot() {
  await BotInitializer.start();
}

// ============================================================================
// EVENT LISTENERS GLOBAIS
// ============================================================================

process.on("unhandledRejection", (reason) => {
  Logger.error("❌ Unhandled Rejection:", reason);
});

process.on("uncaughtException", (error) => {
  Logger.error("❌ Uncaught Exception:", error);
});

// ============================================================================
// INICIAR BOT
// ============================================================================

initializeBot();

export default ConnectionManager;
