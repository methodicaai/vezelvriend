// Adds four extra customers to each of the five training scenarios in the
// template world (data/seed/), so every participant of a group can get a
// customer of their own while the situations repeat: other name, other
// address, same situation, same extra pitfalls (details: trainer material).
//
//   node tools/world/scenario-variants.mjs
//
// Run it again after changing a scenario customer in the template: it first
// removes the variants it made before, then copies the five base scenarios.
// tools/world/generate.mjs moves the variants to real streets like the rest.
//
// Numbering (systems/shared/queries.js, scenarioOf):
//   scenario customers  K-1{v}0{s}   s = scenario 1..5, v = 0 (base) .. 4
//   old duplicate record of scenario 2 (base K-1012)     K-1{v}12
//   previous resident of scenario 4 (base K-0871)        K-087{v+1}
// Each variant of scenarios 2 to 5 lives on a street of its own (its own
// network segment), so "only at this customer" stays true; the variants of
// scenario 1 share the street of the outage.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SEED = path.join(ROOT, 'data', 'seed');
const TABLES = ['addresses', 'customers', 'contracts', 'modems', 'modem_measurements', 'remote_restarts', 'area_status', 'tickets', 'contacts', 'network_map'];
const T = Object.fromEntries(TABLES.map((t) => [t, JSON.parse(fs.readFileSync(path.join(SEED, `${t}.json`), 'utf8'))]));

// ------------------------------------------------------------ remove earlier variants
const isVariantCustomer = (id) => /^K-1[1-4](0[1-5]|12)$/.test(id) || /^K-087[2-5]$/.test(id);
const isVariantAddress = (id) => /^A-2[1-4]\d0$/.test(id);
const variantModems = new Set(T.modems.filter((m) => isVariantCustomer(m.customer_id)).map((m) => m.modem_id));
const variantTickets = new Set(T.tickets.filter((t) => t.customer_id && isVariantCustomer(t.customer_id)).map((t) => t.ticket_id));
T.customers = T.customers.filter((c) => !isVariantCustomer(c.customer_id));
T.contracts = T.contracts.filter((c) => !isVariantCustomer(c.customer_id));
T.modems = T.modems.filter((m) => !variantModems.has(m.modem_id));
T.modem_measurements = T.modem_measurements.filter((m) => !variantModems.has(m.modem_id));
T.remote_restarts = T.remote_restarts.filter((r) => !variantModems.has(r.modem_id));
T.tickets = T.tickets.filter((t) => !variantTickets.has(t.ticket_id));
T.contacts = T.contacts.filter((c) => !isVariantCustomer(c.customer_id));
T.addresses = T.addresses.filter((a) => !isVariantAddress(a.address_id));
T.network_map = T.network_map.filter((m) => !isVariantAddress(m.address_id));
T.area_status = T.area_status.filter((s) => !/^S-[A-Z]+\d$/.test(s.network_segment));

// ------------------------------------------------------------ the variants
// Names per scenario (variant 1 to 4). Scenario 5 is a business, like the base.
const NAMES = {
  1: ['Familie Van Dam', 'Mevrouw K. Brouwer', 'De heer M. Yilmaz', 'Familie Hoekstra'],
  2: ['Mevrouw S. Kok', 'De heer B. Peters', 'Mevrouw N. Benali', 'De heer W. Maas'],
  3: ['Mevrouw F. Öztürk', 'De heer D. Vermeulen', 'Familie Nguyen', 'Mevrouw R. Pinas'],
  4: ['Familie Kramer', 'De heer J. Bos', 'Mevrouw E. Santos', 'Familie Van Vliet'],
  5: ['Kapsalon Knip', 'Lunchroom De Zon', 'Fietsenmaker Vlot', 'Brillen Scherp'],
};
const PREVIOUS_RESIDENT = ['Mevrouw H. Dekker', 'De heer A. Prins', 'Familie Blom', 'De heer C. Koster'];
// Streets per scenario for variant 1 to 4 (scenario 1: the street of the outage).
const STREETS = {
  2: ['Glasvezelhof', 'Glasvezelweg', 'Glasvezelplein', 'Glasvezelsingel'],
  3: ['Lichtsnelheidhof', 'Lichtsnelheidweg', 'Lichtsnelheidplein', 'Lichtsnelheidsingel'],
  4: ['Routerhof', 'Routerweg', 'Routerplein', 'Routersingel'],
  5: ['Modemlaan', 'Modemweg', 'Modemplein', 'Modemsingel'],
};
const slug = (s) => s.normalize('NFD').replace(/[^\w]+/g, '.').replace(/^\.|\.$/g, '').toLowerCase();
// "Lichtsnelheidhof" -> "Lichtsnelheidshof": the spelling on the network map differs (as for the base of scenario 3).
const mapSpelling = (street) => street.replace(/(laan|straat|weg|singel|plein|kade|hof)$/, 's$1');

const base = (s) => T.customers.find((c) => c.customer_id === `K-100${s}`);
const baseAddress = (s) => T.addresses.find((a) => a.address_id === base(s).address_id);
const out = Object.fromEntries(TABLES.map((t) => [t, []]));
let ticketNo = 1300;

