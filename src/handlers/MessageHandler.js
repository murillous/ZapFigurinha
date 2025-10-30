import { COMMANDS, CONFIG, MESSAGES } from "../config/constants.js";
import { Logger } from "../utils/Logger.js";
import { MediaProcessor } from "./MediaProcessor.js";
import { GroupManager } from "../managers/GroupManager.js";
import { BlacklistManager } from "../managers/BlacklistManager.js";
import { LumaHandler } from "./LumaHandler.js";
import { LUMA_CONFIG } from "../config/lumaConfig.js";
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
        Logger.info(
          `🚫 Mensagem ignorada de grupo bloqueado: ${jid} (usuário: ${senderNumber})`
        );
        return;
      }

      Logger.info(
        `✅ Mensagem permitida em grupo bloqueado: ${jid} (owner: ${senderNumber})`
      );
    }

    if (text && (await this.handleAdminCommands(message, sock, text))) {
      return;
    }

    if (text) {
      const command = this.detectCommand(text);
      if (command) {
        if (command === COMMANDS.STICKER) {
          await this.handleStickerCommand(message, sock);
          return;
        } else if (command === COMMANDS.IMAGE) {
          await this.handleImageCommand(message, sock);
          return;
        } else if (command === COMMANDS.GIF) {
          await this.handleGifCommand(message, sock);
          return;
        } else if (command === COMMANDS.EVERYONE) {
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
        `💬 Total de contextos: ${stats.totalContexts}\n` +
        `👤 Conversas privadas: ${stats.privateChats}\n` +
        `👥 Conversas em grupos: ${stats.groupChats}\n\n` +
        `📝 *Últimas conversas:*\n` +
        (stats.contexts.length > 0
          ? stats.contexts
              .slice(0, 10)
              .map(
                (c) =>
                  `\n${c.isGroup ? "👥" : "👤"} ${c.userName}\n` +
                  `   ${c.messageCount} msgs | ${c.lastUpdate}`
              )
              .join("\n")
          : "Nenhuma conversa no momento");

      await this.sendMessage(sock, jid, statsText);
      return true;
    }

    if (lower === COMMANDS.LUMA_CLEAR) {
      // Obtém o userJid correto
      const userJid = message.key.fromMe
        ? sock.user.id
        : message.key.participant || message.key.remoteJid;

      this.lumaHandler.clearHistory(userJid, jid);
      await this.sendMessage(
        sock,
        jid,
        "🗑️ Histórico da Luma limpo neste contexto!"
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

  /**
   * Extrai usuários mencionados na mensagem
   * Apenas adiciona menções quando consegue identificar o nome
   */
  static async getMentionedUsers(message, sock) {
    try {
      const mentions = [];

      // Verifica se há menções no contextInfo
      const contextInfo = message.message?.extendedTextMessage?.contextInfo;
      if (!contextInfo?.mentionedJid || contextInfo.mentionedJid.length === 0) {
        return mentions;
      }

      Logger.info(`📌 ${contextInfo.mentionedJid.length} menções detectadas`);

      const chatJid = message.key.remoteJid;
      const isGroup = chatJid.endsWith("@g.us");

      // Se for grupo, pega metadados uma vez só
      let groupMetadata = null;
      if (isGroup) {
        try {
          groupMetadata = await sock.groupMetadata(chatJid);
          Logger.info(
            `📋 Metadados do grupo carregados (${groupMetadata.participants.length} participantes)`
          );
        } catch (error) {
          Logger.error(
            `❌ Erro ao carregar metadados do grupo: ${error.message}`
          );
        }
      }

      // Para cada JID mencionado, tenta pegar o nome
      for (const mentionedJid of contextInfo.mentionedJid) {
        try {
          let name = null;

          // Tenta pegar do pushName primeiro (mais confiável)
          if (isGroup && groupMetadata) {
            const participant = groupMetadata.participants.find(
              (p) => p.id === mentionedJid
            );

            if (participant) {
              // Prioriza notify (nome que aparece no grupo)
              name = participant.notify || null;

              if (name) {
                Logger.info(
                  `✅ Nome encontrado: ${name} (${mentionedJid.split("@")[0]})`
                );
              } else {
                Logger.warn(
                  `⚠️ Participante sem nome definido (${
                    mentionedJid.split("@")[0]
                  })`
                );
              }
            } else {
              Logger.warn(
                `⚠️ Participante não encontrado nos metadados (${
                  mentionedJid.split("@")[0]
                })`
              );
            }
          }

          // Só adiciona à lista se encontrou um nome válido
          if (name && name.trim()) {
            mentions.push({
              jid: mentionedJid,
              name: name.trim(),
              number: mentionedJid.split("@")[0].replace(/\D/g, ""),
            });

            Logger.info(
              `👤 Menção adicionada: ${name} (${mentionedJid.split("@")[0]})`
            );
          } else {
            Logger.info(
              `⏭️ Menção ignorada (sem nome): ${mentionedJid.split("@")[0]}`
            );
          }
        } catch (error) {
          Logger.warn(
            `⚠️ Erro ao processar menção ${mentionedJid}: ${error.message}`
          );
        }
      }

      if (mentions.length > 0) {
        Logger.info(
          `📌 ${mentions.length} menção(ões) com nome identificado(s)`
        );
      } else {
        Logger.info(`📌 Nenhuma menção com nome foi identificada`);
      }

      return mentions;
    } catch (error) {
      Logger.error("❌ Erro ao extrair menções:", error);
      return [];
    }
  }

  /**
   * Obtém o nome do usuário do WhatsApp (apenas primeiro nome)
   */
  static async getUserName(message, sock) {
    try {
      // Se for mensagem do bot
      if (message.key.fromMe) {
        const botName = sock.user?.name || sock.user?.verifiedName || "Bot";
        return botName.trim().split(/\s+/)[0]; // Apenas primeiro nome
      }

      const chatJid = message.key.remoteJid;
      const isGroup = chatJid.endsWith("@g.us");

      // Em grupos, tenta pegar do pushName ou metadados do grupo
      if (isGroup) {
        const participantJid = message.key.participant;

        // Primeiro tenta o pushName da mensagem
        const pushName = message.pushName;
        if (pushName && pushName.trim()) {
          Logger.info(
            `👤 Nome via pushName: ${pushName.trim().split(/\s+/)[0]}`
          );
          return pushName.trim().split(/\s+/)[0];
        }

        // Se não tem pushName, tenta pegar dos metadados do grupo
        if (participantJid) {
          try {
            const groupMetadata = await sock.groupMetadata(chatJid);
            const participant = groupMetadata.participants.find(
              (p) => p.id === participantJid
            );

            if (participant?.notify) {
              Logger.info(
                `👤 Nome via grupo: ${
                  participant.notify.trim().split(/\s+/)[0]
                }`
              );
              return participant.notify.trim().split(/\s+/)[0];
            }
          } catch (e) {
            Logger.warn(`⚠️ Erro ao buscar nome do grupo: ${e.message}`);
          }
        }
      } else {
        // Em chat privado, usa pushName
        const pushName = message.pushName;
        if (pushName && pushName.trim()) {
          Logger.info(
            `👤 Nome via pushName (privado): ${pushName.trim().split(/\s+/)[0]}`
          );
          return pushName.trim().split(/\s+/)[0];
        }
      }

      // Fallback: usa o número
      const number = await this.getSenderNumber(message, sock);
      Logger.warn(`⚠️ Nome não encontrado, usando número: ${number}`);
      return number || "Usuário";
    } catch (error) {
      Logger.error("❌ Erro ao obter nome do usuário:", error);
      return "Usuário";
    }
  }

  static async handleLumaCommand(message, sock, isReply = false) {
    try {
      const chatJid = message.key.remoteJid;
      const text = this.extractText(message);

      // Obtém o JID do usuário
      const userJid = message.key.fromMe
        ? sock.user.id
        : message.key.participant || message.key.remoteJid;

      // Obtém o nome do usuário (primeiro nome apenas)
      const userName = await this.getUserName(message, sock);
      Logger.info(`👤 Nome detectado: ${userName} (${userJid.split("@")[0]})`);

      // Extrai usuários mencionados
      const mentionedUsers = await this.getMentionedUsers(message, sock);
      if (mentionedUsers.length > 0) {
        Logger.info(
          `📌 ${mentionedUsers.length} pessoa(s) mencionada(s): ${mentionedUsers
            .map((m) => m.name)
            .join(", ")}`
        );
      }

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
          chatJid,
          {
            text: this.lumaHandler.getRandomBoredResponse(),
          },
          { quoted: quotedMessage }
        );

        if (response?.key?.id) {
          this.lumaHandler.saveLastBotMessage(chatJid, response.key.id);
        }
        return;
      }

      if (!userMessage && hasVisualContent) {
        userMessage = "O que você acha dessa imagem?";
      }

      // Finge estar digitando
      await sock.sendPresenceUpdate("composing", chatJid);
      await this.randomDelay();

      // Para de "digitar" antes de enviar
      await sock.sendPresenceUpdate("paused", chatJid);

      const responseText = await this.lumaHandler.generateResponse(
        userMessage,
        userJid,
        chatJid,
        userName,
        message,
        sock,
        mentionedUsers
      );

      const sentMessage = await sock.sendMessage(
        chatJid,
        {
          text: responseText,
        },
        { quoted: quotedMessage }
      );

      if (sentMessage?.key?.id) {
        this.lumaHandler.saveLastBotMessage(chatJid, sentMessage.key.id);
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
    return null;
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
    await new Promise((resolve) =>
      setTimeout(resolve, min + Math.random() * (max - min))
    );
  }
}
