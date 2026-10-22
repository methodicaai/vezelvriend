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
import fs from 'node:fs';
import { aiEnabled } from './claude.js';
import { ASSISTANTS, chatModel, decideRequest, runTurn } from './agent.js';
import { openStore } from './store.js';
import { KEEP_DAYS, readOrders, writeOrders } from '../shared/orders.js';
import { cookie, registerFailure, sign, tooManyFailures, unsign } from '../shared/session.js';
import { cookies, html, readForm, readJson, routesOf, serve } from '../shared/web.js';

const PORT = Number(process.env.PORT ?? 3003);
const store = openStore(process.env.AI_DB_FILE ?? '/data/ai.db');
const MAX_PER_DAY = Number(process.env.AI_MAX_PER_DAY || 40);
const MAX_PROMPT_CHARS = Number(process.env.AI_MAX_PROMPT_CHARS || 30_000);
const TRAINER_PASSWORD = process.env.TRAINER_PASSWORD || '';
// The trainer's own code that always works. Never in this public repo: only in
// .env on the server. Too short a code is ignored, because anyone could guess it.
const TRAINER_CODE = (process.env.TRAINER_CODE || '').trim();
if (TRAINER_CODE.length >= 10) store.ensureFixedCode(TRAINER_CODE);
else if (TRAINER_CODE) console.warn('TRAINER_CODE is shorter than 10 characters and is ignored.');

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
    enabled: aiEnabled(),   // the chat with Claude (needs an API key)
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

// ---------------------------------------------------------------- the Vezelvriend chat (Claude with the AI connection)

const CONTEXT = /^[a-z0-9-]{1,40}$/;
const contextOf = (v) => (typeof v === 'string' && CONTEXT.test(v) ? v : 'chat');
const assistantOf = (v) => (v === 'koppeling' ? 'koppeling' : 'zonder');
const titleOf = (question) => (question.length > 60 ? `${question.slice(0, 57).trim()}...` : question);

function chatInfo({ req }) {
  const p = participantFrom(req);
  return json(200, { enabled: aiEnabled(), loggedIn: Boolean(p), participant: p ? { label: p.label, training: p.training_name } : null,
    model: chatModel(), assistants: ASSISTANTS, maxPerDay: MAX_PER_DAY, usedToday: p ? store.countToday(p.participant_id) : 0 });
}

function listChats({ req, url }) {
  const p = participantFrom(req);
  if (!p) return json(401, { error: 'Log eerst in met je deelnemerscode.' });
  return json(200, store.chats(p.participant_id, url.searchParams.get('context') ? contextOf(url.searchParams.get('context')) : null));
}

async function newChat({ req }) {
  const p = participantFrom(req);
  if (!p) return json(401, { error: 'Log eerst in met je deelnemerscode.' });
  const body = await readJson(req, 1_000).catch(() => ({}));
  return json(200, { id: store.createChat(p.participant_id, contextOf(body.context), assistantOf(body.assistent)) });
}

function getChat({ req, params }) {
  const p = participantFrom(req);
  if (!p) return json(401, { error: 'Log eerst in met je deelnemerscode.' });
  const c = store.chat(p.participant_id, Number(params.id));
  if (!c) return json(404, { error: 'Gesprek niet gevonden.' });
  return json(200, { id: c.chat_id, title: c.title, context: c.context, assistant: c.assistant, items: c.items });
}

async function chatMessage({ req, params }) {
  if (!aiEnabled()) return json(503, { error: 'De AI staat uit.' });
  const p = participantFrom(req);
  if (!p) return json(401, { error: 'Log eerst in met je deelnemerscode.' });
  const c = store.chat(p.participant_id, Number(params.id));
  if (!c) return json(404, { error: 'Gesprek niet gevonden.' });
  const body = await readJson(req, MAX_PROMPT_CHARS * 2);
  const question = typeof body.tekst === 'string' ? body.tekst.trim() : '';
  if (!question) return json(400, { error: 'Typ eerst een vraag.' });
  if (question.length > MAX_PROMPT_CHARS) return json(400, { error: `De vraag is te lang (meer dan ${MAX_PROMPT_CHARS} tekens).` });
  if (store.countToday(p.participant_id) >= MAX_PER_DAY) return json(429, { error: `Je hebt vandaag al ${MAX_PER_DAY} vragen gesteld. Dat is het maximum per dag.` });
  // A decision on a technician request since the last question is passed on to Claude.
  const forClaude = c.note ? `[Melding van het systeem: ${c.note}]

${question}` : question;
  const source = { kind: 'chat', training: trainingIdOf(p.participant_id), participant: p.participant_id, label: p.label, chat: c.chat_id };
  const result = await runTurn({ apiMessages: c.api_messages, question: forClaude, assistant: c.assistant, source });
  store.saveMessage({ participantId: p.participant_id, exercise: c.context, promptBlock: c.assistant === 'koppeling' ? 'Chat met koppeling' : 'Chat zonder koppeling', prompt: question,
    answer: result.answer, status: result.status, error: result.error, model: result.model, inputTokens: result.inputTokens, outputTokens: result.outputTokens, durationMs: result.durationMs });
  if (result.status === 'error') return json(502, { error: result.participantMessage });

  const newItems = [{ type: 'vraag', text: question }, ...result.newItems];
  const title = c.items.length === 0 ? titleOf(question) : c.title;
  store.saveChat(c.chat_id, { title, apiMessages: result.apiMessages, items: [...c.items, ...newItems], note: null });
  return json(200, { title, items: newItems });
}

