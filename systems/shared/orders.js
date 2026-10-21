// Orders placed on the website (/pakket/) and how they reach the systems.
//
// Why a separate file instead of writing into the database: the systems
// rebuild their database from the seed files on every start, read-only, so
// nobody can break the data for the next group. Orders are the one thing
// visitors add. They live in one JSON file on a shared volume:
// - `mijn` (the website API) appends an order;
// - Klantsysteem, Klantbeeld and the app copy all orders into their own
//   database when the file has changed (see syncOrders);
// - the trainer wipes them from the trainer screen.
//
// Each order already holds the finished database rows, so the systems only
// have to insert them. All order rows use their own number range (K-9...,
// A-9..., C-9..., B-...), separate from the generated world.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export const ORDERS_FILE = process.env.ORDERS_FILE ?? path.join(os.tmpdir(), 'vezelvriend-orders.json');
export const MAX_ORDERS = 1000;
export const KEEP_DAYS = 30;

const TABLES = ['addresses', 'customers', 'contracts', 'orders'];
const KEYS = { addresses: 'address_id', customers: 'customer_id', contracts: 'contract_id', orders: 'order_id' };

export function readOrders() {
  try { return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8')); } catch { return []; }
}

/** Write to a temp file first and then rename, so a reader never sees half a file. */
export function writeOrders(orders) {
  const tmp = `${ORDERS_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(orders));
  fs.renameSync(tmp, ORDERS_FILE);
}

/**
 * Returns a function that brings the database file up to date with the orders
 * file. Cheap when nothing changed (one stat call), so it runs before every request.
 * On a change it removes the previous order rows and inserts all current ones,
 * so a wipe by the trainer also reaches the systems.
 */
export function syncOrders(dbFile) {
  let seen = null;
  let applied = [];
  let db = null;
  return function refresh() {
    let stamp;
    try { const s = fs.statSync(ORDERS_FILE); stamp = `${s.mtimeMs}|${s.size}`; } catch { stamp = 'none'; }
    if (stamp === seen) return;
    seen = stamp;
    db ??= new DatabaseSync(dbFile);
    const orders = readOrders();
    db.exec('BEGIN');
    try {
      for (const table of [...TABLES].reverse()) {
        const ids = applied.flatMap((o) => (o.rows[table] ?? []).map((r) => r[KEYS[table]]));
        for (const id of ids) db.prepare(`DELETE FROM ${table} WHERE ${KEYS[table]} = ?`).run(id);
      }
      for (const order of orders) {
        for (const table of TABLES) {
          for (const row of order.rows[table] ?? []) {
            const columns = Object.keys(row);
            db.prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`)
              .run(...columns.map((c) => row[c]));
          }
        }
      }
      db.exec('COMMIT');
      applied = orders;
    } catch (err) {
      db.exec('ROLLBACK');
      seen = null;
      console.error('orders not applied:', err.message);
    }
  };
}
