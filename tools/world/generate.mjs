// Generates the Vezelvriend world for the city district in data/generated/bag.json:
// real BAG addresses, 2000 fictional customers, network segments per street,
// an outage, and the five training scenarios (details: trainer material).
//
//   node tools/world/generate.mjs [--customers 2000]
//
// How it works:
// - The small hand-made world in data/seed/ is the TEMPLATE. Its scenario
//   customers (K-0871, K-1001 ... K-1012, plus four more customers per
//   situation made by scenario-variants.mjs), their addresses (A-2001 ...),
//   tickets, contacts and measurements keep their IDs and stories, so the
//   exercises, the trainer material and the decision-tree test stay valid.
//   They are only moved to real streets.
// - Around them, the generator adds ordinary customers on real addresses.
// - Everything is driven by a random generator seeded with the district name:
//   the same district always gives exactly the same world, for every group.
//
// Output goes to data/generated/ (in .gitignore). The Docker builds copy
// data/generated/seed/ over data/seed/, so all systems and the site use it.
// Real addresses with fictional people never end up in the public repository.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...p) => JSON.parse(fs.readFileSync(path.join(ROOT, ...p), 'utf8'));
const args = process.argv.slice(2);
const TOTAL = Number(args[args.indexOf('--customers') + 1] || 2000) || 2000;

const bag = read('data', 'generated', 'bag.json');
// Some BAG addresses have no postcode (for example berths and some
// sub-addresses). A customer needs a postcode to log in, so skip those.
bag.addresses = bag.addresses.filter((a) => a.street && a.house_number && a.postcode);
const world = read('config', 'world.json');
const T = Object.fromEntries(['addresses', 'customers', 'contracts', 'modems', 'modem_measurements', 'remote_restarts',
  'area_status', 'tickets', 'contacts', 'network_map', 'support_log'].map((t) => [t, read('data', 'seed', `${t}.json`)]));

// ------------------------------------------------------------ deterministic randomness

