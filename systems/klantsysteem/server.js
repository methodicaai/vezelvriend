// Klantsysteem: the customer list of Vezelvriend B.V. (fictional).
// Search customers with their contract and address, and ask the database
// questions in SQL. Read-only: nothing here changes data.
import fs from 'node:fs';
import path from 'node:path';
import { openDatabase } from '../shared/db.js';
import { formatAddress, searchCustomers } from '../shared/queries.js';
import { ROOT, formatEuro, formatStamp } from '../shared/world.js';
import { html, page, paginate, raw, readForm, routesOf, serve } from '../shared/web.js';
import { MAX_ROWS, runQuery } from './sql-runner.js';

const PORT = Number(process.env.PORT ?? 3001);
const BASE = process.env.BASE_PATH ?? '';
const KLANTBEELD_URL = process.env.KLANTBEELD_URL ?? 'http://localhost:3002';
const SYSTEM = 'Klantsysteem';

const { db, file } = openDatabase('klantsysteem');
const SCHEMA = fs.readFileSync(path.join(ROOT, 'data', 'schema.sql'), 'utf8');

const links = [
  { href: `${BASE}/`, label: 'Klanten' },
  { href: `${BASE}/sql`, label: 'SQL' },
  { href: `${KLANTBEELD_URL}/`, label: 'Klantbeeld' },
];

function statusLabel(status) {
  return status === 'actief' ? html`<span class="status status--ok">actief</span>` : html`<span class="status status--uit">${status}</span>`;
}

function customerList({ url }) {
  const q = url.searchParams.get('q') ?? '';
  const rows = searchCustomers(db, q);
  const { slice, from, nav } = paginate(rows, url);
  const body = html`
    <h1>Klanten</h1>
    <form class="zoek" method="get" action="${BASE}/" role="search">
      <label class="visually-hidden" for="q">Zoek een klant</label>
      <input type="search" id="q" name="q" value="${q}" placeholder="Naam, adres, postcode, klantnummer, e-mail of telefoon">
      <button type="submit">Zoeken</button>
      ${q ? html`<a class="knop knop--licht" href="${BASE}/">Wis zoekopdracht</a>` : ''}
    </form>
    <p class="uitleg">${rows.length} ${rows.length === 1 ? 'klant' : 'klanten'} gevonden${q ? html` voor "${q}"` : ''}${rows.length > slice.length ? ` (${from + 1} tot ${from + slice.length} getoond)` : ''}.</p>
    ${nav}
    <div class="tabel-vak">
      <table>
        <thead><tr><th>Klantnr.</th><th>Naam</th><th>Type</th><th>Adres</th><th>Contract</th><th>Klant sinds</th><th>Status</th><th>Open bedrag</th><th></th></tr></thead>
        <tbody>
          ${slice.map((r) => html`<tr>
            <td class="mono">${r.customer_id}</td>
            <td>${r.name}</td>
            <td>${r.customer_type}</td>
            <td>${formatAddress(r)}</td>
            <td>${r.product ?? ''}${r.contract_id ? html`<br><span class="mono">${r.contract_id}</span>` : ''}</td>
            <td>${formatStamp(r.customer_since)}</td>
            <td>${statusLabel(r.status)}</td>
            <td>${formatEuro(r.open_balance_eur)}</td>
            <td><a href="${KLANTBEELD_URL}/klant/${r.customer_id}">Klantbeeld</a></td>
          </tr>`)}
        </tbody>
      </table>
    </div>
    ${nav}`;
  return { body: page({ base: BASE, system: SYSTEM, title: 'Klanten', body, links }) };
}

const EXAMPLES = [
  ['Alle actieve klanten', "SELECT customer_id, name, customer_type FROM customers WHERE status = 'actief' ORDER BY name;"],
  ['Klanten met hun adres', 'SELECT c.customer_id, c.name, a.street, a.house_number, a.postcode\nFROM customers c\nJOIN addresses a ON a.address_id = c.address_id;'],
  ['Laatste modemmeting per modem', 'SELECT modem_id, MAX(measured_at) AS laatste_meting\nFROM modem_measurements\nGROUP BY modem_id;'],
];

async function sqlScreen({ req }) {
  let query = EXAMPLES[0][1];
  let result = null;
  if (req.method === 'POST') {
    query = (await readForm(req)).get('query') ?? '';
    result = await runQuery(file, query);
  }
  const body = html`
    <h1>SQL</h1>
    <p class="uitleg">Stel zelf vragen aan de database van het Klantsysteem. Je kunt alleen lezen (SELECT), niet wijzigen. Na een herstart staat alle data weer in de beginstand. Je ziet maximaal ${MAX_ROWS} rijen.</p>
    <div class="kolommen">
      <div>
        <form method="post" action="${BASE}/sql" class="paneel">
          <label for="query"><strong>Je SQL-vraag</strong></label>
          <textarea id="query" name="query" rows="8" spellcheck="false">${query}</textarea>
          <p><button type="submit">Uitvoeren</button></p>
        </form>
        <div class="paneel">
          <h2>Voorbeelden</h2>
          ${EXAMPLES.map(([label, sql]) => html`<p><strong>${label}</strong></p><pre class="schema">${sql}</pre>`)}
        </div>
      </div>
      <div class="paneel">
        <h2>Het schema (tabellen en kolommen)</h2>
        <p class="uitleg">Tip: wil je een AI een SQL-vraag laten schrijven, geef dan dit schema mee als context.</p>
        <pre class="schema">${SCHEMA}</pre>
      </div>
    </div>
    ${result ? resultBlock(result) : ''}`;
  return { body: page({ base: BASE, system: SYSTEM, title: 'SQL', body, links }) };
}

function resultBlock(result) {
  if (result.error) return html`<div class="melding fout" role="alert"><strong>Dat ging niet goed:</strong> ${result.error}</div>`;
  return html`
    <h2>Resultaat: ${result.rows.length} ${result.rows.length === 1 ? 'rij' : 'rijen'}${result.truncated ? ` (afgekapt op ${MAX_ROWS})` : ''}</h2>
    ${result.rows.length === 0 ? html`<p class="leeg">Geen rijen gevonden.</p>` : html`
    <div class="tabel-vak"><table>
      <thead><tr>${result.columns.map((c) => html`<th>${c}</th>`)}</tr></thead>
      <tbody>${result.rows.map((row) => html`<tr>${row.map((v) => html`<td>${v === null ? raw('<span class="leeg">NULL</span>') : v}</td>`)}</tr>`)}</tbody>
    </table></div>`}`;
}

// JSON endpoint: same search as the screen. Useful later for connecting tools (see docs/roadmap.md).
function apiCustomers({ url }) {
  return { type: 'application/json; charset=utf-8', body: JSON.stringify(searchCustomers(db, url.searchParams.get('q'))) };
}

serve({
  port: PORT,
  base: BASE,
  routes: routesOf({ 'GET /': customerList, 'GET /sql': sqlScreen, 'POST /sql': sqlScreen, 'GET /api/customers': apiCustomers }),
  notFound: () => page({ base: BASE, system: SYSTEM, title: 'Niet gevonden', body: html`<h1>Deze pagina bestaat niet</h1><p><a href="${BASE}/">Terug naar de klantenlijst</a></p>`, links }),
});