async function chatDecision({ req, params }) {
  const p = participantFrom(req);
  if (!p) return json(401, { error: 'Log eerst in met je deelnemerscode.' });
  const c = store.chat(p.participant_id, Number(params.id));
  if (!c) return json(404, { error: 'Gesprek niet gevonden.' });
  const body = await readJson(req, 1_000);
  const card = c.items.find((i) => i.type === 'goedkeuring' && i.verzoek === body.verzoek);
  if (!card) return json(404, { error: 'Verzoek niet gevonden in dit gesprek.' });
  const besluit = body.besluit === 'goedkeuren' ? 'goedkeuren' : 'afwijzen';
  try {
    await decideRequest(card.verzoek, besluit, `${p.label} (in de chat)`);
  } catch {
    return json(409, { error: 'Dit verzoek is al beoordeeld, of de koppeling is niet bereikbaar.' });
  }
  card.status = besluit === 'goedkeuren' ? 'gepland' : 'afgewezen';
  const note = `verzoek ${card.verzoek} is ${besluit === 'goedkeuren' ? 'goedgekeurd: de monteur is ingepland' : 'afgewezen door de medewerker'}.`;
  store.saveChat(c.chat_id, { title: c.title, apiMessages: c.api_messages, items: c.items, note: [c.note, note].filter(Boolean).join(' ') });
  return json(200, { status: card.status });
}

function deleteChat({ req, params }) {
  const p = participantFrom(req);
  if (!p) return json(401, { error: 'Log eerst in met je deelnemerscode.' });
  store.deleteChat(p.participant_id, Number(params.id));
  return json(200, { ok: true });
}

const trainingIdOf = (participantId) => store.db.prepare('SELECT training_id FROM participants WHERE participant_id = ?').get(participantId)?.training_id ?? null;

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

