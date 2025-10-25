export const CONFIG = {
  TEMP_DIR: "./temp",
  AUTH_DIR: "./auth_info",
  BLACKLIST_FILE: "./blacklist.json",
  OWNER_NUMBER: "YOUR_NUMBER",
  MAX_RECONNECT_ATTEMPTS: 3,
  RECONNECT_DELAY: 5000,
  MIN_CLEAN_INTERVAL: 60000,
  STICKER_SIZE: 512,
  STICKER_QUALITY: 90,
  VIDEO_DURATION: 6,
  GIF_DURATION: 8,
  GIF_FPS: 15,
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
  EVERYONE: "@everyone",
  BLACKLIST_ADD: "!blacklist add",
  BLACKLIST_REMOVE: "!blacklist remove",
  BLACKLIST_LIST: "!blacklist list",
  BLACKLIST_CLEAR: "!blacklist clear"
};