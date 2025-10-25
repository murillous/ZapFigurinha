import fs from "fs";
import { CONFIG } from "../config/constants.js";
import { Logger } from "../utils/Logger.js";

export class BlacklistManager {
  static blacklist = new Set();

  static initialize() {
    try {
      if (fs.existsSync(CONFIG.BLACKLIST_FILE)) {
        const data = JSON.parse(fs.readFileSync(CONFIG.BLACKLIST_FILE, 'utf8'));
        this.blacklist = new Set(data.groups || []);
        Logger.info(`📋 Blacklist carregada: ${this.blacklist.size} grupos bloqueados`);
      } else {
        this.save();
        Logger.info("📋 Arquivo de blacklist criado");
      }
    } catch (error) {
      Logger.error("Erro ao carregar blacklist:", error);
      this.blacklist = new Set();
    }
  }

  static save() {
    try {
      const data = {
        groups: Array.from(this.blacklist),
        lastUpdate: new Date().toISOString()
      };
      fs.writeFileSync(CONFIG.BLACKLIST_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      Logger.error("Erro ao salvar blacklist:", error);
    }
  }

  static isBlocked(jid) {
    return this.blacklist.has(jid);
  }

  static add(jid) {
    if (!jid.endsWith('@g.us')) {
      return false; 
    }
    this.blacklist.add(jid);
    this.save();
    Logger.info(`🚫 Grupo adicionado à blacklist: ${jid}`);
    return true;
  }

  static remove(jid) {
    const removed = this.blacklist.delete(jid);
    if (removed) {
      this.save();
      Logger.info(`✅ Grupo removido da blacklist: ${jid}`);
    }
    return removed;
  }

  static list() {
    return Array.from(this.blacklist);
  }

  static clear() {
    this.blacklist.clear();
    this.save();
    Logger.info("🗑️ Blacklist limpa");
  }
}