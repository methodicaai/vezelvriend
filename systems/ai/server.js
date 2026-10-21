// AI box for the exercises (runs behind the gateway at /api/ai/ and /trainer/).
//
// - Participants log in with a personal code from the trainer. Only then can
//   they send a prompt to the AI from an exercise page.
// - Every prompt and answer is stored with who sent it and when, so the
//   trainer can discuss them with the group.
// - The trainer manages trainings and codes, and reads the conversations, at
//   /trainer/ with a password that only exists in the server's .env file.
//
// The AI never reads the fake systems: the participant still decides what
// context goes into the prompt. That stays the core of the training.
import crypto from 'node:crypto';
import { aiEnabled, aiModel, askClaude } from './claude.js';
import { openStore } from './store.js';
import { KEEP_DAYS, readOrders, writeOrders } from '../shared/orders.js';
import { cookie, registerFailure, sign, tooManyFailures, unsign } from '../shared/session.js';
import { cookies, html, readForm, readJson, routesOf, serve } from '../shared/web.js';

const PORT = Number(process.env.PORT ?? 3003);
const store = openStore(process.env.AI_DB_FILE ?? '/data/ai.db');
const MAX_PER_DAY = Number(process.env.AI_MAX_PER_DAY || 40);
const MAX_PROMPT_CHARS = Number(process.env.AI_MAX_PROMPT_CHARS || 30_000);
const TRAINER_PASSWORD = process.env.TRAINER_PASSWORD || '';

const PARTICIPANT_COOKIE = 'vv_ai';
const TRAINER_COOKIE = 'vv_trainer';
const DAY = 24 * 60 * 60;

function participantFrom(req) {
  const value = unsign(cookies(req)[PARTICIPANT_COOKIE]);
  if (!value) return null;
  const [id, expires] = value.split(':').map(Number);
  if (!id || expires < Date.now()) return null;
  return store.activeParticipant(id);
}
function isTrainer(req) {
  const value = unsign(cookies(req)[TRAINER_COOKIE]);
  return value !== null && Number(value) > Date.now();
}

// Forms of the trainer screen must come from this site (on top of SameSite cookies).
function sameOrigin(req) {
  const origin = req.headers.origin;
  return !origin || new URL(origin).host === req.headers['x-forwarded-host'] || new URL(origin).host === req.headers.host;
}

const json = (status, data, headers) => ({ status, type: 'application/json; charset=utf-8', body: JSON.stringify(data), headers });
const redirect = (location, headers = {}) => ({ status: 303, headers: { Location: location, ...headers } });

// ---------------------------------------------------------------- participants

function status({ req }) {
  const p = participantFrom(req);
  return json(200, {
    enabled: aiEnabled(),   // "Stuur naar AI" (needs an API key)
    handIn: true,           // "Inleveren" works with codes only, no AI key needed
    loggedIn: Boolean(p),
    participant: p ? { label: p.label, training: p.training_name } : null,
  });
}

async function login({ req }) {
  // Generous: a whole group behind one office IP may mistype codes now and then.
  if (tooManyFailures(req, 'code', 50)) return json(429, { error: 'Te veel mislukte pogingen. Wacht een kwartier en probeer het opnieuw.' });
  const { code } = await readJson(req, 2_000);
  const p = typeof code === 'string' && code.trim() ? store.login(code) : null;
  if (!p) {
    registerFailure(req, 'code');
    return json(401, { error: 'Deze code klopt niet, of de training is afgelopen.' });
  }
  const expires = Date.now() + DAY * 1000;
  return json(200, { label: p.label, training: p.training_name }, {
    'Set-Cookie': cookie(PARTICIPANT_COOKIE, sign(`${p.participant_id}:${expires}`), DAY),
  });
}

// Used by nginx (auth_request) to guard the exercise pages: 204 when the
// visitor is logged in as a participant or as the trainer, 401 otherwise.
function check({ req }) {
  return participantFrom(req) || isTrainer(req) ? { status: 204, body: '' } : { status: 401, body: '' };
}

function logout() {
  return json(200, { ok: true }, { 'Set-Cookie': cookie(PARTICIPANT_COOKIE, '', 0) });
}

