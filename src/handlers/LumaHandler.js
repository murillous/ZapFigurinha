import { GoogleGenAI } from "@google/genai";
import { Logger } from "../utils/Logger.js";
import { LUMA_CONFIG } from "../config/lumaConfig.js";
import { MediaProcessor } from "./MediaProcessor.js";
import { PersonalityManager } from "../managers/PersonalityManager.js";
import dotenv from "dotenv";

dotenv.config();

export class LumaHandler {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.isConfigured = this.validateConfiguration();

    if (this.isConfigured) {
      this.initializeAI();
      this.startCleanupInterval();
      this.initializeModelStats();
    }
  }

  validateConfiguration() {
    if (!this.apiKey || this.apiKey === "Sua Chave Aqui") {
      Logger.error("❌ GEMINI_API_KEY não configurada no .env!");
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
      this.modelAttempts = new Map();

      Logger.info("✅ Luma inicializada com sucesso!");
    } catch (error) {
      Logger.error("❌ Erro ao inicializar Luma:", error);
      this.isConfigured = false;
    }
  }

  initializeModelStats() {
    LUMA_CONFIG.TECHNICAL.models.forEach((model) => {
      this.modelAttempts.set(model, {
        successes: 0,
        failures: 0,
        lastUsed: null,
        lastError: null,
      });
    });
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

    return quotedMsgId === lastBotMsgId;
  }

  saveLastBotMessage(jid, messageId) {
    if (!messageId) return;
    this.lastBotMessages.set(jid, messageId);
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
    for (const [jid, data] of this.conversationHistory.entries()) {
      if (now - data.lastUpdate > LUMA_CONFIG.TECHNICAL.maxHistoryAge) {
        this.conversationHistory.delete(jid);
      }
    }
  }

  extractUserMessage(text) {
    return text
      .replace(/^(ei\s+|oi\s+|e\s+aí\s+|fala\s+)?luma[,!?]?\s*/i, "")
      .trim();
  }

  async extractImageFromMessage(message, sock) {
    try {
      if (message.message?.imageMessage)
        return await this.convertImageToBase64(message, sock);
      if (message.message?.stickerMessage)
        return await this.convertImageToBase64(message, sock);

      const quotedMsg =
        message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (quotedMsg?.imageMessage) {
        return await this.convertImageToBase64(
          {
            message: { imageMessage: quotedMsg.imageMessage },
            key: message.key,
          },
          sock
        );
      }
      if (quotedMsg?.stickerMessage) {
        return await this.convertImageToBase64(
          {
            message: { stickerMessage: quotedMsg.stickerMessage },
            key: message.key,
          },
          sock
        );
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
      let mimeType = message.message?.imageMessage?.mimetype || "image/jpeg";
      if (message.message?.stickerMessage) mimeType = "image/webp";

      Logger.info(
        `✅ Imagem convertida (${(base64Image.length / 1024).toFixed(1)}KB)`
      );
      return { inlineData: { data: base64Image, mimeType: mimeType } };
    } catch (error) {
      Logger.error("❌ Erro ao converter imagem:", error);
      return null;
    }
  }

  async generateResponse(userMessage, userJid, message = null, sock = null) {
    if (!this.isConfigured) return this.getErrorResponse("API_KEY_MISSING");

    try {
      const personaConfig = PersonalityManager.getPersonaConfig(userJid);
      Logger.info(`🎭 Personalidade: ${personaConfig.name}`);

      let imageData = null;
      if (message && sock) {
        imageData = await this.extractImageFromMessage(message, sock);
      }

      const prompt = this.buildPrompt(
        userMessage,
        userJid,
        imageData,
        personaConfig
      );

      const rawText = await this.sendToAIWithFallback(prompt);

      const cleanedResponse = this.cleanResponse(rawText);
      this.addToHistory(userJid, userMessage, cleanedResponse);

      Logger.info(`💬 Luma respondeu para ${userJid.split("@")[0]}`);
      return cleanedResponse;
    } catch (error) {
      Logger.error("❌ Erro na Luma:", error.message);
      return this.getErrorResponse("GENERAL", error);
    }
  }

  async sendToAIWithFallback(prompt) {
    const models = LUMA_CONFIG.TECHNICAL.models;
    let lastError = null;

    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      const stats = this.modelAttempts.get(model);

      try {
        Logger.info(`🤖 Tentando modelo: ${model}`);

        const response = await this.ai.models.generateContent({
          model: model,
          contents: prompt,
          generationConfig: {
            temperature: 1.4,
            maxOutputTokens: 800,
            topP: 0.95,
            topK: 50,
          },
        });

        stats.successes++;
        stats.lastUsed = new Date().toISOString();
        stats.lastError = null;

        Logger.info(`✅ Sucesso com: ${model}`);

        if (response.candidates && response.candidates.length > 0) {
          const candidate = response.candidates[0];
          if (
            candidate.content &&
            candidate.content.parts &&
            candidate.content.parts.length > 0
          ) {
            return candidate.content.parts[0].text;
          }
        }

        if (response.text && typeof response.text === "string") {
          return response.text;
        }

        throw new Error("Estrutura de resposta vazia ou desconhecida");
      } catch (error) {
        stats.failures++;
        stats.lastError = error.message;
        lastError = error;

        if (
          error.message?.includes("404") ||
          error.message?.includes("not found")
        ) {
          Logger.warn(`❌ Modelo ${model} não disponível.`);
        } else if (error.message?.includes("429") || error.status === 429) {
          Logger.warn(`⚠️ Rate limit no ${model}, tentando próximo...`);
        } else {
          Logger.error(`❌ Erro no ${model}: ${error.message}`);
        }
        continue;
      }
    }

    throw new Error(
      `Todos os modelos falharam. Último erro: ${lastError?.message}`
    );
  }

  async sendToAI(prompt) {
    return await this.sendToAIWithFallback(prompt);
  }

  buildPrompt(userMessage, userJid, imageData = null, personaConfig) {
    const history = this.getHistory(userJid);
    const hasHistory = history !== "Nenhuma conversa anterior.";

    let promptTemplate = imageData
      ? LUMA_CONFIG.VISION_PROMPT_TEMPLATE
      : LUMA_CONFIG.PROMPT_TEMPLATE;
    const traitsStr = personaConfig.traits.map((t) => `- ${t}`).join("\n");

    const prompt = promptTemplate
      .replace("{{PERSONALITY_CONTEXT}}", personaConfig.context)
      .replace("{{PERSONALITY_STYLE}}", personaConfig.style)
      .replace("{{PERSONALITY_TRAITS}}", traitsStr)
      .replace(
        "{{HISTORY_PLACEHOLDER}}",
        hasHistory ? `CONVERSA ANTERIOR:\n${history}\n` : ""
      )
      .replace("{{USER_MESSAGE}}", userMessage);

    if (imageData) {
      return [{ role: "user", parts: [{ text: prompt }, imageData] }];
    }
    return [{ role: "user", parts: [{ text: prompt }] }];
  }

  cleanResponse(text) {
    if (!text) return "";
    let cleaned = text
      .trim()
      .replace(/<think>[\s\S]*?<\/think>/gi, "") // Remove pensamento
      .replace(/^Luma:\s*/i, "")
      .trim();

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
      case "QUOTA_EXCEEDED":
        return errorConfig.QUOTA_EXCEEDED;
      default:
        const generalErrors = errorConfig.GENERAL;
        return generalErrors[Math.floor(Math.random() * generalErrors.length)];
    }
  }

  getStats() {
    return { msg: "Stats simplificado" };
  }
}
