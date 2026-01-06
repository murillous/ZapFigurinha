import { LUMA_CONFIG } from "../config/lumaConfig.js";

export class PersonalityManager {
  static activePersonalities = new Map();

  static getPersonaConfig(jid) {
    const key =
      this.activePersonalities.get(jid) || LUMA_CONFIG.DEFAULT_PERSONALITY;
    return LUMA_CONFIG.PERSONALITIES[key];
  }

  static setPersonality(jid, key) {
    if (LUMA_CONFIG.PERSONALITIES[key]) {
      this.activePersonalities.set(jid, key);
      return true;
    }
    return false;
  }

  static getActiveName(jid) {
    return this.getPersonaConfig(jid).name;
  }

  static getList() {
    return Object.entries(LUMA_CONFIG.PERSONALITIES).map(([key, data]) => ({
      key,
      name: data.name,
      desc: data.description,
    }));
  }
}
