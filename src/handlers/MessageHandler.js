import { COMMANDS, CONFIG } from "../config/constants.js";
import { MESSAGES } from "../config/messages.js";
import { Logger } from "../utils/Logger.js";
import { MediaProcessor } from "./MediaProcessor.js";
import { GroupManager } from "../managers/GroupManager.js";
import { BlacklistManager } from "../managers/BlacklistManager.js";

export class MessageHandler {
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