async function ask({ req }) {
  if (!aiEnabled()) return json(503, { error: 'De AI-koppeling staat uit.' });
  const p = participantFrom(req);
  if (!p) return json(401, { error: 'Log eerst in met je deelnemerscode (bovenaan de pagina).' });
  const body = await readJson(req);
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt) return json(400, { error: 'De prompt is leeg.' });
  if (prompt.length > MAX_PROMPT_CHARS) return json(400, { error: `De prompt is te lang (meer dan ${MAX_PROMPT_CHARS} tekens).` });
  if (store.countToday(p.participant_id) >= MAX_PER_DAY) {
    return json(429, { error: `Je hebt vandaag al ${MAX_PER_DAY} vragen gesteld. Dat is het maximum per dag.` });
  }

  const result = await askClaude(prompt);
  store.saveMessage({
    participantId: p.participant_id,
    exercise: String(body.exercise ?? '').slice(0, 100),
    promptBlock: String(body.block ?? '').slice(0, 200),
    prompt,
    ...result,
  });
  if (result.status === 'error') return json(502, { error: result.participantMessage });
  if (result.status === 'refusal') return json(200, { answer: result.answer ?? '', note: result.error });
  return json(200, { answer: result.answer });
}

// Participants who work in their own AI (e.g. Copilot at work) paste in the
// prompt and answer they want the trainer to see. They choose what to share,
// so they can remove work data first; nothing is collected automatically.
const TOOLS = ['Microsoft Copilot', 'ChatGPT', 'Claude', 'Gemini', 'Anders'];
const MAX_HAND_INS_PER_DAY = 60;

async function handIn({ req }) {
  const p = participantFrom(req);
  if (!p) return json(401, { error: 'Log eerst in met je deelnemerscode (bovenaan de pagina).' });
  const body = await readJson(req);
  const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const prompt = text(body.prompt, MAX_PROMPT_CHARS);
  const answer = text(body.answer, MAX_PROMPT_CHARS);
  if (!prompt || !answer) return json(400, { error: 'Vul zowel je prompt als het antwoord van je AI in.' });
  if (store.countSubmissionsToday(p.participant_id) >= MAX_HAND_INS_PER_DAY) {
    return json(429, { error: 'Je hebt vandaag het maximum aantal inleveringen bereikt.' });
  }
  store.saveSubmission({
    participantId: p.participant_id,
    exercise: text(body.exercise, 100),
    promptBlock: text(body.block, 200),
    tool: TOOLS.includes(body.tool) ? body.tool : 'Anders',
    prompt,
    answer,
    note: text(body.note, 2_000) || null,
  });
  return json(200, { ok: true });
}

// ---------------------------------------------------------------- trainer screen

const STYLE = '/klantsysteem/assets/systems.css';

function trainerPage(title, body) {
  return html`<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>${title} | Trainer | Vezelvriend</title>
  <link rel="stylesheet" href="${STYLE}">
</head>
<body>
  <header class="balk">
    <a class="systeem" href="/trainer/">Trainer · AI-gesprekken</a>
    <nav aria-label="Trainer"><a href="/training/">Training</a></nav>
    <form method="post" action="/trainer/uitloggen" class="klok"><button class="knop--licht">Uitloggen</button></form>
  </header>
  <main>${body}</main>
</body>
</html>`.value;
}

const time = (iso) => iso ? new Date(iso).toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam', dateStyle: 'short', timeStyle: 'medium' }) : '-';

function trainerLoginPage(message = '') {
  return { body: trainerPage('Inloggen', html`
    <h1>Inloggen als trainer</h1>
    ${TRAINER_PASSWORD ? '' : html`<div class="melding fout">Er is nog geen trainerwachtwoord ingesteld (TRAINER_PASSWORD in .env op de server).</div>`}
    ${message ? html`<div class="melding fout" role="alert">${message}</div>` : ''}
    <form method="post" action="/trainer/login" class="paneel">
      <p><label for="wachtwoord"><strong>Wachtwoord</strong></label><br>
      <input type="password" id="wachtwoord" name="wachtwoord" autocomplete="current-password" required></p>
      <p><button type="submit">Inloggen</button></p>
    </form>`) };
}

async function trainerLogin({ req }) {
  // Strict: only the trainer logs in here.
  if (tooManyFailures(req, 'trainer', 10)) return { status: 429, ...trainerLoginPage('Te veel mislukte pogingen. Wacht een kwartier.') };
  const form = await readForm(req, 2_000);
  const given = Buffer.from(form.get('wachtwoord') ?? '');
  const expected = Buffer.from(TRAINER_PASSWORD);
  const ok = TRAINER_PASSWORD && given.length === expected.length && crypto.timingSafeEqual(given, expected);
  if (!ok) {
    registerFailure(req, 'trainer');
    return { status: 401, ...trainerLoginPage('Dat wachtwoord klopt niet.') };
  }
  return redirect('/trainer/', { 'Set-Cookie': cookie(TRAINER_COOKIE, sign(String(Date.now() + 12 * 3600 * 1000)), 12 * 3600) });
}

