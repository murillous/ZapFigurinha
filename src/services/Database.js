import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = "./data";
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

const pathPrivate = path.join(DATA_DIR, "luma_private.sqlite");
const dbPrivate = new Database(pathPrivate);

const pathMetrics = path.join(DATA_DIR, "luma_metrics.sqlite");
const dbMetrics = new Database(pathMetrics);


dbPrivate.pragma("journal_mode = WAL");
dbMetrics.pragma("journal_mode = WAL");


dbPrivate.exec(`
  CREATE TABLE IF NOT EXISTS chat_settings (
    jid TEXT PRIMARY KEY,
    personality TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

dbMetrics.exec(`
  CREATE TABLE IF NOT EXISTS metrics (
    key TEXT PRIMARY KEY,
    count INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS stats_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    data TEXT NOT NULL
  );
`);

export class DatabaseService {

  static getPersonality(jid) {
    const stmt = dbPrivate.prepare("SELECT personality FROM chat_settings WHERE jid = ?");
    const row = stmt.get(jid);
    return row ? row.personality : null;
  }

  static setPersonality(jid, personalityKey) {
    const stmt = dbPrivate.prepare(`
      INSERT INTO chat_settings (jid, personality, updated_at) 
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(jid) DO UPDATE SET 
        personality = excluded.personality,
        updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(jid, personalityKey);
  }

  static incrementMetric(key) {
    const stmt = dbMetrics.prepare(`
      INSERT INTO metrics (key, count) 
      VALUES (?, 1)
      ON CONFLICT(key) DO UPDATE SET count = count + 1
    `);
    stmt.run(key);
  }

  static getMetrics() {
    const stmt = dbMetrics.prepare("SELECT key, count FROM metrics");
    const rows = stmt.all();

    const stats = {};
    rows.forEach(row => {
      stats[row.key] = row.count;
    });
    return stats;
  }

  static saveSnapshot(fullStats) {
    const stmt = dbMetrics.prepare("INSERT INTO stats_history (data) VALUES (?)");
    stmt.run(JSON.stringify(fullStats));
  }

  static getHistory(limit = 5) {
    const stmt = dbMetrics.prepare("SELECT timestamp, data FROM stats_history ORDER BY id DESC LIMIT ?");
    return stmt.all(limit).map(row => ({
      date: row.timestamp,
      stats: JSON.parse(row.data)
    }));
  }
}