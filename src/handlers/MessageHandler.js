import { COMMANDS, CONFIG, MESSAGES } from "../config/constants.js";
import { Logger } from "../utils/Logger.js";
import { MediaProcessor } from "./MediaProcessor.js";
import { GroupManager } from "../managers/GroupManager.js";
import { BlacklistManager } from "../managers/BlacklistManager.js";
import { LumaHandler } from "./LumaHandler.js";
import { LUMA_CONFIG } from "../config/lumaConfig.js";

export class MessageHandler {
  static lumaHandler = new LumaHandler();

  static async process(message, sock) {
    const jid = message.key.remoteJid;
    const text = this.extractText(message);

    if (!text) return;

    if (await this.handleAdminCommands(message, sock, text)) {
      return;
    }

    if (BlacklistManager.isBlocked(jid)) {
      Logger.info(`🚫 Mensagem ignorada de grupo bloqueado: ${jid}`);
      return;
    }

    if (this.lumaHandler.isReplyToLuma(message)) {
      await this.handleLumaCommand(message, sock, true);
      return;
    }

    if (LumaHandler.isTriggered(text)) {
      await this.handleLumaCommand(message, sock, false);
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

  static async handleAdminCommands(message, sock, text) {
    const jid = message.key.remoteJid;
    const lower = text.toLowerCase();

    if (message.key.fromMe) {
      Logger.info("📡 Mensagem enviada pelo próprio dono (fromMe = true)");
    }

    let senderNumber = null;
    if (!message.key.fromMe) {
      senderNumber = await this.getSenderNumber(message, sock);
    }

    if (lower === COMMANDS.MY_NUMBER) {
      const debugInfo = message.key.fromMe
        ? `fromMe: true\nsock.user.id: ${sock.user?.id || 'N/A'}`
        : `participant: ${message.key.participant || 'N/A'}\nremoteJid: ${message.key.remoteJid}`;

      const detected = message.key.fromMe
        ? sock.user?.id?.split('@')[0].split(':')[0] || "Desconhecido"
        : senderNumber || "Não identificado";

      await this.sendMessage(sock, jid,
        `📱 Número detectado: ${detected}\n\n` +
        `Se este for seu número, configure em CONFIG.OWNER_NUMBER\n\n` +
        `🔍 DEBUG:\n${debugInfo}`
      );
      return true;
    }

    const isOwner = message.key.fromMe || senderNumber === CONFIG.OWNER_NUMBER;
    if (!isOwner) return false;

    if (lower === COMMANDS.LUMA_STATS) {
      const stats = this.lumaHandler.getStats();
      const statsText = `📊 *Estatísticas da Luma*\n\n` +
        `💬 Conversas ativas: ${stats.totalConversations}\n\n` +
        (stats.conversations.length > 0
          ? stats.conversations.slice(0, 10).map(c =>
            `• ${c.jid}: ${c.messageCount} msgs\n  Última: ${c.lastUpdate}`
          ).join('\n')
          : 'Nenhuma conversa no momento');

      await this.sendMessage(sock, jid, statsText);
      return true;
    }

    if (lower === COMMANDS.LUMA_CLEAR) {
      this.lumaHandler.clearHistory(jid);
      await this.sendMessage(sock, jid, "🗑️ Histórico da Luma limpo nesta conversa!");
      return true;
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
        `📋 *Comandos Administrativos (apenas dono):*\n\n` +
        `*BLACKLIST:*\n` +
        `${COMMANDS.BLACKLIST_ADD} - Bloqueia grupo atual\n` +
        `${COMMANDS.BLACKLIST_REMOVE} - Desbloqueia grupo atual\n` +
        `${COMMANDS.BLACKLIST_LIST} - Lista grupos bloqueados\n` +
        `${COMMANDS.BLACKLIST_CLEAR} - Limpa toda a blacklist\n\n` +
        `*LUMA:*\n` +
        `${COMMANDS.LUMA_STATS} - Estatísticas da Luma\n` +
        `${COMMANDS.LUMA_CLEAR} - Limpa histórico da conversa`
      );
      return true;
    }

    return false;
  }

  static async getSenderNumber(message, sock) {
    try {
      let jid = (
        message?.key?.participant ||
        message?.participant ||
        message?.message?.extendedTextMessage?.contextInfo?.participant ||
        message?.key?.remoteJid
      );

      if (!jid) return null;

      if (jid.includes('@lid')) {
        try {
          const results = await sock.onWhatsApp(jid);
          if (results && results.length > 0 && results[0]?.jid) {
            jid = results[0].jid;
          }
        } catch (e) {
          Logger.warn(`⚠️ Não foi possível resolver LID ${jid}: ${e.message}`);
        }
      }

      let number = jid.split('@')[0];
      if (number.includes(':')) number = number.split(':')[0];
      number = number.replace(/\D/g, '');

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

      let userMessage = isReply ? text : this.lumaHandler.extractUserMessage(text);

      const quotedMessage = {
        key: message.key,
        message: message.message
      };

      // ✅ NOVO: Verifica se há imagem/sticker na mensagem ou na resposta
      const hasVisualContent = await this.hasVisualContent(message);
      
      // Log de debug
      Logger.info(`📊 Debug Luma: userMessage="${userMessage}", hasVisual=${hasVisualContent}`);

      // ✅ MODIFICADO: Também verifica hasVisualContent
      if (!userMessage && !hasVisualContent) {
        const response = await sock.sendMessage(jid, {
          text: this.lumaHandler.getRandomBoredResponse()
        }, { quoted: quotedMessage });

        if (response?.key?.id) {
          this.lumaHandler.saveLastBotMessage(jid, response.key.id);
        }
        return;
      }

      // ✅ NOVO: Se não tem texto mas tem imagem
      if (!userMessage && hasVisualContent) {
        userMessage = "O que você acha dessa imagem?";
      }

      await sock.sendPresenceUpdate('composing', jid);
      await this.randomDelay();

      // ✅ MODIFICADO: Passa message e sock para análise de imagem
      const responseText = await this.lumaHandler.generateResponse(
        userMessage, 
        jid, 
        message,  // ← Passa a mensagem completa
        sock      // ← Passa o socket
      );

      const sentMessage = await sock.sendMessage(jid, {
        text: responseText
      }, { quoted: quotedMessage });

      if (sentMessage?.key?.id) {
        this.lumaHandler.saveLastBotMessage(jid, sentMessage.key.id);
      }

    } catch (error) {
      Logger.error("❌ Erro no comando da Luma:", error);
      await this.sendMessage(
        sock,
        message.key.remoteJid,
        "Eita, deu ruim aqui... Minha mente fritou. Tenta de novo daqui a pouco que eu me recupero. 🤷‍♀️"
      );
    }
  }

  static async hasVisualContent(message) {
    // Verifica se tem imagem/sticker diretamente
    if (message.message?.imageMessage || message.message?.stickerMessage) {
      Logger.info("✅ Visual content: imagem/sticker na mensagem atual");
      return true;
    }

    // Verifica se é resposta a uma mensagem com imagem/sticker
    const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (quotedMsg?.imageMessage || quotedMsg?.stickerMessage) {
      Logger.info("✅ Visual content: imagem/sticker na mensagem citada");
      return true;
    }

    return false;
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

  static async randomDelay() {
    const { min, max } = LUMA_CONFIG.TECHNICAL.thinkingDelay;
    await new Promise(resolve =>
      setTimeout(resolve, min + Math.random() * (max - min))
    );
  }
}