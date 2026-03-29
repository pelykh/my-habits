import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const DB_PATH = process.env.DB_PATH || './data/habits.db';

try { mkdirSync(dirname(DB_PATH), { recursive: true }); } catch (_) {}

let db;

export function initDb() {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS habits (
      id         INTEGER PRIMARY KEY,
      cue        TEXT    NOT NULL,
      routine    TEXT    NOT NULL,
      reward     TEXT    NOT NULL,
      color_idx  INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS marks (
      habit_id  INTEGER NOT NULL,
      date      TEXT    NOT NULL,
      strokes   TEXT    NOT NULL,
      tool      TEXT    NOT NULL,
      PRIMARY KEY (habit_id, date),
      FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    INSERT OR IGNORE INTO settings (key, value) VALUES ('lang', 'en');
  `);

  const { c } = db.prepare('SELECT COUNT(*) as c FROM habits').get();
  if (c === 0) {
    db.prepare(
      'INSERT INTO habits (id, cue, routine, reward, color_idx, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(1, 'Wash face with cold water', 'Go to office, exercises for 2 minutes', 'Say with energy \u201cNice\u201d', 0, 0);
  }
}

export function getDb() { return db; }