function hashString(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry32(seed) {
  return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const rand = mulberry32(hashString(`${bag.meta.wijkcode}|${TOTAL}`));
const pick = (list) => list[Math.floor(rand() * list.length)];
const chance = (p) => rand() < p;
const between = (a, b) => a + Math.floor(rand() * (b - a + 1));
const pad = (n, w) => String(n).padStart(w, '0');
function shuffle(list) { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ------------------------------------------------------------ streets and segments

const suffixOf = (a) => (a.house_letter ?? '') + (a.house_suffix ? `-${a.house_suffix}` : '') || null;
const byStreet = new Map();
for (const a of bag.addresses) {
  if (!a.street || !a.house_number) continue;
  if (!byStreet.has(a.street)) byStreet.set(a.street, []);
  byStreet.get(a.street).push(a);
}
for (const list of byStreet.values()) list.sort((x, y) => x.house_number - y.house_number || (suffixOf(x) ?? '').localeCompare(suffixOf(y) ?? ''));

// One network segment per street: the street cable. A short, readable code.
const segmentOf = new Map();
const usedCodes = new Set();
for (const street of [...byStreet.keys()].sort()) {
  const base = `S-${street.normalize('NFD').replace(/[^A-Za-z]/g, '').slice(0, 5).toUpperCase() || 'X'}`;
  let code = base; let n = 2;
  while (usedCodes.has(code)) code = `${base}${n++}`;
  usedCodes.add(code);
  segmentOf.set(street, code);
}

// ------------------------------------------------------------ scenario streets

// Every street of the template gets a real street of its own with enough
// addresses for a believable neighbourhood, in a stable "random" order. Streets
// where a template address has a house letter get a street that has one.
const templateStreets = [...new Set(T.addresses.map((a) => a.street))];
const needsLetter = new Set(T.addresses.filter((a) => a.house_number_suffix).map((a) => a.street));
let candidates = [];
for (let minSize = 25; minSize >= 5; minSize -= 5) {
  candidates = shuffle([...byStreet.entries()].filter(([, list]) => list.length >= minSize).map(([st]) => st).sort());
  if (candidates.length >= templateStreets.length) break;
}
if (candidates.length < templateStreets.length) throw new Error(`Te weinig straten in deze wijk: ${templateStreets.length} nodig.`);
const hasLetter = (st) => byStreet.get(st).some((a) => a.house_letter && !a.house_suffix);
const scenarioStreet = {};
const takenStreets = new Set();
for (const t of [...templateStreets.filter((st) => needsLetter.has(st)), ...templateStreets.filter((st) => !needsLetter.has(st))]) {
  const real = (needsLetter.has(t) && candidates.find((c) => !takenStreets.has(c) && hasLetter(c))) || candidates.find((c) => !takenStreets.has(c));
  scenarioStreet[t] = real;
  takenStreets.add(real);
}
const segmentRename = Object.fromEntries(T.addresses.map((t) => [t.network_segment, segmentOf.get(scenarioStreet[t.street])]));

const usedAddress = new Set();
function takeAddress(street, predicate = () => true) {
  const list = byStreet.get(street).filter((a) => !usedAddress.has(a.bag_id) && predicate(a));
  const a = list[Math.floor(rand() * list.length)];
  usedAddress.add(a.bag_id);
  return a;
}

// Scenario addresses: same IDs as the template, now on real streets.
const addressRows = [];
const scenarioAddress = {};
for (const t of T.addresses) {
  const street = scenarioStreet[t.street];
  const a = t.house_number_suffix
    ? takeAddress(street, (x) => x.house_letter && !x.house_suffix)
    : takeAddress(street);
  scenarioAddress[t.address_id] = a;
  addressRows.push(toAddressRow(t.address_id, a));
}
function toAddressRow(address_id, a) {
  return { address_id, street: a.street, house_number: a.house_number, house_number_suffix: suffixOf(a), postcode: a.postcode.replace(/^(\d{4})(\w{2})$/, '$1 $2'),
    city: a.city, network_segment: segmentOf.get(a.street), is_placeholder: 0, bag_id: a.bag_id, lat: a.lat, lon: a.lon };
}
const replaceStreets = (text) => text && Object.entries(scenarioStreet).sort(([a], [b]) => b.length - a.length).reduce((t, [tmpl, real]) => t.replaceAll(tmpl, real), text)
  .replace(/S-[A-Z]+\d*/g, (code) => segmentRename[code] ?? code);

// ------------------------------------------------------------ template rows, moved to the new streets

const customers = T.customers.map((c) => ({ ...c }));
const contracts = T.contracts.map((c) => ({ ...c }));
const modems = T.modems.map((m) => ({ ...m }));
const measurements = T.modem_measurements.map((m) => ({ ...m }));
const restarts = T.remote_restarts.map((r) => ({ ...r }));
const tickets = T.tickets.map((t) => ({ ...t, title: replaceStreets(t.title), description: replaceStreets(t.description),
  network_segment: t.network_segment ? segmentRename[t.network_segment] : null }));
const contacts = T.contacts.map((c) => ({ ...c }));
const supportLog = T.support_log.map((l) => ({ ...l }));

// ------------------------------------------------------------ ordinary customers

const FIRST = 'ABCDEFGHIJKLMNOPRSTVWY'.split('');
const SURNAMES = ['De Jong', 'Jansen', 'De Vries', 'Van den Berg', 'Van Dijk', 'Bakker', 'Janssen', 'Visser', 'Smit', 'Meijer', 'De Boer', 'Mulder',
  'De Groot', 'Bos', 'Vos', 'Peters', 'Hendriks', 'Van Leeuwen', 'Dekker', 'Brouwer', 'De Wit', 'Dijkstra', 'Smits', 'De Graaf', 'Van der Meer',
  'Van der Linden', 'Kok', 'Jacobs', 'De Haan', 'Vermeulen', 'Van den Heuvel', 'Van der Veen', 'Van den Broek', 'De Bruijn', 'De Bruin', 'Van der Heijden',
  'Schouten', 'Van Beek', 'Willems', 'Van Vliet', 'Van de Ven', 'Hoekstra', 'Maas', 'Verhoeven', 'Koster', 'Van Dam', 'Van der Wal', 'Prins', 'Blom',
  'Huisman', 'Peeters', 'Kuipers', 'Van Wijk', 'Van Veen', 'Kramer', 'Kuijpers', 'Bosman', 'Verbeek', 'El Idrissi', 'Yilmaz', 'Kaya', 'Öztürk',
  'Nguyen', 'Santos', 'Pereira', 'Rodrigues', 'Kowalski', 'Nowak', 'Wiśniewski', 'Haddou', 'Benali', 'Ait Taleb', 'Pinas', 'Wijngaarde', 'Sardjoe'];
const BUSINESS = ['Bakkerij {s}', 'Kapsalon {s}', 'Café {s}', '{s} Advies', 'Boekhandel {s}', 'Fietsenmaker {s}', 'Tandartspraktijk {s}', '{s} & Partners',
  'Bloemen {s}', 'Lunchroom {s}', 'Fotostudio {s}', 'Brillen {s}', 'Wijnhandel {s}', 'Yogastudio {s}', 'Architectenbureau {s}'];
const PRODUCTS = Object.fromEntries(T.contracts.map((c) => [c.product, c]));
const HOME_PRODUCTS = [['Vezel 100', 0.15], ['Vezel 500', 0.5], ['Vezel 1000', 0.35]];
const pickProduct = (business) => {
  if (business) return PRODUCTS['Zakelijk Vezel 500'];
  let r = rand(); for (const [p, w] of HOME_PRODUCTS) { if ((r -= w) < 0) return PRODUCTS[p]; } return PRODUCTS['Vezel 500'];
};
const date = (y1, y2) => `${between(y1, y2)}-${pad(between(1, 12), 2)}-${pad(between(1, 28), 2)}`;
const slug = (s) => s.normalize('NFD').replace(/[^\w]+/g, '.').replace(/^\.|\.$/g, '').toLowerCase();

const outageStreet = scenarioStreet.Kabelkade;
// No random offline modems on the other scenario streets: "only at this customer" (decision tree step 4) must stay true.
const protectedStreets = new Set(Object.values(scenarioStreet).filter((st) => st !== outageStreet));
const free = shuffle(bag.addresses.filter((a) => a.street && a.house_number && !usedAddress.has(a.bag_id)));
const extra = Math.max(0, TOTAL - customers.length);
const ACTIVE_SHARE = 0.9;
const activeAddresses = [];
let ticketNo = 2000; let contactNo = 6000; let measurementNo = 70000;

for (let i = 0; i < extra; i++) {
  const n = 3000 + i;
  const id = `K-${n}`;
  const active = chance(ACTIVE_SHARE);
  // A former customer usually lived where someone else now lives.
  const reuse = !active && activeAddresses.length > 0 && chance(0.6);
  const a = reuse ? pick(activeAddresses) : free.pop();
  if (!a) break;
  const addressId = reuse ? a.address_id : `A-${5000 + i}`;
  if (!reuse) {
    const row = toAddressRow(addressId, a);
    addressRows.push(row);
    if (active) activeAddresses.push(row);
  }
  const business = chance(0.08);
  const surname = pick(SURNAMES);
  const name = business ? pick(BUSINESS).replace('{s}', surname)
    : chance(0.3) ? `Familie ${surname}` : `${chance(0.5) ? 'De heer' : 'Mevrouw'} ${pick(FIRST)}. ${surname}`;
  const since = date(2018, 2026).replace(/^2026-(1[1-2])/, '2026-09');
  const product = pickProduct(business);
  const endDate = active ? null : date(Number(since.slice(0, 4)) + 1 > 2026 ? 2026 : Number(since.slice(0, 4)) + 1, 2026).replace(/^2026-(1[0-2])/, '2026-09');
  const street = reuse ? a.street : a.street;
  customers.push({
    customer_id: id, name, customer_type: business ? 'zakelijk' : 'particulier', address_id: addressId,
    phone: business ? `076-00${pad(n, 5)}` : `06-00${pad(n, 6)}`, email: `${slug(name)}.${n}@example.com`,
    status: active ? 'actief' : 'beëindigd', customer_since: since, end_date: endDate,
    open_balance_eur: active && chance(0.06) ? Number((between(995, 12000) / 100).toFixed(2)) : 0,
  });
  // Own range of contract numbers: the template already uses C-3001 ... C-3012.
  contracts.push({ contract_id: `C-${n + 10000}`, customer_id: id, product: product.product, download_mbps: product.download_mbps, upload_mbps: product.upload_mbps,
    monthly_fee_eur: product.monthly_fee_eur, start_date: since, end_date: endDate });

  if (active) {
    const modemId = `M-${n}`;
    const firmware = chance(0.85) ? world.latestFirmware : chance(0.67) ? '4.1.0' : '3.8.0';
    modems.push({ modem_id: modemId, customer_id: id, model: 'Vezelbox VB-200', serial_number: `VB200-${pad(n * 37 % 999999, 6)}`,
      mac_address: `02:56:46:${pad((n >> 8 & 255).toString(16), 2)}:${pad((n & 255).toString(16), 2)}:${pad((i % 251).toString(16), 2)}`, firmware });
    let status = 'online'; let session = 'actief'; let at = `2026-10-17 10:${pad(between(0, 14), 2)}`;
    if (street === outageStreet) { status = 'offline'; session = 'geen sessie'; at = `2026-10-17 10:${pad(between(8, 12), 2)}`; }
    else if (!protectedStreets.has(street) && chance(0.02)) { status = 'offline'; session = 'geen sessie'; }
    else if (!protectedStreets.has(street) && chance(0.01)) { status = 'wisselend'; session = `onderbroken (${between(3, 15)}x in het afgelopen uur)`; }
    if (chance(0.08)) at = `2026-10-17 0${between(6, 9)}:${pad(between(0, 59), 2)}`; // some measurements are old
    const ratio = status === 'online' ? 0.72 + rand() * 0.26 : status === 'wisselend' ? 0.1 + rand() * 0.3 : 0;
    measurements.push({ measurement_id: `MM-${measurementNo++}`, modem_id: modemId, measured_at: at, status, session,
      download_mbps: Math.round(product.download_mbps * ratio), upload_mbps: Math.round(product.upload_mbps * ratio * (0.9 + rand() * 0.1)) });
  }

  // Some history: tickets and contact moments, as in any real customer base.
  if (chance(0.15)) {
    const topic = pick([['Internet traag', 'Snelheid gemeten, wifi-advies gegeven.'], ['Geen internet na stroomstoring', 'Modem herstart door klant, opgelost.'],
      ['Factuur onduidelijk', 'Factuur toegelicht.'], ['Verhuizing doorgeven', 'Verhuisformulier gestuurd.'], ['Wifi bereikt de tuin niet', 'Advies over extra accesspoint.']]);
    tickets.push({ ticket_id: `T-2026-${ticketNo++}`, ticket_type: 'klant', customer_id: id, network_segment: null,
      created_at: `${date(2025, 2026).replace(/^2026-(1[0-2])/, '2026-09')} ${pad(between(8, 19), 2)}:${pad(between(0, 59), 2)}`, status: 'gesloten', title: topic[0], description: topic[1] });
  }
  for (let k = chance(0.35) ? between(1, 3) : 0; k > 0; k--) {
    const topic = pick([['Welkom bij Vezelvriend', 'Welkomstmail met installatie-instructies.', 'mail', 'uit'], ['Vraag over abonnement', 'Abonnement en snelheid toegelicht.', 'telefoon', 'in'],
      ['Wifi-wachtwoord vergeten', 'Uitgelegd waar het wachtwoord staat.', 'chat', 'in'], ['Overstap naar hogere snelheid', 'Overstapmogelijkheden besproken.', 'telefoon', 'in'],
      ['Klacht over storing', 'Excuses gemaakt, storing was al opgelost.', 'mail', 'in']]);
    contacts.push({ contact_id: `CT-${contactNo++}`, address_id: addressId, customer_id: id,
      contact_at: `${date(2019, 2026).replace(/^2026-(1[0-2])/, '2026-09')} ${pad(between(8, 20), 2)}:${pad(between(0, 59), 2)}`, channel: topic[2], direction: topic[3], subject: topic[0], summary: topic[1] });
  }
}

// ------------------------------------------------------------ network map, area status, accounting

// The network map is kept by network management and mostly matches the
// address, with exceptions described in the trainer material.
function variantSpelling(street, suffix, number) {
  // Torenstraat -> Torensstraat; a street that already has the s loses it: Stationsweg -> Stationweg.
  const s = /s(laan|straat|weg|singel|plein|kade|dijk|markt|steeg|hof)$/i.test(street)
    ? street.replace(/s(laan|straat|weg|singel|plein|kade|dijk|markt|steeg|hof)$/i, '$1')
    : street.match(/(laan|straat|weg|singel|plein|kade|dijk|markt|steeg|hof)$/i)
    ? street.replace(/(laan|straat|weg|singel|plein|kade|dijk|markt|steeg|hof)$/i, 's$1') : `${street}s`;
  return `${s} ${number}-${(suffix ?? 'a').toLowerCase()}`;
}
// Template addresses whose map label is spelled differently keep that difference.
const oddSpelling = new Set(T.network_map.filter((m) => { const t = T.addresses.find((x) => x.address_id === m.address_id);
  return t && m.map_label !== `${t.street} ${t.house_number}${t.house_number_suffix ?? ''}`; }).map((m) => m.address_id));
const networkMap = addressRows.map((a) => ({
  address_id: a.address_id,
  map_label: oddSpelling.has(a.address_id) ? variantSpelling(a.street, a.house_number_suffix, a.house_number) : `${a.street} ${a.house_number}${a.house_number_suffix ?? ''}`,
  network_segment: a.network_segment,
  splitter: `SPL-${a.network_segment.slice(2, 5)}-${pad(Math.ceil(a.house_number / 40), 2)}`,
}));

const outageTemplate = T.area_status.find((st) => st.status === 'storing');
const segments = [...new Set(addressRows.map((a) => a.network_segment))].sort();
const areaStatus = segments.map((seg) => seg === segmentRename['S-KABEL']
  ? { ...outageTemplate, network_segment: seg }
  : { network_segment: seg, status: 'normaal', since: null, ticket_id: null, description: null });

// Accounting export (a separate system): matches the customer system,
// with exceptions described in the trainer material.
const accounting = ['customer_id;customer_name;invoice_id;invoice_date;amount_eur;status'];
// The template export has the lines of the scenario customers that differ on purpose.
const templateAccounting = fs.readFileSync(path.join(ROOT, 'data', 'accounting', 'open-items.csv'), 'utf8').trim().split('\n').slice(1);
const SPECIAL = /^K-1[0-4]05$/;
for (const c of customers.filter((x) => x.open_balance_eur > 0)) {
  if (SPECIAL.test(c.customer_id)) {
    accounting.push(...templateAccounting.filter((l) => l.startsWith(`${c.customer_id};`)));
  } else {
    accounting.push(`${c.customer_id};${c.name};F-2026-10${c.customer_id.slice(2)};2026-10-01;${c.open_balance_eur.toFixed(2)};open`);
  }
}

// ------------------------------------------------------------ write

const outDir = path.join(ROOT, 'data', 'generated', 'seed');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
const write = (name, rows) => fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(rows.map(({ bag_id, lat, lon, ...r }) => r), null, 0));
write('addresses', addressRows); write('customers', customers); write('contracts', contracts); write('modems', modems);
write('modem_measurements', measurements); write('remote_restarts', restarts); write('area_status', areaStatus); write('tickets', tickets);
write('contacts', contacts); write('network_map', networkMap); write('support_log', supportLog);
fs.mkdirSync(path.join(ROOT, 'data', 'generated', 'accounting'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'data', 'generated', 'accounting', 'open-items.csv'), accounting.join('\n') + '\n');

// Facts for the trainer: where the scenarios are in THIS world.
const fmt = (id) => { const a = addressRows.find((x) => x.address_id === id); return `${a.street} ${a.house_number}${a.house_number_suffix ?? ''}, ${a.postcode}`; };
const facts = [
  `# Wereld: ${bag.meta.wijknaam} (${bag.meta.wijkcode})`, '',
  `Gegenereerd op ${new Date().toISOString().slice(0, 10)} uit ${bag.meta.count} BAG-adressen. Klanten: ${customers.length} (${customers.filter((c) => c.status === 'actief').length} actief).`, '',
  '| Scenario | Klant | Adres |', '|---|---|---|',
  ...['1 Storing in de straat', '2 Groen, klant zegt niks werkt', '3 Verouderde meting', '4 Monteur', '5 Escaleren'].flatMap((label, i) =>
    [0, 1, 2, 3, 4].map((v) => {
      const c = customers.find((x) => x.customer_id === `K-1${v}0${i + 1}`);
      if (!c) return null;
      const extra = i === 1 ? `, dubbel als K-1${v}12` : i === 3 ? `, vorige bewoner ${v === 0 ? 'K-0871' : `K-087${v + 1}`}` : '';
      const map = i === 2 ? `; netwerkkaart: "${networkMap.find((m) => m.address_id === c.address_id).map_label}"` : '';
      return `| ${label} | ${c.name} (${c.customer_id})${extra} | ${fmt(c.address_id)}${map} |`;
    }).filter(Boolean)),
  '', `Storing op segment ${segmentRename['S-KABEL']} (${outageStreet}).`, '',
  `Offline door de storing in ${outageStreet}: ${measurements.filter((m) => m.status === 'offline').length} modems in totaal offline.`,
  `Verouderde firmware: ${modems.filter((m) => m.firmware !== world.latestFirmware).length} modems.`,
  `Actieve klanten met een ander actief record op hetzelfde adres: zie de SQL-vraag in stap 9c.`,
];
fs.writeFileSync(path.join(ROOT, 'data', 'generated', 'world-facts.md'), facts.join('\n') + '\n');
console.log(facts.join('\n'));
