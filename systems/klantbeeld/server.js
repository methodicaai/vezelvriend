// Klantbeeld: the screen a service employee keeps open during a phone call.
// It brings together everything about one customer in four tabs.
//
// Deliberate design choice: "Modem controleren" shows data to the employee
// only. No AI calls it. The employee decides what to copy into a prompt,
// which is exactly the skill the training is about.
import fs from 'node:fs';
import path from 'node:path';
import { openDatabase } from '../shared/db.js';
import { formatAddress, getAddressHistory, getCustomer, getModemCheck, getNetworkMapEntry, searchCustomers } from '../shared/queries.js';
import { ROOT, formatEuro, formatStamp, world } from '../shared/world.js';
import { html, page, routesOf, serve } from '../shared/web.js';

const PORT = Number(process.env.PORT ?? 3002);
const BASE = process.env.BASE_PATH ?? '';
const KLANTSYSTEEM_URL = process.env.KLANTSYSTEEM_URL ?? 'http://localhost:3001';
const SYSTEM = 'Klantbeeld';

const { db } = openDatabase('klantbeeld');
const CALL_GUIDE = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'documents', 'call-guide.json'), 'utf8'));

const links = [
  { href: `${BASE}/`, label: 'Klant kiezen' },
  { href: `${KLANTSYSTEEM_URL}/`, label: 'Klantsysteem' },
];

const TABS = [
  ['leidraad', 'Gespreksleidraad'],
  ['gegevens', 'Klantgegevens'],
  ['historie', 'Klanthistorie op adres'],
  ['techniek', 'Techniek'],
];

const render = (title, body) => ({ body: page({ base: BASE, system: SYSTEM, title, body, links }) });

function chooseCustomer({ url }) {
  const q = url.searchParams.get('q') ?? '';
  const rows = searchCustomers(db, q);
  return render('Klant kiezen', html`
    <h1>Welke klant heb je aan de lijn?</h1>
    <form class="zoek" method="get" action="${BASE}/" role="search">
      <label class="visually-hidden" for="q">Zoek een klant</label>
      <input type="search" id="q" name="q" value="${q}" placeholder="Naam, adres, postcode of klantnummer">
      <button type="submit">Zoeken</button>
    </form>
    <div class="tabel-vak"><table>
      <thead><tr><th>Klantnr.</th><th>Naam</th><th>Adres</th><th>Status</th></tr></thead>
      <tbody>${rows.map((r) => html`<tr>
        <td class="mono"><a href="${BASE}/klant/${r.customer_id}">${r.customer_id}</a></td>
        <td><a href="${BASE}/klant/${r.customer_id}">${r.name}</a></td>
        <td>${formatAddress(r)}</td><td>${r.status}</td></tr>`)}</tbody>
    </table></div>`);
}

function customerView({ url, params }) {
  const customer = getCustomer(db, params.id);
  if (!customer) return { status: 404, ...render('Niet gevonden', html`<h1>Klant ${params.id} niet gevonden</h1><p><a href="${BASE}/">Kies een andere klant</a></p>`) };
  const tab = TABS.some(([key]) => key === url.searchParams.get('tab')) ? url.searchParams.get('tab') : 'leidraad';
  const tabUrl = (key) => `${BASE}/klant/${customer.customer_id}?tab=${key}`;

  const content = {
    leidraad: () => callGuideTab(),
    gegevens: () => detailsTab(customer),
    historie: () => historyTab(customer),
    techniek: () => technicalTab(customer, url.searchParams.get('actie')),
  }[tab]();

  return render(customer.name, html`
    <div class="kop-klant">
      <h1>${customer.name}</h1>
      <span class="sub mono">${customer.customer_id}</span>
      <span class="sub">${formatAddress(customer)}</span>
      <span class="sub">${customer.product ?? 'geen contract'}</span>
    </div>
    <nav class="tabs" aria-label="Tabbladen">
      ${TABS.map(([key, label]) => html`<a href="${tabUrl(key)}" aria-current="${key === tab ? 'page' : 'false'}">${label}</a>`)}
    </nav>
    ${content}`);
}

