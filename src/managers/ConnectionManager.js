import {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import fs from "fs";
import pino from "pino";
import { CONFIG } from "../config/constants.js";
import { MESSAGES } from "../config/messages.js";
import { Logger } from "../utils/Logger.js";
import { FileSystem } from "../utils/FileSystem.js";
import { MessageHandler } from "../handlers/MessageHandler.js";

let qrcode;
try {
  const qrcodeModule = await import("qrcode-terminal");
  qrcode = qrcodeModule.default;
} catch (e) {
  console.log("💡 Para QR Code visual, instale: npm install qrcode-terminal");
}

export class ConnectionManager {
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