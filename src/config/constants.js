export const CONFIG = {
  TEMP_DIR: "./temp",
  AUTH_DIR: "./auth_info",
  BLACKLIST_FILE: "./blacklist.json",
  MAX_RECONNECT_ATTEMPTS: 3,
  RECONNECT_DELAY: 5000,
  MIN_CLEAN_INTERVAL: 60000,
  STICKER_SIZE: 512,
  STICKER_QUALITY: 90,
  VIDEO_DURATION: 6,
  GIF_DURATION: 8,
  GIF_FPS: 15,
  MAX_FILE_SIZE: 800,
  VIDEO_FPS: 15,
  MAX_FILE_SIZE: 800,
  WEBP_QUALITY: 75,
  MAX_GIF_FRAMES: 50,
  TIMEOUT_MS: 60000,
  KEEPALIVE_MS: 30000,
};

export const COMMANDS = {
  STICKER: "!sticker",
  IMAGE: "!image",
  GIF: "!gif",
  HELP: "!help",
  PERSONA: "!persona",
  EVERYONE: "@everyone",
  BLACKLIST_ADD: "!blacklist add",
  BLACKLIST_REMOVE: "!blacklist remove",
  BLACKLIST_LIST: "!blacklist list",
  BLACKLIST_CLEAR: "!blacklist clear",
  LUMA_STATS: "!luma stats",
  LUMA_CLEAR: "!luma clear",
  MY_NUMBER: "!meunumero",
};

export const MENUS = {
  // Texto Informativo do !help
  HELP_TEXT:
    "🤖 *LISTA DE COMANDOS* 🤖\n\n" +
    "🎨 *MÍDIA*\n" +
    "• *!sticker* - Imagem/Vídeo/Link -> Sticker\n" +
    "• *!gif* - Sticker Animado -> GIF\n" +
    "• *!image* - Sticker -> Imagem\n\n" +
    "🧠 *INTELIGÊNCIA ARTIFICIAL*\n" +
    "• *Luma* - Fale qualquer coisa (ex: 'Luma, bom dia')\n" +
    "• *!persona* - Abre o menu para mudar a Luma\n" +
    "• *!luma clear* - Limpa memória da conversa\n\n" +
    "🛠️ *UTILITÁRIOS*\n" +
    "• *!meunumero* - Vê seu ID/Número\n" +
    "• *!help* - Mostra essa lista",

  // Menu Interativo (Só para personalidade)
  PERSONALITY: {
    HEADER: "🎭 *CONFIGURAÇÃO DA LUMA*\n_Responda com o código (ex: p1):_\n",
    FOOTER: "\n_A mudança é aplicada imediatamente neste chat._",
  },

  MSGS: {
    INVALID_OPT: "❌ Opção inválida. Tente p1, p2, etc.",
    PERSONA_CHANGED: "✅ Personalidade alterada para: ",
  },
};

export const MESSAGES = {
  INITIALIZING: "🤖 WhatsApp Sticker Bot - Conversor Completo",
  STICKER_COMMAND: "🔄 !sticker - Converte imagem/vídeo para sticker",
  IMAGE_COMMAND: "🖼️ !image - Converte sticker para imagem",
  GIF_COMMAND: "🎬 !gif - Converte sticker animado para GIF",
  WAITING_QR: "📱 Aguarde o QR Code...",
  CONNECTING: "🔄 Iniciando conexão com WhatsApp...",
  CONNECTED: "✅ Conectado com sucesso!",
  BOT_READY: "🎯 Bot pronto para uso",
  DISCONNECTED: "❌ Conexão fechada:",
  SEND_MEDIA_STICKER: "ℹ️ Envie uma mídia com !sticker",
  REPLY_MEDIA_STICKER: "ℹ️ Responda a uma imagem/vídeo com !sticker",
  SEND_STICKER_IMAGE: "ℹ️ Envie um sticker com !image",
  REPLY_STICKER_IMAGE: "ℹ️ Responda a um sticker com !image",
  SEND_STICKER_GIF: "ℹ️ Envie um sticker animado com !gif",
  REPLY_STICKER_GIF: "ℹ️ Responda a um sticker animado com !gif",
  STATIC_STICKER: "ℹ️ Este é um sticker estático. Use !image para converter",
  CONVERTED_IMAGE: "🖼️ Convertido!",
  EVERYONE_COMMAND: "📢 @everyone - Marca todos os integrantes do grupo",
  CONVERTED_GIF: "🎬 Convertido!",
  DOWNLOAD_ERROR: "❌ Erro ao baixar",
  CONVERSION_ERROR: "❌ Erro na conversão",
  GENERAL_ERROR: "❌ Erro",
  UNSUPPORTED_FORMAT: "❌ Formato não suportado ou arquivo corrompido.",
};
