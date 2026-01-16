import { COMMANDS, CONFIG, MESSAGES, MENUS } from "../config/constants.js";
import { Logger } from "../utils/Logger.js";
import { MediaProcessor } from "./MediaProcessor.js";
import { GroupManager } from "../managers/GroupManager.js";
import { BlacklistManager } from "../managers/BlacklistManager.js";
import { LumaHandler } from "./LumaHandler.js";
import { LUMA_CONFIG } from "../config/lumaConfig.js";
import { PersonalityManager } from "../managers/PersonalityManager.js";
import { DatabaseService } from "../services/Database.js";
import { ImageGen } from "../services/ImageGen.js";
import { VoiceService } from "../services/VoiceService.js"; // Importe isso
import dotenv from "dotenv";

dotenv.config();

export class MessageHandler {
  static lumaHandler = new LumaHandler();

  static async process(message, sock) {
    const jid = message.key.remoteJid;
    if (CONFIG.IGNORE_SELF && message.key.fromMe) return;

    const text = this.extractText(message);

    // Blacklist
    if (jid.endsWith("@g.us") && BlacklistManager.isBlocked(jid)) {
      const owner = process.env.OWNER_NUMBER?.replace(/\D/g, "");
      const sender = message.key.fromMe
        ? owner
        : await this.getSenderNumber(message, sock);
      if (!(message.key.fromMe || sender === owner)) return;
    }

    if (text) {
      if (await this.handleMenuReply(message, sock, text)) return;
      if (await this.handleAdminCommands(message, sock, text)) return;

      const command = this.detectCommand(text);
      if (command) {
        switch (command) {
          // --- COMANDO DE VOZ (ATUALIZADO - SEM BANCO) ---
          case COMMANDS.LUMA_VOICE:
            if (!VoiceService.isConfigured()) {
              await this.sendMessage(
                sock,
                jid,
                "⚠️ Erro: Configure a ELEVENLABS_API_KEY no .env"
              );
              return;
            }

            // Alterna o estado na memória RAM
            const isNowActive = VoiceService.toggleVoice(jid);

            const statusMsg = isNowActive
              ? "🎙️ *Voz Ativada!* (Até reiniciar)"
              : "📝 *Voz Desativada!*";

            await this.sendMessage(sock, jid, statusMsg);
            return;

          case COMMANDS.IMAGINE:
            const prompt = text.slice(command.length).trim();
            if (!prompt) {
              await this.sendMessage(
                sock,
                jid,
                "🎨 Digite o que quer que eu desenhe!"
              );
              return;
            }
            try {
              await sock.sendMessage(jid, {
                react: { text: "🎨", key: message.key },
              });
              const buffer = await ImageGen.generate(prompt);
              if (!buffer) throw new Error("Imagem vazia");
              await sock.sendMessage(
                jid,
                { image: buffer },
                { quoted: message }
              );
              await sock.sendMessage(jid, {
                react: { text: "✅", key: message.key },
              });
            } catch (e) {
              await this.sendMessage(sock, jid, `❌ Erro: ${e.message}`);
            }
            return;

          case COMMANDS.HELP:
            await this.sendHelp(sock, jid);
            return;
          case COMMANDS.PERSONA:
            await this.sendPersonalityMenu(sock, jid);
            return;
          case COMMANDS.LUMA_CLEAR:
            this.lumaHandler.clearHistory(jid);
            await this.sendMessage(sock, jid, "🗑️ Memória limpa!");
            return;
          case COMMANDS.LUMA_STATS:
            await this.sendMessage(sock, jid, "📊 Stats...");
            return;
          // Comandos de Mídia
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
            if (jid.endsWith("@g.us"))
              await GroupManager.mentionEveryone(message, sock);
            return;
        }
      }
    }

    // IA Luma
    if (this.lumaHandler.isReplyToLuma(message)) {
      await this.handleLumaCommand(message, sock, true);
      return;
    }

    // AQUI ESTAVA O ERRO: Agora LumaHandler.isTriggered é estático e funciona!
    if (text && LumaHandler.isTriggered(text)) {
      await this.handleLumaCommand(message, sock, false);
      return;
    }
  }

  // --- MÉTODOS AUXILIARES ---

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

    const ownerNumber = process.env.OWNER_NUMBER?.replace(/\D/g, "");
    const isOwner = message.key.fromMe || senderNumber === ownerNumber;

    if (!isOwner) return false;

