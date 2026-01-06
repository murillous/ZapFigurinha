import { COMMANDS, CONFIG, MESSAGES, MENUS } from "../config/constants.js";
import { Logger } from "../utils/Logger.js";
import { MediaProcessor } from "./MediaProcessor.js";
import { GroupManager } from "../managers/GroupManager.js";
import { BlacklistManager } from "../managers/BlacklistManager.js";
import { LumaHandler } from "./LumaHandler.js";
import { LUMA_CONFIG } from "../config/lumaConfig.js";
import { PersonalityManager } from "../managers/PersonalityManager.js";
import dotenv from "dotenv";

dotenv.config();

export class MessageHandler {
  static lumaHandler = new LumaHandler();

  static async process(message, sock) {
    const jid = message.key.remoteJid;
    const text = this.extractText(message);

    if (jid.endsWith("@g.us") && BlacklistManager.isBlocked(jid)) {
      const ownerNumber = process.env.OWNER_NUMBER?.replace(/\D/g, "");
      const senderNumber = message.key.fromMe
        ? ownerNumber
        : await this.getSenderNumber(message, sock);
      const isOwner = message.key.fromMe || senderNumber === ownerNumber;

      if (!isOwner) {
        Logger.info(`🚫 Ignorado: ${jid}`);
        return;
      }
    }

    if (text) {
      if (await this.handleMenuReply(message, sock, text)) {
        return;
      }

      if (await this.handleAdminCommands(message, sock, text)) {
        return;
      }

      const command = this.detectCommand(text);

      if (command) {
        switch (command) {
          case COMMANDS.HELP:
            await this.sendHelp(sock, jid);
            return;

          case COMMANDS.PERSONA:
            await this.sendPersonalityMenu(sock, jid);
            return;

          case COMMANDS.STICKER:
            await this.handleStickerCommand(message, sock);
            return;

          case COMMANDS.IMAGE:
            await this.handleImageCommand(message, sock);
            return;

          case COMMANDS.GIF:
            await this.handleGifCommand(message, sock);
            return;

          case COMMANDS.EVERYONE:
            if (jid.endsWith("@g.us")) {
              await GroupManager.mentionEveryone(message, sock);
            } else {
              await this.sendMessage(
                sock,
                jid,
                "⚠️ Este comando só funciona em grupos!"
              );
            }
            return;
        }
      }
    }

    if (this.lumaHandler.isReplyToLuma(message)) {
      await this.handleLumaCommand(message, sock, true);
      return;
    }

    if (text && LumaHandler.isTriggered(text)) {
      await this.handleLumaCommand(message, sock, false);
      return;
    }
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

  static async handleAdminCommands(message, sock, text) {
    const jid = message.key.remoteJid;

    if (!text) return false;

    const lower = text.toLowerCase();

    let senderNumber = null;
    if (!message.key.fromMe) {
      senderNumber = await this.getSenderNumber(message, sock);
    }

    if (lower === COMMANDS.MY_NUMBER) {
      const debugInfo = message.key.fromMe
        ? `fromMe: true\nsock.user.id: ${sock.user?.id || "N/A"}`
        : `participant: ${message.key.participant || "N/A"}\nremoteJid: ${
            message.key.remoteJid
          }`;

      const detected = message.key.fromMe
        ? sock.user?.id?.split("@")[0].split(":")[0] || "Desconhecido"
        : senderNumber || "Não identificado";

      await this.sendMessage(
        sock,
        jid,
        `📱 Número detectado: ${detected}\n\n` +
          `Se este for seu número, configure em .env como OWNER_NUMBER\n\n` +
          `🔍 DEBUG:\n${debugInfo}`
      );
      return true;
    }

    const ownerNumber = process.env.OWNER_NUMBER?.replace(/\D/g, "");
    const isOwner =
      message.key.fromMe || (senderNumber && senderNumber === ownerNumber);

    if (!isOwner) return false;

    if (lower === COMMANDS.LUMA_STATS) {
      const stats = this.lumaHandler.getStats();
      const statsText =
        `📊 *Estatísticas da Luma*\n\n` +
        `💬 Conversas ativas: ${stats.totalConversations}\n\n` +
        (stats.conversations.length > 0
          ? stats.conversations
              .slice(0, 10)
              .map(
                (c) =>
                  `• ${c.jid}: ${c.messageCount} msgs\n  Última: ${c.lastUpdate}`
              )
              .join("\n")
          : "Nenhuma conversa no momento");

      await this.sendMessage(sock, jid, statsText);
      return true;
    }

    if (lower === COMMANDS.LUMA_CLEAR) {
      this.lumaHandler.clearHistory(jid);
      await this.sendMessage(
        sock,
        jid,
        "🗑️ Histórico da Luma limpo nesta conversa!"
      );
      return true;
    }

    if (lower.startsWith("!blacklist")) {
      const parts = lower.split(" ");
      const action = parts[1];

      if (action === "add") {
        if (!jid.endsWith("@g.us")) {
          await this.sendMessage(
            sock,
            jid,
            "⚠️ Este comando só funciona em grupos!"
          );
          return true;
        }

        const added = BlacklistManager.add(jid);
        if (added) {
          await this.sendMessage(
            sock,
            jid,
            "🚫 Grupo adicionado à blacklist! O bot ignorará mensagens daqui."
          );
        } else {
          await this.sendMessage(sock, jid, "❌ Erro ao adicionar à blacklist");
        }
        return true;
      }

      if (action === "remove") {
        if (!jid.endsWith("@g.us")) {
          await this.sendMessage(
            sock,
            jid,
            "⚠️ Este comando só funciona em grupos!"
          );
          return true;
        }

        const removed = BlacklistManager.remove(jid);
        if (removed) {
          await this.sendMessage(sock, jid, "✅ Grupo removido da blacklist!");
        } else {
          await this.sendMessage(
            sock,
            jid,
            "⚠️ Este grupo não estava na blacklist"
          );
        }
        return true;
      }

      if (action === "list") {
        const list = BlacklistManager.list();
        const listText =
          list.length > 0
            ? `📋 *Grupos bloqueados:*\n\n${list
                .map((g, i) => `${i + 1}. ${g}`)
                .join("\n")}`
            : "📋 Nenhum grupo na blacklist";

        await this.sendMessage(sock, jid, listText);
        return true;
      }

      if (action === "clear") {
        BlacklistManager.clear();
        await this.sendMessage(sock, jid, "🗑️ Blacklist limpa!");
        return true;
      }

      await this.sendMessage(
        sock,
        jid,
        `📋 *Comandos de Blacklist:*\n\n` +
          `!blacklist add - Bloqueia o grupo atual\n` +
          `!blacklist remove - Desbloqueia o grupo atual\n` +
          `!blacklist list - Lista grupos bloqueados\n` +
          `!blacklist clear - Limpa toda a blacklist`
      );
      return true;
    }

    return false;
  }

  static async getSenderNumber(message, sock) {
    try {
      let jid =
        message?.key?.participant ||
        message?.participant ||
        message?.message?.extendedTextMessage?.contextInfo?.participant ||
        message?.key?.remoteJid;

      if (!jid) return null;

      if (jid.includes("@lid")) {
        try {
          const results = await sock.onWhatsApp(jid);
          if (results && results.length > 0 && results[0]?.jid) {
            jid = results[0].jid;
          }
        } catch (e) {
          Logger.warn(`⚠️ Não foi possível resolver LID ${jid}: ${e.message}`);
        }
      }

      let number = jid.split("@")[0];
      if (number.includes(":")) number = number.split(":")[0];
      number = number.replace(/\D/g, "");

      return number || null;
    } catch (error) {
      Logger.error("❌ Erro ao extrair número:", error);
      return null;
    }
  }

  static async handleLumaCommand(message, sock, isReply = false) {
    try {
      const jid = message.key.remoteJid;
      const text = this.extractText(message);

      let userMessage = isReply
        ? text
        : this.lumaHandler.extractUserMessage(text);

      const quotedMessage = {
        key: message.key,
        message: message.message,
      };

      const hasVisualContent = await this.hasVisualContent(message);

      if (!userMessage && !hasVisualContent) {
        const response = await sock.sendMessage(
          jid,
          {
            text: this.lumaHandler.getRandomBoredResponse(),
          },
          { quoted: quotedMessage }
        );

        if (response?.key?.id) {
          this.lumaHandler.saveLastBotMessage(jid, response.key.id);
        }
        return;
      }

      if (!userMessage && hasVisualContent) {
        userMessage = "O que você acha dessa imagem?";
      }

      await sock.sendPresenceUpdate("composing", jid);
      await this.randomDelay();

      const responseText = await this.lumaHandler.generateResponse(
        userMessage,
        jid,
        message,
        sock
      );

      const sentMessage = await sock.sendMessage(
        jid,
        {
          text: responseText,
        },
        { quoted: quotedMessage }
      );

      if (sentMessage?.key?.id) {
        this.lumaHandler.saveLastBotMessage(jid, sentMessage.key.id);
      }
    } catch (error) {
      Logger.error("❌ Erro no comando da Luma:", error);
      await this.sendMessage(
        sock,
        message.key.remoteJid,
        "Num deu certo não. Bugou aqui, tenta depois"
      );
    }
  }

  static async hasVisualContent(message) {
    if (message.message?.imageMessage || message.message?.stickerMessage) {
      return true;
    }

    const quotedMsg =
      message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (quotedMsg?.imageMessage || quotedMsg?.stickerMessage) {
      return true;
    }

    return false;
  }

  static detectCommand(text) {
    const lower = text.toLowerCase();
    if (lower.includes(COMMANDS.STICKER)) return COMMANDS.STICKER;
    if (lower.includes(COMMANDS.IMAGE)) return COMMANDS.IMAGE;
    if (lower.includes(COMMANDS.GIF)) return COMMANDS.GIF;
    if (lower.includes(COMMANDS.EVERYONE.toLowerCase()))
      return COMMANDS.EVERYONE;
    if (lower.includes(COMMANDS.HELP) || lower === "!menu")
      return COMMANDS.HELP;
    if (lower.startsWith(COMMANDS.PERSONA)) return COMMANDS.PERSONA;
    return null;
  }

  static async handleStickerCommand(message, sock) {
    const text = this.extractText(message);
    const url = this.extractUrl(text);
    const jid = message.key.remoteJid;

    if (url) {
      await MediaProcessor.processUrlToSticker(url, sock, message);
      return;
    }

    if (MessageHandler.hasMedia(message)) {
      await MediaProcessor.processToSticker(message, sock);
    } else if (MessageHandler.hasQuotedMessage(message)) {
      const quoted = MessageHandler.extractQuotedMessage(message);
      if (MessageHandler.hasMedia(quoted)) {
        await MediaProcessor.processToSticker(quoted, sock, jid);
      } else {
        await MessageHandler.sendMessage(
          sock,
          jid,
          MESSAGES.REPLY_MEDIA_STICKER
        );
      }
    } else {
      await MessageHandler.sendMessage(
        sock,
        jid,
        MESSAGES.SEND_MEDIA_STICKER +
          " ou envie uma URL (ex: !sticker https://site.com/foto.jpg)"
      );
    }
  }

  static extractUrl(text) {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const match = text.match(urlRegex);
    return match ? match[0] : null;
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

  static async randomDelay() {
    const { min, max } = LUMA_CONFIG.TECHNICAL.thinkingDelay;
    await new Promise((resolve) =>
      setTimeout(resolve, min + Math.random() * (max - min))
    );
  }

  static async sendMainMenu(sock, jid) {
    const currentPersona = PersonalityManager.getActiveName(jid);

    const text =
      `${MENUS.MAIN.HEADER}\n` +
      `🎭 *Personalidade Atual:* ${currentPersona}\n\n` +
      `${MENUS.MAIN.OPTIONS}` +
      `${MENUS.MAIN.FOOTER}`;

    await sock.sendMessage(jid, { text });
  }

  static async sendPersonalityMenu(sock, jid) {
    const list = PersonalityManager.getList();
    let text = `${MENUS.PERSONALITY.HEADER}\n`;

    list.forEach((p, index) => {
      text += `*p${index + 1}* - ${p.name}\n_${p.desc}_\n\n`;
    });

    text += MENUS.PERSONALITY.FOOTER;
    await sock.sendMessage(jid, { text });
  }

  static async sendHelp(sock, jid) {
    await sock.sendMessage(jid, { text: MENUS.HELP_TEXT });
  }

  static async sendPersonalityMenu(sock, jid) {
    const list = PersonalityManager.getList();
    const currentName = PersonalityManager.getActiveName(jid);

    let text = `${MENUS.PERSONALITY.HEADER}\n`;
    text += `🔹 _Atual neste chat: *${currentName}*_\n\n`;

    list.forEach((p, index) => {
      const isDefault =
        p.key === LUMA_CONFIG.DEFAULT_PERSONALITY ? " ⭐ (Padrão)" : "";

      text += `*p${index + 1}* - ${p.name}${isDefault}\n_${p.desc}_\n\n`;
    });

    text += MENUS.PERSONALITY.FOOTER;
    await sock.sendMessage(jid, { text });
  }

  static async handleMenuReply(message, sock, text) {
    const quotedMsg =
      message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quotedMsg) return false;

    const quotedText =
      quotedMsg.conversation || quotedMsg.extendedTextMessage?.text;
    if (!quotedText) return false;

    const jid = message.key.remoteJid;
    const cleanText = text.trim().toLowerCase();

    if (quotedText.includes(MENUS.PERSONALITY.HEADER.split("\n")[0])) {
      const list = PersonalityManager.getList();
      let index = -1;
      const num = parseInt(cleanText.replace("p", ""));
      if (!isNaN(num) && num > 0) index = num - 1;

      if (index >= 0 && index < list.length) {
        const selected = list[index];
        PersonalityManager.setPersonality(jid, selected.key);
        await sock.sendMessage(jid, {
          text: `${MENUS.MSGS.PERSONA_CHANGED}*${selected.name}*\n\n_Pode interagir!_`,
        });
      } else {
        await sock.sendMessage(jid, { text: MENUS.MSGS.INVALID_OPT });
      }
      return true;
    }
    return false;
  }
}
