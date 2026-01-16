import { GoogleGenerativeAI } from "@google/generative-ai";
import { downloadMediaMessage } from "@whiskeysockets/baileys";
import { LUMA_CONFIG } from "../config/lumaConfig.js";
import { Logger } from "../utils/Logger.js";
import { DatabaseService } from "../services/Database.js";
import { VoiceService } from "../services/VoiceService.js"; // Certifique-se que está importado
import dotenv from "dotenv";

dotenv.config();

export class LumaHandler {
  constructor() {
    this.conversationHistory = new Map();
    this.lastBotMessageIds = new Map();

    if (process.env.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
  }

  // --- MÉTODOS ESTÁTICOS ---

  static extractUserMessage(fullText) {
    if (!fullText) return "";
    for (const trigger of LUMA_CONFIG.TRIGGERS) {
      if (trigger.test(fullText)) {
        return fullText.replace(trigger, "").trim();
      }
    }
    return fullText;
  }

  static isTriggered(text) {
    if (!text) return false;
    return LUMA_CONFIG.TRIGGERS.some((t) => t.test(text));
  }

  // --- GERAÇÃO DE RESPOSTA ---

  async generateResponse(
    userMessage,
    userJid,
    messageObject = null,
    sock = null
  ) {
    if (!this.genAI) return "⚠️ Erro: Sem API Key do Gemini.";

    try {
      const personalityKey =
        DatabaseService.getPersonality(userJid) ||
        LUMA_CONFIG.DEFAULT_PERSONALITY;
      const personaConfig = LUMA_CONFIG.PERSONALITIES[personalityKey];

      // 1. Visão (Imagens)
      let imageBuffer = null;
      let isVisionRequest = false;

      if (messageObject && sock) {
        if (this.hasImage(messageObject)) {
          imageBuffer = await this.downloadImage(messageObject, sock);
          isVisionRequest = true;
        } else if (this.hasQuotedImage(messageObject)) {
          imageBuffer = await this.downloadQuotedImage(messageObject, sock);
          isVisionRequest = true;
        }
      }

      // 2. Montar Prompt
      const systemInstruction = this.buildSystemPrompt(
        personaConfig,
        userJid,
        userMessage,
        isVisionRequest
      );

      let promptParts = [];
      if (isVisionRequest && imageBuffer) {
        promptParts = [
          systemInstruction,
          {
            inlineData: {
              data: imageBuffer.toString("base64"),
              mimeType: "image/jpeg",
            },
          },
        ];
      } else {
        promptParts = [systemInstruction];
      }

      // 3. Chamar IA
      const rawText = await this.sendToAIWithFallback(promptParts);
      const cleanedResponse = this.cleanResponse(rawText);

      this.addToHistory(userJid, userMessage, cleanedResponse);

      // --- CORREÇÃO AQUI (Mudou de DatabaseService para VoiceService) ---

      // ANTES (ERRADO): const isVoiceActive = DatabaseService.getVoiceMode(userJid);
      // AGORA (CERTO):
      const isVoiceActive = VoiceService.isActive(userJid);
      const canSpeak = VoiceService.isConfigured();

      if (isVoiceActive && canSpeak) {
        const audioBuffer = await VoiceService.generateAudio(cleanedResponse);
        if (audioBuffer) {
          return { type: "audio", buffer: audioBuffer, text: cleanedResponse };
        }
      }
      // ------------------------------------------------------------------

      return cleanedResponse;
    } catch (error) {
      Logger.error("❌ Erro LumaHandler:", error);
      return "Deu ruim aqui no meu cérebro.";
    }
  }

  // --- HELPERS (Não mudaram) ---

  async sendToAIWithFallback(promptParts) {
    const models = LUMA_CONFIG.TECHNICAL.models;
    for (const modelName of models) {
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(promptParts);
        return result.response.text();
      } catch (e) {
        continue;
      }
    }
    throw new Error("Todos modelos falharam");
  }

  buildSystemPrompt(persona, jid, userMessage, isVision) {
    let template = isVision
      ? LUMA_CONFIG.VISION_PROMPT_TEMPLATE
      : LUMA_CONFIG.PROMPT_TEMPLATE;
    const history = this.getHistory(jid);
    const historyText = history
      .map((h) => `${h.role === "user" ? "User" : "Luma"}: ${h.text}`)
      .join("\n");

    return template
      .replace("{{PERSONALITY_CONTEXT}}", persona.context)
      .replace("{{PERSONALITY_STYLE}}", persona.style)
      .replace("{{PERSONALITY_TRAITS}}", persona.traits.join("\n"))
      .replace("{{HISTORY_PLACEHOLDER}}", historyText)
      .replace("{{USER_MESSAGE}}", userMessage || "");
  }

  addToHistory(jid, user, bot) {
    if (!this.conversationHistory.has(jid))
      this.conversationHistory.set(jid, []);
    const h = this.conversationHistory.get(jid);
    h.push({ role: "user", text: user }, { role: "model", text: bot });
    if (h.length > 20) this.conversationHistory.set(jid, h.slice(-20));
  }

  getHistory(jid) {
    return this.conversationHistory.get(jid) || [];
  }
  clearHistory(jid) {
    this.conversationHistory.delete(jid);
  }
  getStats() {
    return { totalConversations: this.conversationHistory.size };
  }

  cleanResponse(text) {
    return text ? text.replace(/^Luma:/i, "").trim() : "...";
  }

  isReplyToLuma(message) {
    const quotedId =
      message.message?.extendedTextMessage?.contextInfo?.stanzaId;
    return (
      quotedId && this.lastBotMessageIds.get(message.key.remoteJid) === quotedId
    );
  }
  saveLastBotMessage(jid, id) {
    this.lastBotMessageIds.set(jid, id);
  }
  getRandomBoredResponse() {
    return LUMA_CONFIG.BORED_RESPONSES[0];
  }

  hasImage(m) {
    return !!m.message?.imageMessage;
  }
  hasQuotedImage(m) {
    return !!m.message?.extendedTextMessage?.contextInfo?.quotedMessage
      ?.imageMessage;
  }
  async downloadImage(m, sock) {
    return downloadMediaMessage(m, "buffer", {}, { logger: Logger });
  }
  async downloadQuotedImage(m, sock) {
    const q = m.message.extendedTextMessage.contextInfo;
    return downloadMediaMessage(
      { message: { imageMessage: q.quotedMessage.imageMessage } },
      "buffer",
      {},
      { logger: Logger }
    );
  }
}