    if (lower === COMMANDS.MY_NUMBER) {
      const detected = message.key.fromMe
        ? sock.user?.id?.split("@")[0].split(":")[0]
        : senderNumber;

      await this.sendMessage(
        sock,
        jid,
        `📱 *ID de Admin Detectado:*\n${detected}\n\nConfigure isso no .env como OWNER_NUMBER.`
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
            "⚠️ Use isso dentro do grupo que quer bloquear."
          );
          return true;
        }
        if (BlacklistManager.add(jid)) {
          await this.sendMessage(sock, jid, "🚫 Grupo adicionado à blacklist!");
        } else {
          await this.sendMessage(sock, jid, "❌ Erro ao adicionar.");
        }
        return true;
      }

      if (action === "remove") {
        if (BlacklistManager.remove(jid)) {
          await this.sendMessage(sock, jid, "✅ Grupo removido da blacklist!");
        } else {
          await this.sendMessage(
            sock,
            jid,
            "⚠️ Este grupo não estava bloqueado."
          );
        }
        return true;
      }

      if (action === "list") {
        const list = BlacklistManager.list();
        const listText =
          list.length > 0
            ? `📋 *Blacklist:*\n\n${list
                .map((g, i) => `${i + 1}. ${g}`)
                .join("\n")}`
            : "📋 Blacklist vazia.";
        await this.sendMessage(sock, jid, listText);
        return true;
      }

      if (action === "clear") {
        BlacklistManager.clear();
        await this.sendMessage(sock, jid, "🗑️ Blacklist zerada!");
        return true;
      }

      await this.sendMessage(
        sock,
        jid,
        "Use: !blacklist <add|remove|list|clear>"
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

      // Chama o método estático corretamente
      let userMessage = isReply ? text : LumaHandler.extractUserMessage(text);

      const quotedMessage = { key: message.key, message: message.message };
      const hasVisual = await this.hasVisualContent(message);

      if (!userMessage && !hasVisual) return; // Ignora se vazio
      if (!userMessage && hasVisual) userMessage = "O que é isso?";

      // Verifica voz na Memória RAM
      const isVoice = VoiceService.isActive(jid);
      await sock.sendPresenceUpdate(isVoice ? "recording" : "composing", jid);

      await this.randomDelay();

      const response = await this.lumaHandler.generateResponse(
        userMessage,
        jid,
        message,
        sock
      );

      let sentMessage;
      if (typeof response === "object" && response.type === "audio") {
        sentMessage = await sock.sendMessage(
          jid,
          {
            audio: response.buffer,
            mimetype: "audio/mp4",
            ptt: true,
          },
          { quoted: quotedMessage }
        );
      } else {
        sentMessage = await sock.sendMessage(
          jid,
          { text: response },
          { quoted: quotedMessage }
        );
      }

      if (sentMessage?.key?.id)
        this.lumaHandler.saveLastBotMessage(jid, sentMessage.key.id);
      await sock.sendPresenceUpdate("available", jid);
    } catch (error) {
      Logger.error("Erro Luma:", error);
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
    if (lower.startsWith(COMMANDS.LUMA_VOICE)) return COMMANDS.LUMA_VOICE;
    if (lower.startsWith(COMMANDS.IMAGINE)) return COMMANDS.IMAGINE;
    if (lower.startsWith(COMMANDS.PERSONA)) return COMMANDS.PERSONA;
    if (
      lower.startsWith(COMMANDS.STICKER) ||
      lower.startsWith(COMMANDS.STICKER_SHORT)
    )
      return COMMANDS.STICKER;
    if (
      lower.startsWith(COMMANDS.IMAGE) ||
      lower.startsWith(COMMANDS.IMAGE_SHORT)
    )
      return COMMANDS.IMAGE;
    if (lower.startsWith(COMMANDS.GIF) || lower.startsWith(COMMANDS.GIF_SHORT))
      return COMMANDS.GIF;
    if (lower.includes(COMMANDS.LUMA_CLEAR)) return COMMANDS.LUMA_CLEAR;
    if (lower.includes(COMMANDS.LUMA_STATS)) return COMMANDS.LUMA_STATS;
    if (lower.startsWith(COMMANDS.EVERYONE.toLowerCase()))
      return COMMANDS.EVERYONE;
    if (lower.startsWith(COMMANDS.HELP)) return COMMANDS.HELP;
    return null;
  }
  static async handleStickerCommand(message, sock) {
    const text = this.extractText(message);
    const url = this.extractUrl(text);
    const jid = message.key.remoteJid;

    if (url) {
      await MediaProcessor.processUrlToSticker(url, sock, message);
      DatabaseService.incrementMetric("stickers_created");
      DatabaseService.incrementMetric("total_messages");
      return;
    }

    if (MessageHandler.hasMedia(message)) {
      await MediaProcessor.processToSticker(message, sock);
      DatabaseService.incrementMetric("stickers_created");
      DatabaseService.incrementMetric("total_messages");
    } else if (MessageHandler.hasQuotedMessage(message)) {
      const quoted = MessageHandler.extractQuotedMessage(message);
      if (MessageHandler.hasMedia(quoted)) {
        await MediaProcessor.processToSticker(quoted, sock, jid);
        DatabaseService.incrementMetric("stickers_created");
        DatabaseService.incrementMetric("total_messages");
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

  static async handleImageCommand(message, sock) {
    if (MessageHandler.hasSticker(message)) {
      await MediaProcessor.processStickerToImage(message, sock);
      DatabaseService.incrementMetric("images_created");
      DatabaseService.incrementMetric("total_messages");
    } else if (MessageHandler.hasQuotedMessage(message)) {
      const quoted = MessageHandler.extractQuotedMessage(message);
      if (MessageHandler.hasSticker(quoted)) {
        await MediaProcessor.processStickerToImage(
          quoted,
          sock,
          message.key.remoteJid
        );
        DatabaseService.incrementMetric("images_created");
        DatabaseService.incrementMetric("total_messages");
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
      DatabaseService.incrementMetric("gifs_created");
      DatabaseService.incrementMetric("total_messages");
    } else if (MessageHandler.hasQuotedMessage(message)) {
      const quoted = MessageHandler.extractQuotedMessage(message);
      if (MessageHandler.hasSticker(quoted)) {
        await MediaProcessor.processStickerToGif(
          quoted,
          sock,
          message.key.remoteJid
        );
        DatabaseService.incrementMetric("gifs_created");
        DatabaseService.incrementMetric("total_messages");
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

  static extractUrl(text) {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const match = text.match(urlRegex);
    return match ? match[0] : null;
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

  static getMessageType(message) {
    if (message.message?.imageMessage) {
      return message.message.imageMessage.mimetype?.includes("gif")
        ? "gif"
        : "image";
    }
    if (message.message?.videoMessage) {
      return message.message.videoMessage.gifPlayback ? "gif" : "video";
    }
    if (message.message?.stickerMessage) {
      return "sticker";
    }
    return "text";
  }
}
