// Technician requests made by an AI through the connection, and the log of
// everything an AI looked up. Both live in one folder on a Docker volume
// (KOPPELING_DATA), so they survive restarts until the trainer wipes them.
//
// Why requests and not appointments: the AI may only propose. A person
// approves or rejects every request (in the chat, or in the Klantbeeld).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { now } from '../shared/world.js';

const DIR = process.env.KOPPELING_DATA ?? path.join(os.tmpdir(), 'vezelvriend-koppeling');
fs.mkdirSync(DIR, { recursive: true });
const REQUESTS = path.join(DIR, 'monteursverzoeken.json');
const LOG = path.join(DIR, 'opvragingen.jsonl');
const MAX_REQUESTS = 2000;
const MAX_LOG_BYTES = 20_000_000;

const read = () => { try { return JSON.parse(fs.readFileSync(REQUESTS, 'utf8')); } catch { return []; } };
const write = (list) => { const tmp = `${REQUESTS}.tmp`; fs.writeFileSync(tmp, JSON.stringify(list)); fs.renameSync(tmp, REQUESTS); };

// The service conditions promise a visit within 2 working days. The world
// clock is Saturday 17-10-2026, so the first free slot is Tuesday morning.
// The AI cannot choose the time: it does not know when the customer is home.
function firstSlot() {
  const d = new Date(`${now.slice(0, 10)}T00:00:00Z`);
  let workdays = 0;
  while (workdays < 2) { d.setUTCDate(d.getUTCDate() + 1); if (d.getUTCDay() % 6 !== 0) workdays++; }
  return `${d.toISOString().slice(0, 10)} 08:00-12:00`;
}

export function createRequest({ customerId, reason, source }) {
  const list = read();
  if (list.length >= MAX_REQUESTS) list.shift();
  const seq = Math.max(0, ...list.map((r) => r.seq)) + 1;
  const request = {
    seq, id: `MV-${String(seq).padStart(4, '0')}`, customerId, reason, slot: firstSlot(),
    status: 'wacht op goedkeuring', requestedAt: new Date().toISOString(), source: source ?? null, decidedAt: null, decidedBy: null,
  };
  write([...list, request]);
  return request;
}

export function decideRequest(id, decision, by) {
  const list = read();
  const request = list.find((r) => r.id === id);
  if (!request) return { error: 'Verzoek niet gevonden.' };
  if (request.status !== 'wacht op goedkeuring') return { error: `Dit verzoek is al ${request.status}.` };
  request.status = decision === 'goedkeuren' ? 'gepland' : 'afgewezen';
  request.decidedAt = new Date().toISOString();
  request.decidedBy = String(by ?? 'medewerker').slice(0, 80);
  write(list);
  return { request };
}

export const requestsFor = (customerId) => read().filter((r) => !customerId || r.customerId === customerId);
export const requestById = (id) => read().find((r) => r.id === id) ?? null;
export const wipeRequests = (trainingId) => write(trainingId ? read().filter((r) => r.source?.training !== trainingId) : []);

/** Appends one line per tool call: who, which tool, which arguments. Not the result. */
export function logCall(entry) {
  try {
    if (fs.existsSync(LOG) && fs.statSync(LOG).size > MAX_LOG_BYTES) fs.renameSync(LOG, `${LOG}.oud`);
    fs.appendFileSync(LOG, JSON.stringify({ at: new Date().toISOString(), ...entry }) + '\n');
  } catch (err) { console.error('log failed:', err.message); }
}

export function callsFor(trainingId) {
  try {
    return fs.readFileSync(LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l))
      .filter((e) => !trainingId || e.source?.training === trainingId);
  } catch { return []; }
}

export function wipeCalls(trainingId) {
  if (!trainingId) { try { fs.rmSync(LOG, { force: true }); } catch { /* gone */ } return; }
  const kept = callsFor().filter((e) => e.source?.training !== trainingId);
  fs.writeFileSync(LOG, kept.map((e) => JSON.stringify(e)).join('\n') + (kept.length ? '\n' : ''));
}