function cloneCustomer(src, id, name, addressId, v) {
  const customer = { ...src, customer_id: id, name, address_id: addressId,
    phone: src.customer_type === 'zakelijk' ? `076-000${id.slice(2)}` : `06-0000${id.slice(2)}`,
    email: src.customer_type === 'zakelijk' ? `info@${slug(name).replace(/\./g, '')}.example.com` : `${slug(name.replace(/^(De heer|Mevrouw|Familie) /, ""))}@example.com` };
  out.customers.push(customer);
  for (const c of T.contracts.filter((x) => x.customer_id === src.customer_id)) {
    out.contracts.push({ ...c, contract_id: `C-${id.slice(2)}`, customer_id: id });
  }
  const ticketIds = {};
  for (const t of T.tickets.filter((x) => x.customer_id === src.customer_id)) {
    const newId = `T-2026-${ticketNo++}`;
    ticketIds[t.ticket_id] = newId;
    out.tickets.push({ ...t, ticket_id: newId, customer_id: id });
  }
  for (const c of T.contacts.filter((x) => x.customer_id === src.customer_id)) {
    const summary = Object.entries(ticketIds).reduce((text, [from, to]) => text.replaceAll(from, to), c.summary);
    out.contacts.push({ ...c, contact_id: `CT-4${v}${c.contact_id.slice(-2)}`, customer_id: id, address_id: addressId, summary });
  }
  for (const m of T.modems.filter((x) => x.customer_id === src.customer_id)) {
    const modemId = `M-5${v}${m.modem_id.slice(-2)}`;
    out.modems.push({ ...m, modem_id: modemId, customer_id: id,
      serial_number: `VB200-${v}${m.serial_number.slice(-5)}`, mac_address: m.mac_address.replace(/^02:56:46:00/, `02:56:46:0${v}`) });
    T.modem_measurements.filter((x) => x.modem_id === m.modem_id).forEach((x, k) => out.modem_measurements.push({ ...x, measurement_id: `MM-9${v}${m.modem_id.slice(-2)}${k}`, modem_id: modemId }));
    T.remote_restarts.filter((x) => x.modem_id === m.modem_id).forEach((x) => out.remote_restarts.push({ ...x, restart_id: `${x.restart_id}-${v}`, modem_id: modemId }));
  }
  return customer;
}

for (let s = 1; s <= 5; s++) {
  const a0 = baseAddress(s);
  const mapRow = T.network_map.find((m) => m.address_id === a0.address_id);
  const oddSpelling = mapRow.map_label !== `${a0.street} ${a0.house_number}${a0.house_number_suffix ?? ''}`;
  for (let v = 1; v <= 4; v++) {
    const addressId = `A-2${v}${s}0`;
    const street = s === 1 ? a0.street : STREETS[s][v - 1];
    const segment = s === 1 ? a0.network_segment : `${a0.network_segment}${v + 1}`;
    const houseNumber = s === 1 ? 30 + 2 * v : a0.house_number + v;
    out.addresses.push({ ...a0, address_id: addressId, street, house_number: houseNumber, network_segment: segment });
    out.network_map.push({ address_id: addressId, network_segment: segment, splitter: `${mapRow.splitter.slice(0, -2)}0${s === 1 ? 1 : v + 1}`,
      map_label: oddSpelling ? `${mapSpelling(street)} ${houseNumber}-${(a0.house_number_suffix ?? 'a').toLowerCase()}` : `${street} ${houseNumber}${a0.house_number_suffix ?? ''}` });
    if (s !== 1) out.area_status.push({ network_segment: segment, status: 'normaal', since: null, ticket_id: null, description: null });

    // Scenario 4: the previous resident at the same address, with the old history.
    if (s === 4) {
      const prev = T.customers.find((c) => c.customer_id === 'K-0871');
      cloneCustomer(prev, `K-087${v + 1}`, PREVIOUS_RESIDENT[v - 1], addressId, v);
    }
    const customer = cloneCustomer(base(s), `K-1${v}0${s}`, NAMES[s][v - 1], addressId, v);
    // Scenario 2: an old record of the same customer that was never closed.
    if (s === 2) {
      const dup = T.customers.find((c) => c.customer_id === 'K-1012');
      const initials = customer.name.replace(/^(De heer|Mevrouw|Familie) /, '');
      const old = cloneCustomer(dup, `K-1${v}12`, initials, addressId, v);
      old.phone = customer.phone; old.email = customer.email;
    }
  }
}

// ------------------------------------------------------------ write
for (const t of TABLES) {
  // Same layout as the hand-made files: one row per line.
  const rows = [...T[t], ...out[t]].map((r) => `  ${JSON.stringify(r)}`);
  fs.writeFileSync(path.join(SEED, `${t}.json`), `[\n${rows.join(',\n')}\n]\n`);
}
// The accounting export: scenario 5 differs from the customer system for every variant too.
const csvFile = path.join(ROOT, 'data', 'accounting', 'open-items.csv');
const lines = fs.readFileSync(csvFile, 'utf8').trim().split('\n').filter((l) => !/^K-1[1-4]05;/.test(l));
const lente = lines.filter((l) => l.startsWith('K-1005;'));
for (const c of out.customers.filter((x) => /^K-1[1-4]05$/.test(x.customer_id))) {
  for (const l of lente) lines.push(l.replace(/^K-1005;[^;]*;F-2026-(\d{4})/, (m, n) => `${c.customer_id};${c.name};F-2026-${n}${c.customer_id.slice(3, 4)}`));
}
fs.writeFileSync(csvFile, lines.join('\n') + '\n');
console.log(`Varianten gemaakt: ${out.customers.length} klanten, ${out.addresses.length} adressen.`);
