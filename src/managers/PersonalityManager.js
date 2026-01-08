import { LUMA_CONFIG } from "../config/lumaConfig.js";
import { DatabaseService } from "../services/Database.js";

export class PersonalityManager {

  static getPersonaConfig(jid) {
    const savedKey = DatabaseService.getPersonality(jid);
    
    const key = savedKey || LUMA_CONFIG.DEFAULT_PERSONALITY;
    
    return LUMA_CONFIG.PERSONALITIES[key] || LUMA_CONFIG.PERSONALITIES[LUMA_CONFIG.DEFAULT_PERSONALITY];
  }

  static setPersonality(jid, key) {
    if (LUMA_CONFIG.PERSONALITIES[key]) {
      DatabaseService.setPersonality(jid, key);
      return true;
    }
    return false;
  }

  static getActiveName(jid) {
    const config = this.getPersonaConfig(jid);
    return config.name;
  }

  static getList() {
    return Object.entries(LUMA_CONFIG.PERSONALITIES).map(([key, data]) => ({
      key,
      name: data.name,
      desc: data.description,
    }));
  }
}