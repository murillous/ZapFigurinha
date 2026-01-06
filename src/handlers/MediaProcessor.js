import { downloadMediaMessage } from "@whiskeysockets/baileys";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { CONFIG, MESSAGES } from "../config/constants.js";
import { Logger } from "../utils/Logger.js";
import { MessageHandler } from "./MessageHandler.js";
import { ImageProcessor } from "../processors/ImageProcessor.js";
import { VideoConverter } from "../processors/VideoConverter.js";
import { FileSystem } from "../utils/FileSystem.js";

const execAsync = promisify(exec);

export class MediaProcessor {
  static async processToSticker(message, sock, targetJid = null) {
    if (
      message.message?.viewOnceMessage ||
      message.message?.viewOnceMessageV2
    ) {
      Logger.info(
        "Mensagem de visualização única. Sticker não pode ser criado"
      );
      return;
    }
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
        `📐 Dimensões: ${metadata.width}x${metadata.height}, páginas: ${
          metadata.pages || 1
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

  static async processUrlToSticker(url, sock, message) {
    const jid = message.key.remoteJid;

    try {
      Logger.info(`🔗 Baixando mídia da URL: ${url}`);
      await MessageHandler.sendMessage(
        sock,
        jid,
        "🔄 Baixando mídia da URL..."
      );

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Falha ao baixar: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type");
      const contentLength = response.headers.get("content-length");

      if (
        contentLength &&
        parseInt(contentLength) > CONFIG.MAX_FILE_SIZE * 1024 * 5
      ) {
        await MessageHandler.sendMessage(
          sock,
          jid,
          "❌ Arquivo muito grande para processar."
        );
        return;
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (!buffer || buffer.length === 0) {
        throw new Error("Buffer vazio");
      }

      let stickerBuffer;

      if (
        contentType &&
        (contentType.startsWith("video/") || contentType.includes("gif"))
      ) {
        const isGif = contentType.includes("gif");
        stickerBuffer = await VideoConverter.toSticker(buffer, isGif);
      } else if (contentType && contentType.startsWith("image/")) {
        stickerBuffer = await ImageProcessor.toSticker(buffer);
      } else {
        Logger.warn(
          `⚠️ Content-Type desconhecido: ${contentType}, tentando como imagem.`
        );
        stickerBuffer = await ImageProcessor.toSticker(buffer);
      }

      if (stickerBuffer) {
        await sock.sendMessage(jid, { sticker: stickerBuffer });
        Logger.info("✅ Sticker via URL enviado");
      } else {
        await MessageHandler.sendMessage(sock, jid, MESSAGES.CONVERSION_ERROR);
      }
    } catch (error) {
      Logger.error("Erro ao processar URL:", error);
      await MessageHandler.sendMessage(
        sock,
        jid,
        "❌ Erro ao baixar ou converter o link."
      );
    }
  }
}
