// Runs one participant query safely.
//
// The SQL screen is reachable on the internet, so a query must never be able
// to change data, read files or hang the server:
// - the database is opened read-only (writes fail at the SQLite level);
// - only a single SELECT/WITH statement is accepted;
// - the query runs in its own process (sql-child.js) that is KILLED after a
//   time limit. A worker thread is not enough: it cannot be stopped while
//   SQLite is busy in native code, so an endless recursive query would keep
//   burning a CPU core forever and slow down everyone else;
// - the number of returned rows is capped;
// - at most MAX_RUNNING queries run at the same time; the rest wait their
//   turn, so a whole group sending heavy queries at once cannot exhaust memory.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CHILD = path.join(path.dirname(fileURLToPath(import.meta.url)), 'sql-child.js');
const TIME_LIMIT_MS = 2000;
export const MAX_ROWS = 500;
const MAX_OUTPUT_BYTES = 5_000_000;

const MAX_RUNNING = 4;
const MAX_WAITING = 100;
const MAX_WAIT_MS = 20_000;
let running = 0;
const waiting = [];

// Waits for a free slot; resolves false when the wait takes too long or the queue is full.
function acquire() {
  if (running < MAX_RUNNING) { running++; return Promise.resolve(true); }
  if (waiting.length >= MAX_WAITING) return Promise.resolve(false);
  return new Promise((resolve) => {
    const entry = { resolve, timer: setTimeout(() => { waiting.splice(waiting.indexOf(entry), 1); resolve(false); }, MAX_WAIT_MS) };
    waiting.push(entry);
  });
}
function release() {
  const next = waiting.shift();
  if (next) { clearTimeout(next.timer); next.resolve(true); } else running--;
}

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

export async function runQuery(file, sql) {
  const problem = checkQuery(sql);
  if (problem) return { error: problem };
  if (!(await acquire())) return { error: 'Het is even erg druk in het SQL-scherm. Probeer het over een halve minuut opnieuw.' };
  try {
    return await runInChild(file, sql);
  } finally {
    release();
  }
}

function runInChild(file, sql) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (result) => { if (!settled) { settled = true; clearTimeout(timer); resolve(result); } };

    const child = spawn(process.execPath, ['--max-old-space-size=64', CHILD], { stdio: ['pipe', 'pipe', 'ignore'] });
    let output = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      output += chunk;
      if (output.length > MAX_OUTPUT_BYTES) { child.kill('SIGKILL'); done({ error: 'Het resultaat is te groot.' }); }
    });
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      done({ error: `De vraag duurde langer dan ${TIME_LIMIT_MS / 1000} seconden en is gestopt.` });
    }, TIME_LIMIT_MS);
    child.on('error', (err) => done({ error: err.message }));
    child.on('close', () => {
      try { done(JSON.parse(output)); } catch { done({ error: 'De vraag is gestopt zonder resultaat.' }); }
    });
    child.stdin.end(JSON.stringify({ file, sql: sql.trim().replace(/;\s*$/, ''), maxRows: MAX_ROWS }));
  });
}