function callGuideTab() {
  return html`<section class="paneel">
    <h2>${CALL_GUIDE.title}</h2>
    <p class="uitleg">Versie ${CALL_GUIDE.version}</p>
    <ol class="leidraad">${CALL_GUIDE.steps.map((s) => html`<li><strong>${s.title}.</strong> ${s.text}</li>`)}</ol>
  </section>`;
}

function detailsTab(c) {
  return html`<section class="paneel">
    <h2>Klantgegevens</h2>
    <dl class="gegevens">
      <dt>Klantnummer</dt><dd class="mono">${c.customer_id}</dd>
      <dt>Naam</dt><dd>${c.name}</dd>
      <dt>Soort klant</dt><dd>${c.customer_type}</dd>
      <dt>Adres</dt><dd>${formatAddress(c)}</dd>
      <dt>Telefoon</dt><dd>${c.phone}</dd>
      <dt>E-mail</dt><dd>${c.email}</dd>
      <dt>Klant sinds</dt><dd>${formatStamp(c.customer_since)}</dd>
      <dt>Status</dt><dd>${c.status}${c.end_date ? ` (tot ${formatStamp(c.end_date)})` : ''}</dd>
      <dt>Contract</dt><dd>${c.product ?? '-'}${c.product ? `, ${c.download_mbps}/${c.upload_mbps} Mbit/s, ${formatEuro(c.monthly_fee_eur)} per maand` : ''}</dd>
      <dt>Contract sinds</dt><dd>${formatStamp(c.contract_start)}</dd>
      <dt>Openstaand bedrag</dt><dd>${formatEuro(c.open_balance_eur)}</dd>
    </dl>
  </section>`;
}

function historyTab(c) {
  const items = getAddressHistory(db, c.address_id);
  return html`<section class="paneel">
    <h2>Klanthistorie op adres ${c.street} ${c.house_number}${c.house_number_suffix ?? ''}</h2>
    <p class="uitleg">Alle contactmomenten en tickets op dit adres, nieuwste eerst.</p>
    ${items.length === 0 ? html`<p class="leeg">Geen historie op dit adres.</p>` : html`
    <div class="tabel-vak"><table>
      <thead><tr><th>Datum</th><th>Kanaal</th><th>Klant</th><th>Onderwerp</th><th>Samenvatting</th></tr></thead>
      <tbody>${items.map((i) => html`<tr>
        <td>${formatStamp(i.at)}</td>
        <td>${i.channel}${i.direction ? ` (${i.direction})` : ''}</td>
        <td>${i.customer_name}<br><span class="mono">${i.customer_id}</span></td>
        <td>${i.subject}</td><td>${i.summary}</td></tr>`)}</tbody>
    </table></div>`}
  </section>`;
}

function statusBadge(status) {
  const kind = { online: 'ok', offline: 'bad', wisselend: 'warn' }[status] ?? 'uit';
  return html`<span class="status status--${kind}">${status}</span>`;
}

const ACTION_MESSAGES = {
  meting: 'Nieuwe meting aangevraagd. In de oefenwereld staat de klok stil, dus er komt geen nieuwe meting binnen. Schrijf op wat je nu zou doen en wat je tegen de klant zegt.',
  herstart: 'Herstart op afstand aangevraagd. In de oefenwereld staat de klok stil, dus er komt geen nieuw resultaat. Schrijf op wat je nu zou doen en wat je tegen de klant zegt.',
};