async function trainingList() {
  const trainings = store.trainings();
  const requests = await requestsPanel();
  return { body: trainerPage('Trainingen', html`
    <h1>Trainingen</h1>
    <p class="uitleg">AI: ${aiEnabled() ? html`aan, model <span class="mono">${chatModel()}</span>` : 'uit (geen API-sleutel ingesteld)'} · maximaal ${MAX_PER_DAY} vragen per deelnemer per dag.</p>
    <div class="tabel-vak"><table>
      <thead><tr><th>Training</th><th>Aangemaakt</th><th>Deelnemers</th><th>AI-vragen</th><th>Ingeleverd</th><th>Codes</th></tr></thead>
      <tbody>${trainings.length === 0 ? html`<tr><td colspan="6" class="leeg">Nog geen trainingen.</td></tr>` : trainings.map((t) => html`<tr>
        <td><a href="/trainer/training/${t.training_id}">${t.name}</a></td>
        <td>${time(t.created_at)}</td><td>${t.participants}</td><td>${t.messages}</td><td>${t.submissions}</td>
        <td>${t.active ? html`<span class="status status--ok">werken</span>` : html`<span class="status status--uit">uitgezet</span>`}</td></tr>`)}</tbody>
    </table></div>
    ${ordersPanel()}
    ${requests}
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

// Technician requests that Claude made through the connection (step 6). All
// participants share one world, so the trainer clears them between two groups.
async function requestsPanel() {
  const list = await fetch(`${KOPPELING_URL}/internal/verzoeken`, { signal: AbortSignal.timeout(3000) }).then((r) => r.json()).catch(() => null);
  if (!Array.isArray(list)) return html`<h2>Monteursverzoeken van de AI</h2><p class="uitleg">De koppeling is niet bereikbaar.</p>`;
  const open = list.filter((r) => r.status === 'wacht op goedkeuring').length;
  return html`<h2>Monteursverzoeken van de AI</h2>
    <p class="uitleg">${list.length === 0 ? 'Er zijn geen monteursverzoeken.' : `${list.length} verzoek${list.length === 1 ? '' : 'en'}, waarvan ${open} nog wacht${open === 1 ? '' : 'en'} op goedkeuring.`} Alle deelnemers zien dezelfde verzoeken in het Klantbeeld. Wis ze vóór een nieuwe groep, zodat stap 6 schoon begint.</p>
    ${list.length === 0 ? '' : html`<form method="post" action="/trainer/verzoeken/wissen" class="paneel">
      <p><label><input type="checkbox" name="zeker" value="ja" required> Ja, wis alle ${list.length} monteursverzoeken</label></p>
      <p><button type="submit">Monteursverzoeken wissen</button></p>
    </form>`}`;
}

async function wipeTechnicianRequests({ req }) {
  const form = await readForm(req);
  if (form.get('zeker') === 'ja') {
    await fetch(`${KOPPELING_URL}/internal/wissen`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alleen: 'verzoeken' }), signal: AbortSignal.timeout(3000) }).catch(() => {});
  }
  return redirect('/trainer/');
}

// The answers of "vind de fout" are trainer material: they are not in the public
// repo or the site. On the server they sit in a private file (ANSWERS_FILE, mounted
// read-only) and reach participants only after the trainer releases them.
const ANSWERS_FILE = process.env.ANSWERS_FILE ?? '/private/vind-de-fout.json';
function readAnswers() {
  try { const list = JSON.parse(fs.readFileSync(ANSWERS_FILE, 'utf8')); return Array.isArray(list) ? list : null; } catch { return null; }
}

function findTheErrorAnswers({ req }) {
  const p = participantFrom(req);
  if (!p && !isTrainer(req)) return json(401, { error: 'Log eerst in met je deelnemerscode.' });
  if (p && !p.answers_released) return json(200, { released: false });
  const answers = readAnswers();
  if (!answers) return json(200, { released: false });
  return json(200, { released: true, answers });
}

async function setAnswersReleased({ req, params }) {
  const form = await readForm(req);
  store.setAnswersReleased(Number(params.id), form.get('vrijgeven') === '1');
  return redirect(`/trainer/training/${Number(params.id)}`);
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

async function trainingDetail({ params, url }) {
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
    <form method="post" action="/trainer/training/${t.training_id}/antwoorden" class="zoek">
      <input type="hidden" name="vrijgeven" value="${t.answers_released ? '0' : '1'}">
      <span>Antwoorden van vind de fout: ${t.answers_released ? html`<span class="status status--ok">vrijgegeven</span>` : html`<span class="status status--uit">verborgen</span>`}${readAnswers() ? '' : ' (het antwoordbestand staat niet op deze server)'}</span>
      <button type="submit" class="knop--licht">${t.answers_released ? 'Antwoorden weer verbergen' : 'Antwoorden vrijgeven'}</button>
    </form>
    <p class="uitleg">Vrijgegeven: deelnemers van deze training zien bij vind de fout de uitleg, nadat ze zelf hebben gekozen. Handig voor wie de proef alleen doet.</p>

    <h2>Deelnemers</h2>
    <div class="tabel-vak"><table>
      <thead><tr><th>Deelnemer</th><th>Laatst ingelogd</th><th>AI-vragen</th><th>Ingeleverd</th><th></th></tr></thead>
      <tbody>${participants.map((p) => html`<tr>
        <td><a href="/trainer/training/${t.training_id}?deelnemer=${p.participant_id}">${p.label}</a></td>
        <td>${time(p.last_login_at)}</td><td>${p.messages}</td><td>${p.submissions}</td>
        <td><form method="post" action="/trainer/deelnemer/${p.participant_id}/nieuwe-code"><input type="hidden" name="training" value="${t.training_id}"><button class="knop--licht">Nieuwe code</button></form></td></tr>`)}</tbody>
    </table></div>

    ${connectionPanel(t)}

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

    ${chatsPanel(t, filter, who, allLink)}
    ${await connectionCallsPanel(t)}

    <h2>Verwijderen</h2>
    <form method="post" action="/trainer/training/${t.training_id}/verwijderen" class="paneel">
      <p>Verwijdert deze training met alle deelnemers, codes, gesprekken, inleveringen, de koppelingssleutel, de opvragingen via de koppeling en de monteursverzoeken. Dit kan niet ongedaan worden gemaakt.</p>
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

// ---------------------------------------------------------------- AI connection (systems/koppeling)

const KOPPELING_URL = process.env.KOPPELING_URL ?? 'http://localhost:3006';
const TOOL_LABELS = { zoek_klanten: 'klanten gezocht', klantbeeld: 'klantbeeld', modem_controleren: 'modem gecontroleerd', historie_op_adres: 'historie op adres',
  storingen: 'storingen', beslisboom: 'beslisboom', documenten: 'lijst met documenten', document_lezen: 'document gelezen', sql: 'SQL-vraag', monteur_inplannen: 'monteur aangevraagd' };
const lookup = (tool, args) => `${TOOL_LABELS[tool] ?? tool}${Object.values(args ?? {}).filter((v) => typeof v === 'string').length ? ` (${Object.values(args).filter((v) => typeof v === 'string').join(', ').slice(0, 160)})` : ''}`;

/** The chat conversations of a training, with what Claude looked up and what was decided. */
function chatsPanel(t, filter, who, allLink) {
  const chats = store.chatsOfTraining(t.training_id, filter);
  return html`<h2>Chatgesprekken${filter ? html` van ${who} · ${allLink}` : ''}</h2>
    <p class="uitleg">Gesprekken in "Claude voor Vezelvriend" en in de chat naast de oefeningen. Bij "met koppeling" zie je wat Claude zelf opvroeg.</p>
    ${chats.length === 0 ? html`<p class="leeg">Nog geen chatgesprekken.</p>` : chats.map((c) => html`
      <details class="paneel">
        <summary><strong>${c.label}</strong> · ${c.assistant === 'koppeling' ? 'met koppeling' : 'zonder koppeling'} · ${c.context} · ${time(c.updated_at)} · ${c.title}</summary>
        ${c.items.map((i) => i.type === 'vraag' ? html`<p><strong>Deelnemer:</strong> ${i.text}</p>`
          : i.type === 'tekst' ? html`<pre class="schema">${i.text}</pre>`
          : i.type === 'opvraging' ? html`<p class="uitleg">Claude vroeg op: ${lookup(i.tool, i.args)}${i.ok ? '' : ' (mislukt)'}</p>`
          : i.type === 'goedkeuring' ? html`<p><strong>Monteursverzoek ${i.verzoek}</strong> (${i.klantnummer}): ${i.status}</p>`
          : html`<p class="uitleg">${i.text ?? ''}</p>`)}
      </details>`)}`;
}

/** What AI apps of participants (over MCP) looked up with this training's key. */
async function connectionCallsPanel(t) {
  let calls = [];
  try {
    const res = await fetch(`${KOPPELING_URL}/internal/opvragingen?training=${t.training_id}`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) calls = (await res.json()).filter((c) => c.source?.kind === 'mcp');
  } catch { /* connection not running */ }
  if (calls.length === 0) return '';
  return html`<h2>Opvragingen via een eigen AI-app</h2>
    <p class="uitleg">Wat AI-apps van deelnemers (via de koppelingssleutel) hebben opgevraagd. De koppeling bewaart niet wie het was, alleen de training.</p>
    <div class="tabel-vak"><table>
      <thead><tr><th>Tijd</th><th>Opvraging</th><th>Gelukt</th></tr></thead>
      <tbody>${calls.slice(-300).reverse().map((c) => html`<tr><td>${time(c.at)}</td><td>${lookup(c.tool, c.arguments)}</td><td>${c.ok ? 'ja' : 'nee'}</td></tr>`)}</tbody>
    </table></div>`;
}

// The public address of this site, for the connection URLs the trainer hands out.
const siteUrl = (req) => process.env.PUBLIC_URL || `${process.env.COOKIE_SECURE === '0' ? 'http' : 'https'}://${req.headers.host}`;

function connectionPanel(t) {
  const key = store.connectionKeyOf(t.training_id);
  return html`<h2>Koppeling voor een eigen AI</h2>
    <p class="uitleg">Met een koppelingssleutel kunnen deelnemers Vezelvriend koppelen aan hun eigen AI-app (Claude Desktop, claude.ai, Claude Code of Copilot Studio). De AI krijgt dan volledige toegang: klanten met alle persoonsgegevens, modems, documenten en de database. Een monteur kan hij alleen aanvragen; iemand moet dat goedkeuren in het Klantbeeld. De sleutel werkt alleen zolang de codes van deze training aan staan.</p>
    <form method="post" action="/trainer/training/${t.training_id}/koppeling" class="zoek">
      <span>${key ? html`<span class="status status--ok">Sleutel gemaakt op ${time(key.created_at)}</span>` : html`<span class="status status--uit">Nog geen sleutel</span>`}</span>
      <button type="submit" class="knop--licht">${key ? 'Nieuwe sleutel maken (de oude stopt)' : 'Sleutel maken'}</button>
    </form>`;
}

function newConnectionKey({ req, params }) {
  const t = store.training(Number(params.id));
  if (!t) return { status: 404, body: trainerPage('Niet gevonden', html`<h1>Training niet gevonden</h1>`) };
  const key = store.newConnectionKey(t.training_id);
  const base = `${siteUrl(req)}/mcp/${key}`;
  return { body: trainerPage('Koppelingssleutel', html`
    <h1>Koppeling voor ${t.name}</h1>
    <div class="melding"><strong>Je ziet deze adressen maar één keer.</strong> Kopieer ze nu. Ben je ze kwijt, maak dan een nieuwe sleutel.</div>
    <p><strong>Adres voor de AI-app:</strong></p>
    <p class="mono">${base}</p>
    <h2>Zo koppel je het</h2>
    <ul>
      <li><strong>claude.ai:</strong> Instellingen, Connectors, "Aangepaste connector toevoegen". Plak het adres. (Hangt af van het abonnement.)</li>
      <li><strong>Claude Code:</strong> <span class="mono">claude mcp add --transport http vezelvriend ${base}</span></li>
      <li><strong>Claude Desktop:</strong> Instellingen, Connectors, "Aangepaste connector toevoegen", en plak het adres.</li>
      <li><strong>Copilot Studio:</strong> een agent, Hulpprogramma's, "Model Context Protocol" toevoegen, en plak het adres.</li>
    </ul>
    <p class="uitleg">Alle klanten zijn verzonnen, maar staan op echte adressen. Geef het adres alleen aan deelnemers van deze training, en zet de codes uit als de training voorbij is.</p>
    <p><a class="knop" href="/trainer/training/${t.training_id}">Naar de training</a></p>`) };
}

/** For the connection service only (not forwarded by the gateway): which active training owns this key? */
function connectionKeyCheck({ url }) {
  const t = store.trainingForConnectionKey(url.searchParams.get('sleutel') ?? '');
  return t ? json(200, { training: t.training_id, label: t.name }) : json(404, { error: 'onbekend' });
}

async function deleteTraining({ req, params }) {
  const form = await readForm(req);
  if (form.get('zeker') === 'ja') {
    store.deleteTraining(Number(params.id));
    // The connection keeps its own log and technician requests: remove this training's part too.
    await fetch(`${KOPPELING_URL}/internal/wissen`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ training: Number(params.id) }), signal: AbortSignal.timeout(3000) }).catch(() => {});
  }
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
    'POST /api/ai/inleveren': handIn,
    'GET /api/ai/chat': chatInfo,
    'GET /api/ai/chats': listChats,
    'POST /api/ai/chats': newChat,
    'GET /api/ai/chats/:id': getChat,
    'POST /api/ai/chats/:id/bericht': chatMessage,
    'POST /api/ai/chats/:id/besluit': chatDecision,
    'POST /api/ai/chats/:id/verwijderen': deleteChat,
    'GET /trainer/': trainerOnly(trainingList),
    'POST /trainer/login': trainerLogin,
    'POST /trainer/uitloggen': trainerLogout,
    'POST /trainer/training': trainerOnly(createTraining),
    'POST /trainer/bestellingen/wissen': trainerOnly(wipeOrders),
    'POST /trainer/verzoeken/wissen': trainerOnly(wipeTechnicianRequests),
    'POST /trainer/training/:id/antwoorden': trainerOnly(setAnswersReleased),
    'GET /api/ai/vindfout': findTheErrorAnswers,
    'GET /trainer/training/:id': trainerOnly(trainingDetail),
    'POST /trainer/training/:id/actief': trainerOnly(setActive),
    'POST /trainer/training/:id/verwijderen': trainerOnly(deleteTraining),
    'POST /trainer/training/:id/koppeling': trainerOnly(newConnectionKey),
    'GET /internal/koppeling-sleutel': connectionKeyCheck,
    'GET /trainer/training/:id/export.csv': trainerOnly(exportCsv),
    'POST /trainer/deelnemer/:id/nieuwe-code': trainerOnly(newCode),
  }),
  notFound: () => trainerPage('Niet gevonden', html`<h1>Niet gevonden</h1>`),
});

