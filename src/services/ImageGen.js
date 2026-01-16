import axios from "axios";
import { LUMA_CONFIG } from "../config/lumaConfig.js";
import { Logger } from "../utils/Logger.js";
import dotenv from "dotenv";

dotenv.config();

export class ImageGen {
  /**
   * Gera imagem usando API REST direta do Google (Mais estável para Imagen 4.0)
   */
  static async generate(prompt) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY faltando no .env");
    }

    const modelName =
      LUMA_CONFIG.TECHNICAL.imageModel

    // URL oficial para geração de imagem via REST
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict?key=${process.env.GEMINI_API_KEY}`;

    Logger.info(
      `🎨 Iniciando geração REST (${modelName}): "${prompt.substring(
        0,
        30
      )}..."`
    );

    try {
      const response = await axios.post(
        url,
        {
          instances: [
            {
              prompt: prompt,
            },
          ],
          parameters: {
            sampleCount: 1,
            aspectRatio: "1:1", // Ou "16:9", "9:16"
            // safetySettings podem ser adicionados aqui se precisar relaxar filtros
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 60000, // 60 segundos de timeout
        }
      );

      // A estrutura do Imagen retorna 'bytesBase64Encoded'
      const predictions = response.data.predictions;

      if (
        !predictions ||
        predictions.length === 0 ||
        !predictions[0].bytesBase64Encoded
      ) {
        Logger.error(
          "❌ Resposta inválida da API Google:",
          JSON.stringify(response.data)
        );
        throw new Error("API não retornou imagem válida.");
      }

      const base64Image = predictions[0].bytesBase64Encoded;

      Logger.info("✅ Imagem gerada com sucesso via REST!");
      return Buffer.from(base64Image, "base64");
    } catch (error) {
      // Tratamento de erros detalhado
      if (error.response) {
        const errData = error.response.data;
        Logger.error("❌ Erro API Google:", JSON.stringify(errData));

        if (JSON.stringify(errData).includes("quota")) {
          throw new Error("Cota de imagens do Google esgotada por hoje.");
        }
        if (
          JSON.stringify(errData).includes("safety") ||
          error.response.status === 400
        ) {
          throw new Error(
            "O Google bloqueou esse prompt por segurança (Conteúdo impróprio)."
          );
        }
      } else {
        Logger.error("❌ Erro de conexão:", error.message);
      }

      // Fallback para Pollinations se o Google falhar (Backup)
      Logger.warn("🔄 Tentando fallback para Pollinations...");
      return await this.generatePollinations(prompt);
    }
  }

  static async generatePollinations(prompt) {
    try {
      const seed = Math.floor(Math.random() * 1000000);
      const safePrompt = encodeURIComponent(prompt);
      // Usando modelo FLUX no Pollinations (ótima qualidade)
      const url = `https://image.pollinations.ai/prompt/${safePrompt}?model=flux&width=1024&height=1024&seed=${seed}&nologo=true`;

      const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 60000,
      });

      return Buffer.from(response.data);
    } catch (e) {
      throw new Error(
        "Falha total na geração de imagem (Google e Backup falharam)."
      );
    }
  }
}
