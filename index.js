import { FileSystem } from "./src/utils/FileSystem.js";
import { Logger } from "./src/utils/Logger.js";
import { MESSAGES } from "./src/config/messages.js";
import { CONFIG } from "./src/config/constants.js";
import { ConnectionManager } from "./src/managers/ConnectionManager.js";
import { BlacklistManager } from "./src/managers/BlacklistManager.js";

class BotInitializer {
  static async start() {
    try {
      FileSystem.ensureDir(CONFIG.TEMP_DIR);
      FileSystem.ensureDir(CONFIG.AUTH_DIR);

      BlacklistManager.initialize();

      Logger.info(MESSAGES.INITIALIZING);
      Logger.info(MESSAGES.STICKER_COMMAND);
      Logger.info(MESSAGES.IMAGE_COMMAND);
      Logger.info(MESSAGES.GIF_COMMAND);
      Logger.info(MESSAGES.EVERYONE_COMMAND);
      Logger.info(MESSAGES.WAITING_QR);

      const connectionManager = new ConnectionManager();

      process.on("SIGINT", () => connectionManager.gracefulShutdown());
      process.on("SIGTERM", () => connectionManager.gracefulShutdown());

      await connectionManager.initialize();
    } catch (error) {
      Logger.error("❌ Erro fatal:", error);
      process.exit(1);
    }
  }
}

async function initializeBot() {
  await BotInitializer.start();
}

// ============================================================================
// EVENT LISTENERS GLOBAIS
// ============================================================================

process.on("unhandledRejection", (reason) => {
  Logger.error("❌ Unhandled Rejection:", reason);
});

process.on("uncaughtException", (error) => {
  Logger.error("❌ Uncaught Exception:", error);
});

// ============================================================================
// INICIAR BOT
// ============================================================================

initializeBot();

export default ConnectionManager;