const trainerLogout = () => redirect('/trainer/', { 'Set-Cookie': cookie(TRAINER_COOKIE, '', 0) });

// Wraps trainer routes: password check and same-origin check for forms.
const trainerOnly = (fn) => async (ctx) => {
  if (!isTrainer(ctx.req)) return ctx.req.method === 'GET' ? trainerLoginPage() : redirect('/trainer/');
  if (ctx.req.method === 'POST' && !sameOrigin(ctx.req)) return { status: 403, body: 'Niet toegestaan.' };
  return fn(ctx);
};

function trainingList() {
  const trainings = store.trainings();
  return { body: trainerPage('Trainingen', html`
    <h1>Trainingen</h1>
    <p class="uitleg">AI: ${aiEnabled() ? html`aan, model <span class="mono">${aiModel()}</span>` : 'uit (geen API-sleutel ingesteld)'} · maximaal ${MAX_PER_DAY} vragen per deelnemer per dag.</p>
    <div class="tabel-vak"><table>
      <thead><tr><th>Training</th><th>Aangemaakt</th><th>Deelnemers</th><th>AI-vragen</th><th>Ingeleverd</th><th>Codes</th></tr></thead>
      <tbody>${trainings.length === 0 ? html`<tr><td colspan="6" class="leeg">Nog geen trainingen.</td></tr>` : trainings.map((t) => html`<tr>
        <td><a href="/trainer/training/${t.training_id}">${t.name}</a></td>
        <td>${time(t.created_at)}</td><td>${t.participants}</td><td>${t.messages}</td><td>${t.submissions}</td>
        <td>${t.active ? html`<span class="status status--ok">werken</span>` : html`<span class="status status--uit">uitgezet</span>`}</td></tr>`)}</tbody>
    </table></div>
    ${ordersPanel()}
    <h2>Nieuwe training</h2>
    <form method="post" action="/trainer/training" class="paneel">
      <p><label for="naam"><strong>Naam van de training</strong></label><br>
      <input id="naam" name="naam" required maxlength="100" placeholder="Bijvoorbeeld: Gemeente X, 3 november"></p>
      <p><label for="deelnemers"><strong>Deelnemers</strong>, één per regel</label><br>
      <textarea id="deelnemers" name="deelnemers" rows="8" placeholder="Namen, of laat leeg en vul hieronder een aantal in"></textarea></p>
      <p><label for="aantal">Of alleen een aantal (dan heten ze Deelnemer 1, 2, ...)</label><br>
      <input id="aantal" name="aantal" type="number" min="1" max="60"></p>
      <p class="uitleg">De codes zie je één keer, direct na het aanmaken. Bewaar of print ze dan. Kwijt? Maak per deelnemer een nieuwe code.</p>
      <p><button type="submit">Training en codes aanmaken</button></p>
    </form>`) };
}

// Orders that visitors placed on the website (/pakket/). They are customers
// K-9... in the Klantsysteem until they are wiped here (or after KEEP_DAYS days).
function ordersPanel() {
  const count = readOrders().length;
  return html`<h2>Bestellingen op de website</h2>
    <p class="uitleg">${count === 0 ? 'Er zijn geen oefenbestellingen.' : `${count} oefenbestelling${count === 1 ? '' : 'en'}. Ze staan als klant in het Klantsysteem (klantnummers K-9...).`} Wis ze na de training; na ${KEEP_DAYS} dagen verdwijnen ze vanzelf.</p>
    ${count === 0 ? '' : html`<form method="post" action="/trainer/bestellingen/wissen" class="paneel">
      <p><label><input type="checkbox" name="zeker" value="ja" required> Ja, wis alle ${count} bestellingen</label></p>
      <p><button type="submit">Bestellingen wissen</button></p>
    </form>`}`;
}

async function wipeOrders({ req }) {
  const form = await readForm(req);
  if (form.get('zeker') === 'ja') writeOrders([]);
  return redirect('/trainer/');
}

async function createTraining({ req }) {
  const form = await readForm(req);
  const name = (form.get('naam') ?? '').trim().slice(0, 100);
  let labels = (form.get('deelnemers') ?? '').split('\n').map((l) => l.trim().slice(0, 80)).filter(Boolean);
  if (labels.length === 0) {
    const n = Math.min(60, Math.max(0, Number(form.get('aantal') || 0)));
    labels = Array.from({ length: n }, (_, i) => `Deelnemer ${i + 1}`);
  }
  if (!name || labels.length === 0 || labels.length > 60) return { status: 400, body: trainerPage('Fout', html`<h1>Vul een naam en 1 tot 60 deelnemers in.</h1><p><a href="/trainer/">Terug</a></p>`) };
  const { trainingId, participants } = store.createTraining(name, labels);
  return { body: codesPage(trainingId, name, participants) };
}