function technicalTab(c, action) {
  const check = action ? getModemCheck(db, c.customer_id) : null;
  const modem = check?.modem ?? db.prepare('SELECT * FROM modems WHERE customer_id = ?').get(c.customer_id);
  const map = getNetworkMapEntry(db, c.address_id);
  const actionUrl = (a) => `${BASE}/klant/${c.customer_id}?tab=techniek&actie=${a}`;

  return html`
  <section class="paneel">
    <h2>Aansluiting</h2>
    ${modem ? html`<dl class="gegevens">
      <dt>Modem</dt><dd>${modem.model}</dd>
      <dt>Serienummer</dt><dd class="mono">${modem.serial_number}</dd>
      <dt>MAC-adres</dt><dd class="mono">${modem.mac_address}</dd>
      <dt>Adres op netwerkkaart</dt><dd>${map?.map_label ?? '-'}</dd>
      <dt>Netwerksegment</dt><dd class="mono">${map?.network_segment ?? c.network_segment}</dd>
      <dt>Splitter</dt><dd class="mono">${map?.splitter ?? '-'}</dd>
    </dl>` : html`<p class="leeg">Geen modem gekoppeld aan deze klant.</p>`}
  </section>
  ${modem ? html`<section class="paneel">
    <h2>Modem controleren</h2>
    <p class="uitleg">Je AI-assistent kan dit scherm niet zien. Wil je hulp van de AI, neem dan zelf over wat nodig is.</p>
    <p>
      <a class="knop" href="${actionUrl('controle')}">Modem controleren</a>
      <a class="knop knop--licht" href="${actionUrl('meting')}">Nieuwe meting aanvragen</a>
      <a class="knop knop--licht" href="${actionUrl('herstart')}">Herstart op afstand</a>
    </p>
    ${ACTION_MESSAGES[action] ? html`<div class="melding" role="status">${ACTION_MESSAGES[action]}</div>` : ''}
    ${check ? modemResult(check) : ''}
  </section>` : ''}`;
}

function modemResult(r) {
  const m = r.measurement;
  const speed = m ? `${m.download_mbps} / ${m.upload_mbps} Mbit/s` : '-';
  const contractSpeed = r.contract ? `${r.contract.download_mbps} / ${r.contract.upload_mbps} Mbit/s` : '-';
  const area = r.area?.status === 'storing'
    ? `storing sinds ${formatStamp(r.area.since)}, ticket ${r.area.ticket_id}: ${r.area.description}`
    : 'geen storing bekend';
  const restart = r.restart ? `${formatStamp(r.restart.requested_at)}, ${r.restart.result}` : 'geen';
  const measuredAt = m ? `${formatStamp(m.measured_at)} (${r.measurementAgeMinutes} minuten geleden)` : 'geen meting';

  // Plain-text version so the employee can copy exactly what they choose.
  const asText = [
    `Modemcontrole ${formatStamp(r.checkedAt)}`,
    `Status: ${m?.status ?? '-'}`,
    `Sessie: ${m?.session ?? '-'}`,
    `Gemeten snelheid: ${speed} (contract: ${contractSpeed})`,
    `Firmware: ${r.modem.firmware} (nieuwste versie: ${r.firmwareLatest})`,
    `Laatste meting: ${measuredAt}`,
    `Straatstatus: ${area}`,
    `Laatste herstart op afstand: ${restart}`,
  ].join('\n');

  return html`
    <div class="tabel-vak"><table>
      <tbody>
        <tr><th scope="row">Status</th><td>${m ? statusBadge(m.status) : '-'}</td></tr>
        <tr><th scope="row">Sessie</th><td>${m?.session ?? '-'}</td></tr>
        <tr><th scope="row">Gemeten snelheid</th><td>${speed} <span class="uitleg">(contract: ${contractSpeed})</span></td></tr>
        <tr><th scope="row">Firmware</th><td>${r.modem.firmware} <span class="uitleg">(nieuwste versie: ${r.firmwareLatest})</span></td></tr>
        <tr><th scope="row">Laatste meting</th><td>${measuredAt}</td></tr>
        <tr><th scope="row">Straatstatus</th><td>${r.area?.status === 'storing' ? html`<span class="status status--bad">storing</span> ` : html`<span class="status status--ok">normaal</span> `}${area}</td></tr>
        <tr><th scope="row">Laatste herstart op afstand</th><td>${restart}</td></tr>
      </tbody>
    </table></div>
    <h2>Als tekst</h2>
    <label class="uitleg" for="modemtekst">Selecteer en kopieer wat je nodig hebt. Denk na over wat je wel en niet aan een AI geeft.</label>
    <textarea id="modemtekst" rows="9" readonly>${asText}</textarea>
    <p class="uitleg">Klok in de oefenwereld: ${world.clockLabel}.</p>`;
}

serve({
  port: PORT,
  base: BASE,
  routes: routesOf({ 'GET /': chooseCustomer, 'GET /klant/:id': customerView }),
  notFound: () => page({ base: BASE, system: SYSTEM, title: 'Niet gevonden', body: html`<h1>Deze pagina bestaat niet</h1><p><a href="${BASE}/">Kies een klant</a></p>`, links }),
});
