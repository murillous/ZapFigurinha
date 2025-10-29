import { Logger } from "../utils/Logger.js";
import { MessageHandler } from "../handlers/MessageHandler.js";

export class GroupManager {
  static async mentionEveryone(message, sock) {
    try {
      const jid = message.key.remoteJid;

      if (!jid.endsWith("@g.us")) {
        await MessageHandler.sendMessage(
          sock,
          jid,
          "⚠️ Este comando só funciona em grupos!"
        );
        return;
      }

      const groupMetadata = await sock.groupMetadata(jid);
      const participants = groupMetadata.participants;

      const sender = message.key.participant || message.key.remoteJid;
      const isAdmin = participants.find((p) => p.id === sender)?.admin;

      if (!isAdmin) {
        await MessageHandler.sendMessage(
          sock,
          jid,
          "⚠️ Apenas administradores podem usar este comando!"
        );
        return;
      }

      const mentions = participants.map((p) => p.id);

      const text = participants.map((p) => `@${p.id.split("@")[0]}`).join(" ");

      await sock.sendMessage(jid, {
        text: `📢 *Atenção geral!*\n\n${text}`,
        mentions: mentions,
      });

      Logger.info(`✅ Mencionados ${participants.length} participantes`);
    } catch (error) {
      Logger.error("Erro ao mencionar todos:", error);
      await MessageHandler.sendMessage(
        sock,
        message.key.remoteJid,
        "❌ Erro ao mencionar participantes"
      );
    }
  }
}
