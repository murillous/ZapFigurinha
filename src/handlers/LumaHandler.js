import { GoogleGenAI } from "@google/genai";
import { Logger } from "../utils/Logger.js";
import { LUMA_CONFIG } from "../config/lumaConfig.js";
import { MediaProcessor } from "./MediaProcessor.js";
import dotenv from "dotenv";

dotenv.config();

export class LumaHandler {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.isConfigured = this.validateConfiguration();

    if (this.isConfigured) {
      this.initializeAI();
      this.startCleanupInterval();
    }
  }

  validateConfiguration() {
    if (!this.apiKey || this.apiKey === "Sua Chave Aqui") {
      Logger.error("❌ GEMINI_API_KEY não configurada no .env!");
      Logger.info("📝 Configure no .env: GEMINI_API_KEY=sua_chave_aqui");
      return false;
    }

    Logger.info(`✅ API Key carregada (${this.apiKey.substring(0, 10)}...)`);
    return true;
  }

  initializeAI() {
    try {
      this.ai = new GoogleGenAI({ apiKey: this.apiKey });
      this.conversationHistory = new Map();
      this.lastBotMessages = new Map();

      Logger.info("✅ Luma inicializada com sucesso!");
    } catch (error) {
      Logger.error("❌ Erro ao inicializar Luma:", error);
      this.isConfigured = false;
    }
  }

  startCleanupInterval() {
    setInterval(
      () => this.cleanOldHistories(),
      LUMA_CONFIG.TECHNICAL.historyCleanupInterval
    );
  }

  static isTriggered(text) {
    if (!text) return false;
    return LUMA_CONFIG.TRIGGERS.some((regex) =>
      regex.test(text.toLowerCase().trim())
    );
  }

  isReplyToLuma(message) {
    if (!this.isConfigured) return false;

    const quotedMsg = message.message?.extendedTextMessage?.contextInfo;
    if (!quotedMsg?.quotedMessage) return false;

    const quotedMsgId = quotedMsg.stanzaId;
    const jid = message.key.remoteJid;
    const lastBotMsgId = this.lastBotMessages.get(jid);

    const isReply = quotedMsgId === lastBotMsgId;
    if (isReply) {
      Logger.info(`✅ Detectada resposta à Luma de ${jid.split("@")[0]}`);
    }

    return isReply;
  }

  saveLastBotMessage(jid, messageId) {
    if (!messageId) return;
    this.lastBotMessages.set(jid, messageId);
    Logger.info(
      `💾 Salvo ID da mensagem da Luma para ${jid.split("@")[0]}: ${messageId}`
    );
  }

  addToHistory(userJid, userMessage, botResponse) {
    if (!this.conversationHistory.has(userJid)) {
      this.conversationHistory.set(userJid, {
        messages: [],
        lastUpdate: Date.now(),
      });
    }

    const data = this.conversationHistory.get(userJid);
    data.messages.push(`Usuário: ${userMessage}`);
    data.messages.push(`Luma: ${botResponse}`);
    data.lastUpdate = Date.now();

    if (data.messages.length > LUMA_CONFIG.TECHNICAL.maxHistory) {
      data.messages.splice(
        0,
        data.messages.length - LUMA_CONFIG.TECHNICAL.maxHistory
      );
    }
  }

  getHistory(userJid) {
    const data = this.conversationHistory.get(userJid);
    return data?.messages.join("\n") || "Nenhuma conversa anterior.";
  }

  clearHistory(userJid) {
    this.conversationHistory.delete(userJid);
    Logger.info(`🗑️ Histórico da Luma limpo para ${userJid}`);
  }

  cleanOldHistories() {
    const now = Date.now();
    let cleaned = 0;

    for (const [jid, data] of this.conversationHistory.entries()) {
      if (now - data.lastUpdate > LUMA_CONFIG.TECHNICAL.maxHistoryAge) {
        this.conversationHistory.delete(jid);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      Logger.info(`🧹 Luma: ${cleaned} históricos antigos removidos`);
    }
  }

  extractUserMessage(text) {
    return text
      .replace(/^(ei\s+|oi\s+|e\s+aí\s+|fala\s+)?luma[,!?]?\s*/i, "")
      .trim();
  }

  async extractImageFromMessage(message, sock) {
    try {
      // Verifica se a mensagem tem imagem diretamente
      if (message.message?.imageMessage) {
        Logger.info("🖼️ Imagem detectada na mensagem atual");
        return await this.convertImageToBase64(message, sock);
      }

      // Verifica se a mensagem tem sticker
      if (message.message?.stickerMessage) {
        Logger.info("🎭 Figurinha detectada na mensagem atual");
        return await this.convertImageToBase64(message, sock);
      }

      // Verifica se é resposta a uma mensagem com imagem
      const quotedMsg =
        message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (quotedMsg?.imageMessage) {
        Logger.info("🖼️ Imagem detectada na mensagem citada");
        const quotedMessage = {
          message: { imageMessage: quotedMsg.imageMessage },
          key: message.key,
        };
        return await this.convertImageToBase64(quotedMessage, sock);
      }

      // Verifica se é resposta a uma figurinha
      if (quotedMsg?.stickerMessage) {
        Logger.info("🎭 Figurinha detectada na mensagem citada");
        const quotedMessage = {
          message: { stickerMessage: quotedMsg.stickerMessage },
          key: message.key,
        };
        return await this.convertImageToBase64(quotedMessage, sock);
      }

      return null;
    } catch (error) {
      Logger.error("❌ Erro ao extrair imagem:", error);
      return null;
    }
  }

  async convertImageToBase64(message, sock) {
    try {
      const buffer = await MediaProcessor.downloadMedia(message, sock);

      if (!buffer) return null;

      const base64Image = buffer.toString("base64");

      let mimeType = "image/jpeg";
      if (message.message?.imageMessage?.mimetype) {
        mimeType = message.message.imageMessage.mimetype;
      } else if (message.message?.stickerMessage) {
        mimeType = "image/webp";
      }

      Logger.info(
        `✅ Imagem convertida para base64 (${(
          base64Image.length / 1024
        ).toFixed(1)}KB)`
      );

      return {
        inlineData: {
          data: base64Image,
          mimeType: mimeType,
        },
      };
    } catch (error) {
      Logger.error("❌ Erro ao converter imagem:", error);
      return null;
    }
  }

  async generateResponse(userMessage, userJid, message = null, sock = null) {
    if (!this.isConfigured) {
      return this.getErrorResponse("API_KEY_MISSING");
    }

    try {
      // Tenta extrair imagem se message e sock forem fornecidos
      let imageData = null;
      if (message && sock) {
        imageData = await this.extractImageFromMessage(message, sock);
        if (imageData) {
          Logger.info("🖼️ Imagem será analisada pela Luma");
        }
      }

      const prompt = this.buildPrompt(userMessage, userJid, imageData);
      const response = await this.sendToAI(prompt);

      const cleanedResponse = this.cleanResponse(response);
      this.addToHistory(userJid, userMessage, cleanedResponse);

      Logger.info(`💬 Luma respondeu para ${userJid.split("@")[0]}`);
      return cleanedResponse;
    } catch (error) {
      Logger.error("❌ Erro na Luma:", error.message);
      return this.getErrorResponse("GENERAL", error);
    }
  }

  async sendToAI(prompt) {
    const response = await this.ai.models.generateContent({
      model: LUMA_CONFIG.TECHNICAL.model,
      contents: prompt,
      generationConfig: {
        temperature: 1.4,
        maxOutputTokens: 500,
        topP: 0.95,
        topK: 50,
      },
    });

    return response.text;
  }

  buildPrompt(userMessage, userJid, imageData = null) {
    const history = this.getHistory(userJid);
    const hasHistory = history !== "Nenhuma conversa anterior.";

    // Se há imagem, adiciona instruções de visão
    let promptTemplate = LUMA_CONFIG.PROMPT_TEMPLATE;

    if (imageData) {
      promptTemplate = LUMA_CONFIG.VISION_PROMPT_TEMPLATE;
    }

    const prompt = promptTemplate
      .replace(
        "{{HISTORY_PLACEHOLDER}}",
        hasHistory ? `CONVERSA ANTERIOR:\n${history}\n` : ""
      )
      .replace("{{USER_MESSAGE}}", userMessage);

    // Se há imagem, retorna array com texto e imagem
    if (imageData) {
      return [{ text: prompt }, imageData];
    }

    // Sem imagem, retorna só o texto
    return prompt;
  }

  cleanResponse(text) {
    let cleaned = text
      .trim()
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/`/g, "")
      .replace(/^Luma:\s*/i, "");

    // Limita o tamanho
    if (cleaned.length > LUMA_CONFIG.TECHNICAL.maxResponseLength) {
      cleaned =
        cleaned.substring(0, LUMA_CONFIG.TECHNICAL.maxResponseLength - 3) +
        "...";
    }

    return cleaned;
  }

  getErrorResponse(type, error = null) {
    const errorConfig = LUMA_CONFIG.ERROR_RESPONSES;

    switch (type) {
      case "API_KEY_MISSING":
        return errorConfig.API_KEY_MISSING;

      case "API_KEY_INVALID":
        return errorConfig.API_KEY_INVALID;

      case "QUOTA_EXCEEDED":
        return errorConfig.QUOTA_EXCEEDED;

      case "MODEL_NOT_FOUND":
        return errorConfig.MODEL_NOT_FOUND;

      default:
        const generalErrors = errorConfig.GENERAL;
        return generalErrors[Math.floor(Math.random() * generalErrors.length)];
    }
  }

  getStats() {
    return {
      totalConversations: this.conversationHistory.size,
      conversations: Array.from(this.conversationHistory.entries()).map(
        ([jid, data]) => ({
          jid: jid.split("@")[0],
          messageCount: data.messages.length,
          lastUpdate: new Date(data.lastUpdate).toLocaleString("pt-BR"),
        })
      ),
    };
  }

  getRandomBoredResponse() {
    const responses = LUMA_CONFIG.BORED_RESPONSES;
    return responses[Math.floor(Math.random() * responses.length)];
  }
}