function codesPage(trainingId, name, participants) {
  return trainerPage('Codes', html`
    <h1>Codes voor ${name}</h1>
    <div class="melding"><strong>Je ziet deze codes maar één keer.</strong> Print deze pagina of kopieer de tabel. Elke deelnemer logt in op een oefenpagina met zijn of haar eigen code.</div>
    <div class="tabel-vak"><table>
      <thead><tr><th>Deelnemer</th><th>Code</th></tr></thead>
      <tbody>${participants.map((p) => html`<tr><td>${p.label}</td><td class="mono">${p.code}</td></tr>`)}</tbody>
    </table></div>
    <p><a class="knop" href="/trainer/training/${trainingId}">Naar de training</a></p>`);
}

function trainingDetail({ params, url }) {
  const t = store.training(Number(params.id));
  if (!t) return { status: 404, body: trainerPage('Niet gevonden', html`<h1>Training niet gevonden</h1>`) };
  const participants = store.participants(t.training_id);
  const filter = url.searchParams.get('deelnemer') ? Number(url.searchParams.get('deelnemer')) : null;
  const messages = store.messages(t.training_id, filter);
  const submissions = store.submissions(t.training_id, filter);
  const who = filter ? participants.find((p) => p.participant_id === filter)?.label ?? '' : '';
  const allLink = html`<a href="/trainer/training/${t.training_id}">alle deelnemers</a>`;
  return { body: trainerPage(t.name, html`
    <p><a href="/trainer/">Alle trainingen</a></p>
    <h1>${t.name}</h1>
    <form method="post" action="/trainer/training/${t.training_id}/actief" class="zoek">
      <input type="hidden" name="actief" value="${t.active ? '0' : '1'}">
      <span>${t.active ? html`<span class="status status--ok">Codes werken</span>` : html`<span class="status status--uit">Codes uitgezet</span>`}</span>
      <button type="submit" class="knop--licht">${t.active ? 'Codes uitzetten (training afgelopen)' : 'Codes weer aanzetten'}</button>
      <a class="knop knop--licht" href="/trainer/training/${t.training_id}/export.csv">Download als CSV</a>
    </form>

    <h2>Deelnemers</h2>
    <div class="tabel-vak"><table>
      <thead><tr><th>Deelnemer</th><th>Laatst ingelogd</th><th>AI-vragen</th><th>Ingeleverd</th><th></th></tr></thead>
      <tbody>${participants.map((p) => html`<tr>
        <td><a href="/trainer/training/${t.training_id}?deelnemer=${p.participant_id}">${p.label}</a></td>
        <td>${time(p.last_login_at)}</td><td>${p.messages}</td><td>${p.submissions}</td>
        <td><form method="post" action="/trainer/deelnemer/${p.participant_id}/nieuwe-code"><input type="hidden" name="training" value="${t.training_id}"><button class="knop--licht">Nieuwe code</button></form></td></tr>`)}</tbody>
    </table></div>

    <h2>Ingeleverd${filter ? html` door ${who} · ${allLink}` : ''}</h2>
    <p class="uitleg">Wat deelnemers zelf hebben ingeleverd uit hun eigen AI (bijvoorbeeld Copilot op het werk).</p>
    ${submissions.length === 0 ? html`<p class="leeg">Nog niets ingeleverd.</p>` : submissions.map((m) => html`
      <section class="paneel">
        <p class="uitleg"><strong>${m.label}</strong> · ${time(m.submitted_at)} · ${m.exercise || '-'}${m.prompt_block ? ` · ${m.prompt_block}` : ''} · ${m.tool || '-'}</p>
        <div class="kolommen">
          <div><h3>Prompt</h3><pre class="schema">${m.prompt}</pre></div>
          <div><h3>Antwoord van de AI</h3><pre class="schema">${m.answer}</pre></div>
        </div>
        ${m.note ? html`<p><strong>Toelichting:</strong> ${m.note}</p>` : ''}
      </section>`)}

    <h2>Gesprekken via de Vezelvriend-AI${filter ? html` van ${who} · ${allLink}` : ''}</h2>
    ${messages.length === 0 ? html`<p class="leeg">Nog geen vragen verstuurd.</p>` : messages.map((m) => html`
      <section class="paneel">
        <p class="uitleg"><strong>${m.label}</strong> · ${time(m.sent_at)} · ${m.exercise || '-'}${m.prompt_block ? ` · ${m.prompt_block}` : ''}
          · ${m.status === 'ok' ? 'beantwoord' : m.status === 'refusal' ? 'geweigerd' : 'fout'}${m.input_tokens !== null ? ` · ${m.input_tokens} + ${m.output_tokens} tokens` : ''}</p>
        <div class="kolommen">
          <div><h3>Prompt</h3><pre class="schema">${m.prompt}</pre></div>
          <div><h3>Antwoord</h3><pre class="schema">${m.answer ?? m.error ?? ''}</pre></div>
        </div>
      </section>`)}

    <h2>Verwijderen</h2>
    <form method="post" action="/trainer/training/${t.training_id}/verwijderen" class="paneel">
      <p>Verwijdert deze training met alle deelnemers, codes, gesprekken en inleveringen. Dit kan niet ongedaan worden gemaakt.</p>
      <p><label><input type="checkbox" name="zeker" value="ja" required> Ik weet het zeker</label></p>
      <p><button type="submit">Training definitief verwijderen</button></p>
    </form>`) };
}

