// Runs one participant query safely.
//
// The SQL screen is reachable on the internet, so a query must never be able
// to change data, read files or hang the server:
// - the database is opened read-only (writes fail at the SQLite level);
// - only a single SELECT/WITH statement is accepted;
// - the query runs in a worker thread that is killed after a time limit,
//   so an endless recursive query cannot block other participants;
// - the number of returned rows is capped.
import { Worker } from 'node:worker_threads';

const TIME_LIMIT_MS = 2000;
export const MAX_ROWS = 500;
// Writes are already impossible on a read-only connection; this list blocks the
// statements that reach outside the database itself (other files, settings).
const FORBIDDEN = /\b(attach|detach|pragma|vacuum|load_extension)\b/i;

export function checkQuery(sql) {
  const text = sql.trim().replace(/;\s*$/, '');
  if (!text) return 'Typ eerst een SQL-vraag.';
  if (text.includes(';')) return 'Eén vraag tegelijk: gebruik maar één puntkomma, aan het eind.';
  if (!/^(select|with)\b/i.test(text)) return 'Alleen SELECT-vragen zijn toegestaan. Je kunt de data lezen, niet wijzigen.';
  if (FORBIDDEN.test(text)) return 'Deze vraag bevat een opdracht die hier niet is toegestaan. Je kunt alleen lezen.';
  return null;
}

const WORKER_CODE = `
const { parentPort, workerData } = require('node:worker_threads');
const { DatabaseSync } = require('node:sqlite');
try {
  const db = new DatabaseSync(workerData.file, { readOnly: true });
  const stmt = db.prepare(workerData.sql);
  const columns = stmt.columns().map((c) => c.name);
  const rows = [];
  for (const row of stmt.iterate()) {
    if (rows.length >= workerData.maxRows) { parentPort.postMessage({ columns, rows, truncated: true }); process.exit(0); }
    rows.push(columns.map((c) => row[c]));
  }
  parentPort.postMessage({ columns, rows, truncated: false });
} catch (err) {
  parentPort.postMessage({ error: err.message });
}`;

export function runQuery(file, sql) {
  const problem = checkQuery(sql);
  if (problem) return Promise.resolve({ error: problem });
  return new Promise((resolve) => {
    const worker = new Worker(WORKER_CODE, {
      eval: true,
      workerData: { file, sql: sql.trim().replace(/;\s*$/, ''), maxRows: MAX_ROWS },
      resourceLimits: { maxOldGenerationSizeMb: 64 },
    });
    const timer = setTimeout(() => {
      worker.terminate();
      resolve({ error: `De vraag duurde langer dan ${TIME_LIMIT_MS / 1000} seconden en is gestopt.` });
    }, TIME_LIMIT_MS);
    worker.once('message', (msg) => { clearTimeout(timer); worker.terminate(); resolve(msg); });
    worker.once('error', (err) => { clearTimeout(timer); resolve({ error: err.message }); });
  });
}
