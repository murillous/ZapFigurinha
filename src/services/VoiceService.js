import axios from "axios";
import { Logger } from "../utils/Logger.js";
import dotenv from "dotenv";

dotenv.config();

// Memória RAM para guardar quem ativou a voz
// (Quando reiniciar o bot, isso zera)
const activeVoiceChats = new Set();

export class VoiceService {
  /**
   * Verifica se a API Key está configurada
   */
  static isConfigured() {
    return !!process.env.ELEVENLABS_API_KEY;
  }

  // --- CONTROLE DE ESTADO (NOVO - SEM BANCO DE DADOS) ---

  static isActive(jid) {
    return activeVoiceChats.has(jid);
  }

  static toggleVoice(jid) {
    if (activeVoiceChats.has(jid)) {
      activeVoiceChats.delete(jid);
      return false; // Desligou
    } else {
      activeVoiceChats.add(jid);
      return true; // Ligou
    }
  }

  // -----------------------------------------------------

  static async generateAudio(text) {
    if (!this.isConfigured()) {
      Logger.error("❌ ELEVENLABS_API_KEY não encontrada no .env");
      return null;
    }

    // ID da Voz (Rachel)
    const VOICE_ID = "21m00Tcm4TlvDq8ikWAM";
    const MODEL_ID = "eleven_multilingual_v2";
    const safeText = text.length > 450 ? text.substring(0, 450) + "..." : text;
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;

    try {
      const response = await axios.post(
        url,
        {
          text: safeText,
          model_id: MODEL_ID,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        },
        {
          headers: {
            "xi-api-key": process.env.ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
          },
          responseType: "arraybuffer",
          timeout: 30000,
        }
      );

      return Buffer.from(response.data);
    } catch (error) {
      Logger.error("❌ Erro ElevenLabs:", error.message);
      return null;
    }
  }
}