async function setActive({ req, params }) {
  const form = await readForm(req);
  store.setActive(Number(params.id), form.get('actief') === '1');
  return redirect(`/trainer/training/${Number(params.id)}`);
}

async function newCode({ req, params }) {
  const form = await readForm(req);
  const p = store.db.prepare('SELECT label, training_id FROM participants WHERE participant_id = ?').get(Number(params.id));
  if (!p || p.training_id !== Number(form.get('training'))) return redirect('/trainer/');
  const code = store.resetCode(Number(params.id));
  return { body: codesPage(p.training_id, `${p.label} (nieuwe code)`, [{ label: p.label, code }]) };
}

async function deleteTraining({ req, params }) {
  const form = await readForm(req);
  if (form.get('zeker') === 'ja') store.deleteTraining(Number(params.id));
  return redirect('/trainer/');
}

function exportCsv({ params }) {
  const t = store.training(Number(params.id));
  if (!t) return { status: 404, body: 'Niet gevonden' };
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  // One sheet for both; 'soort' tells a hand-in (own AI) from a Vezelvriend-AI conversation.
  const rows = [['soort', 'deelnemer', 'tijdstip', 'oefening', 'prompt_blok', 'ai', 'status', 'prompt', 'antwoord', 'toelichting', 'tokens_in', 'tokens_uit']]
    .concat(store.submissions(t.training_id).map((m) => ['ingeleverd', m.label, time(m.submitted_at), m.exercise, m.prompt_block, m.tool, '', m.prompt, m.answer, m.note, '', '']))
    .concat(store.messages(t.training_id).map((m) => ['vezelvriend-ai', m.label, time(m.sent_at), m.exercise, m.prompt_block, m.model, m.status, m.prompt, m.answer ?? m.error, '', m.input_tokens, m.output_tokens]));
  const safeName = t.name.replace(/[^\w-]+/g, '_').slice(0, 50);
  return {
    type: 'text/csv; charset=utf-8',
    headers: { 'Content-Disposition': `attachment; filename="gesprekken-${safeName}.csv"` },
    body: '﻿' + rows.map((r) => r.map(cell).join(';')).join('\r\n'), // BOM + ';' so Excel (NL) opens it correctly
  };
}

serve({
  port: PORT,
  base: '',
  routes: routesOf({
    'GET /api/ai/status': status,
    'POST /api/ai/login': login,
    'POST /api/ai/logout': logout,
    'GET /api/ai/check': check,
    'POST /api/ai/ask': ask,
    'POST /api/ai/inleveren': handIn,
    'GET /trainer/': trainerOnly(trainingList),
    'POST /trainer/login': trainerLogin,
    'POST /trainer/uitloggen': trainerLogout,
    'POST /trainer/training': trainerOnly(createTraining),
    'POST /trainer/bestellingen/wissen': trainerOnly(wipeOrders),
    'GET /trainer/training/:id': trainerOnly(trainingDetail),
    'POST /trainer/training/:id/actief': trainerOnly(setActive),
    'POST /trainer/training/:id/verwijderen': trainerOnly(deleteTraining),
    'GET /trainer/training/:id/export.csv': trainerOnly(exportCsv),
    'POST /trainer/deelnemer/:id/nieuwe-code': trainerOnly(newCode),
  }),
  notFound: () => trainerPage('Niet gevonden', html`<h1>Niet gevonden</h1>`),
});

