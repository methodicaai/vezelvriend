// Builds the SQLite database from data/schema.sql and data/seed/*.json.
//
// Why rebuild on every start: the JSON seed files are the single source of
// truth (readable on GitHub, easy to review), and a participant can never
// leave the database in a broken state for the next group.
// node:sqlite is built into Node 24, so there is no database driver to install.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { ROOT, world } from './world.js';

// SEED_DIR lets tests build a database from a generated world (data/generated/seed).
const SEED_DIR = process.env.SEED_DIR ?? path.join(ROOT, 'data', 'seed');

// Insert order follows the foreign keys.
const TABLES = [
  'addresses', 'customers', 'contracts', 'modems', 'modem_measurements',
  'remote_restarts', 'area_status', 'tickets', 'contacts', 'network_map', 'support_log',
];

export function buildDatabase(file) {
  fs.rmSync(file, { force: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(fs.readFileSync(path.join(ROOT, 'data', 'schema.sql'), 'utf8'));

  db.exec('BEGIN');
  for (const table of TABLES) {
    const rows = JSON.parse(fs.readFileSync(path.join(SEED_DIR, `${table}.json`), 'utf8'));
    for (const row of rows) {
      // The hand-made template has no city in its rows: it comes from the single
      // setting in config/world.json. A generated world has real BAG cities.
      if (table === 'addresses') row.city ??= world.city;
      const columns = Object.keys(row);
      const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`;
      db.prepare(sql).run(...columns.map((c) => row[c]));
    }
  }
  db.exec('COMMIT');
  db.close();
}

/**
 * Builds a fresh database for one app and opens it read-only.
 * Each running process gets its own file, so two apps (or two copies of one
 * app) never collide. The file is removed again when the process stops.
 * Read-only on purpose: nothing in these screens may change the data.
 */
export function openDatabase(appName) {
  const file = path.join(os.tmpdir(), `vezelvriend-${appName}-${process.pid}.db`);
  buildDatabase(file);
  const db = new DatabaseSync(file, { readOnly: true });
  const cleanUp = () => { try { db.close(); fs.rmSync(file, { force: true }); } catch { /* already gone */ } };
  process.once('exit', cleanUp);
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => process.exit(0));
  return { db, file };
}
