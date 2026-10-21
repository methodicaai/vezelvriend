// "Mijn Vezelvriend": the API behind the customer app at /app/ (fictional).
//
// Customers of the fictional company log in with their customer number and
// postcode. Both are fake and published in this repo on purpose: there are
// no e-mail addresses or passwords, because a fake internet provider on a
// real domain must never invite people to type in real login details.
// The one exception is an order from the package builder on the website:
// it becomes a customer in the systems, so participants can look it up
// there. The order form asks for made-up data and only accepts a practice
// IBAN; the trainer wipes the orders after a training (see shared/orders.js).
//
// The app shows the customer's own view of the same data the employees see
// in the Klantbeeld, in customer language. It only reads.
import fs from 'node:fs';
import path from 'node:path';
import { openDatabase } from '../shared/db.js';
import { formatAddress, getCustomer, getModemCheck, isScenarioCustomer, searchCustomers } from '../shared/queries.js';
import { cookie, newSession, registerFailure, sessionId, tooManyFailures } from '../shared/session.js';
import { KEEP_DAYS, MAX_ORDERS, readOrders, writeOrders } from '../shared/orders.js';
import { ROOT, formatEuro, formatStamp, now, world } from '../shared/world.js';
import { cookies, readJson, routesOf, serve } from '../shared/web.js';

const PORT = Number(process.env.PORT ?? 3004);
const COOKIE = 'vv_mijn';
const DAY = 24 * 60 * 60;
const { db, refresh } = openDatabase('mijn');
const PRODUCTS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'products.json'), 'utf8'));

const json = (status, data, headers) => ({ status, type: 'application/json; charset=utf-8', body: JSON.stringify(data), headers });
const normalise = (s) => String(s ?? '').toUpperCase().replace(/\s+/g, '');

function customerFrom(req) {
  const id = sessionId(cookies(req)[COOKIE]);
  const c = id ? getCustomer(db, id) : null;
  return c && c.status === 'actief' ? c : null;
}

async function login({ req }) {
  if (tooManyFailures(req, 'klant', 50)) return json(429, { error: 'Te veel mislukte pogingen. Wacht een kwartier en probeer het opnieuw.' });
  const body = await readJson(req, 2_000);
  const c = getCustomer(db, normalise(body.klantnummer));
  if (!c || c.status !== 'actief' || normalise(c.postcode) !== normalise(body.postcode)) {
    registerFailure(req, 'klant');
    return json(401, { error: 'Deze combinatie van klantnummer en postcode kennen we niet.' });
  }
  return json(200, { naam: c.name }, { 'Set-Cookie': cookie(COOKIE, newSession(c.customer_id, DAY), DAY) });
}

// Demo customers for the login screen: the scenario customers, with the
// postcode of wherever the current world puts them.
function demo() {
  const rows = searchCustomers(db, '').filter((c) => c.status === 'actief' && isScenarioCustomer(c.customer_id) && c.customer_id <= 'K-1005');
  return json(200, rows.map((c) => ({ klantnummer: c.customer_id, postcode: c.postcode, naam: c.name })));
}

// ---------------------------------------------------------------- address check (package builder)
//
// "Valt mijn adres in jullie gebied?" for the package builder on the website.
// Uses the BAG snapshot of the training district when the server has one
// (data/generated/bag.json, made by tools/world/), otherwise the addresses of
// the small template world. Nothing is stored, and the answer never says
// whether someone at that address is a customer.
const ADDRESSES = (() => {
  const bagFile = path.join(ROOT, 'data', 'generated', 'bag.json');
  const list = fs.existsSync(bagFile)
    ? JSON.parse(fs.readFileSync(bagFile, 'utf8')).addresses.map((a) => ({
      postcode: a.postcode, number: a.house_number, addition: `${a.house_letter ?? ''}${a.house_suffix ? `-${a.house_suffix}` : ''}`, street: a.street, city: a.city }))
    : db.prepare('SELECT postcode, house_number AS number, house_number_suffix AS addition, street, city FROM addresses').all()
      .map((a) => ({ ...a, postcode: a.postcode.replace(/\s/g, ''), addition: a.addition ?? '' }));
  const index = new Map();
  for (const a of list) {
    const key = `${a.postcode}|${a.number}`;
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(a);
  }
  return index;
})();

const addressLabel = (a) => `${a.street} ${a.number}${a.addition ? (/^[A-Z]/i.test(a.addition) ? a.addition : ` ${a.addition}`) : ''}, ${a.postcode.slice(0, 4)} ${a.postcode.slice(4)} ${a.city}`;

/** { error } for bad input, otherwise { exact } (the one address) and { found } (all at this number). */
function findAddress(postcodeIn, numberIn, additionIn) {
  const postcode = normalise(postcodeIn);
  const number = Number(numberIn);
  const addition = normalise(additionIn).replace(/^-/, '');
  if (!/^\d{4}[A-Z]{2}$/.test(postcode) || !Number.isInteger(number) || number < 1) {
    return { error: 'Vul een geldige postcode (1234 AB) en een huisnummer in.' };
  }
  const found = ADDRESSES.get(`${postcode}|${number}`) ?? [];
  const exact = found.find((a) => normalise(a.addition).replace(/-/g, '') === addition.replace(/-/g, ''));
  return { exact, found, addition };
}

function addressCheck({ url }) {
  const { error, exact, found, addition } = findAddress(url.searchParams.get('postcode'), url.searchParams.get('huisnummer'), url.searchParams.get('toevoeging'));
  if (error) return json(400, { error });
  if (exact) return json(200, { inGebied: true, adres: addressLabel(exact) });
  // Several flats or units at this number: ask which one, like real providers do.
  if (found.length > 0 && !addition) return json(200, { inGebied: null, keuze: found.map((a) => ({ toevoeging: a.addition, adres: addressLabel(a) })) });
  return json(200, { inGebied: false });
}

// ---------------------------------------------------------------- orders (package builder)
//
// The order becomes a customer with an address, a contract and an order row,
// in the number range K-9..., so it never collides with the generated world.
// Prices are calculated here again from data/products.json: never trust the
// amounts a browser sends.

const ORDER_FIELDS = ['aanhef', 'voorletters', 'tussenvoegsel', 'achternaam', 'geboortedatum', 'email', 'telefoon', 'iban'];
const SALUTATIONS = { dhr: 'De heer', mevr: 'Mevrouw', geen: '' };
const PRACTICE_IBAN = /^NL\d{2}VVBK\d{10}$/;

/** The ISO 13616 check: move the first four characters to the end, letters to numbers, remainder 97 must be 1. */
function ibanChecksumOk(iban) {
  const digits = (iban.slice(4) + iban.slice(0, 4)).replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55));
  let rest = 0;
  for (const d of digits) rest = (rest * 10 + Number(d)) % 97;
  return rest === 1;
}

function addDays(date, days) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function ageOn(birth, date) {
  const [by, bm, bd] = birth.split('-').map(Number);
  const [y, m, d] = date.split('-').map(Number);
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
}

/** Checks the personal data. Returns { errors } per field, or the cleaned values. */
function checkPerson(input) {
  const v = Object.fromEntries(ORDER_FIELDS.map((f) => [f, String(input?.[f] ?? '').replace(/[\u0000-\u001f]/g, '').trim()]));
  const errors = {};
  const today = now.slice(0, 10);
  if (!(v.aanhef in SALUTATIONS)) errors.aanhef = 'Kies een aanhef.';
  if (!/^([A-Za-z]\.?\s?){1,6}$/.test(v.voorletters)) errors.voorletters = 'Vul je voorletters in, bijvoorbeeld P.J.';
  if (v.tussenvoegsel.length > 15 || /[^A-Za-z' ]/.test(v.tussenvoegsel)) errors.tussenvoegsel = 'Dit tussenvoegsel klopt niet.';
  if (v.achternaam.length < 2 || v.achternaam.length > 60 || !/^[\p{L}' -]+$/u.test(v.achternaam)) errors.achternaam = 'Vul je achternaam in (alleen letters).';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.geboortedatum) || Number.isNaN(Date.parse(v.geboortedatum))) errors.geboortedatum = 'Vul je geboortedatum in.';
  else if (ageOn(v.geboortedatum, today) < 18) errors.geboortedatum = 'Je moet 18 jaar of ouder zijn om een abonnement af te sluiten.';
  else if (ageOn(v.geboortedatum, today) > 120) errors.geboortedatum = 'Deze geboortedatum klopt niet.';
  if (v.email.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) errors.email = 'Vul een geldig e-mailadres in.';
  const phone = v.telefoon.replace(/[\s-]/g, '');
  if (!/^(0\d{9}|\+31\d{9})$/.test(phone)) errors.telefoon = 'Vul een telefoonnummer van 10 cijfers in, bijvoorbeeld 06-12345678.';
  const iban = normalise(v.iban);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban) || !ibanChecksumOk(iban)) errors.iban = 'Dit IBAN klopt niet. Controleer het nummer.';
  else if (!PRACTICE_IBAN.test(iban)) errors.iban = 'Vul een oefen-IBAN van de Vezelvriend Oefenbank in (NL.. VVBK ..). Gebruik nooit je echte rekeningnummer: klik op "Maak een oefen-IBAN".';
  if (Object.keys(errors).length) return { errors };
  const name = [SALUTATIONS[v.aanhef], v.voorletters.toUpperCase().replace(/\s/g, ''), v.tussenvoegsel.toLowerCase(), v.achternaam].filter(Boolean).join(' ');
  return { name, birth: v.geboortedatum, email: v.email, phone, iban };
}

/** Checks the chosen package and calculates the prices in cents, like the website does. */
function checkPackage(input) {
  const cents = (euro) => Math.round(euro * 100);
  const speed = PRODUCTS.speeds.find((s) => s.id === input?.snelheid);
  const installation = PRODUCTS.installation.find((x) => x.id === input?.installatie);
  const term = PRODUCTS.terms.find((t) => t.id === input?.looptijd);
  if (!speed || !installation || !term) return { error: 'Kies een snelheid, een installatie en een looptijd.' };
  const extras = [];
  let extrasC = 0;
  for (const x of PRODUCTS.extras) {
    const count = Number(input.extras?.[x.id] ?? 0);
    if (!Number.isInteger(count) || count < 0 || count > x.max) return { error: `Kies bij ${x.name} 0 tot ${x.max}.` };
    if (count > 0 && x.only_with && !x.only_with.includes(speed.id)) return { error: `${x.name} kan niet bij ${speed.product}.` };
    if (count > 0) { extras.push(count > 1 ? `${count}x ${x.name}` : x.name); extrasC += cents(x.monthly_fee_eur) * count; }
  }
  const speedC = cents(speed.monthly_fee_eur);
  const discountC = Math.round(speedC * term.discount_percent / 100);
  return {
    speed, installation, term, extras: extras.join(', ') || null,
    discountPrice: (speedC + extrasC - discountC) / 100,
    monthlyPrice: (speedC + extrasC) / 100,
    oneOff: (cents(installation.one_off_eur) + cents(term.connection_fee_eur)) / 100,
  };
}

// Orders older than KEEP_DAYS disappear by themselves, also when the trainer forgets to wipe them.
function dropOldOrders() {
  const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
  const orders = readOrders();
  const kept = orders.filter((o) => o.created_ms > cutoff);
  if (kept.length !== orders.length) writeOrders(kept);
}
dropOldOrders();
setInterval(dropOldOrders, 60 * 60 * 1000).unref();

async function placeOrder({ req }) {
  if (tooManyFailures(req, 'bestelling', 100)) return json(429, { error: 'Te veel bestellingen vanaf dit adres. Probeer het later opnieuw.' });
  const body = await readJson(req, 4_000);
  if (body.akkoord !== true) return json(400, { errors: { akkoord: 'Ga akkoord met de voorwaarden.' } });
  const place = findAddress(body.adres?.postcode, body.adres?.huisnummer, body.adres?.toevoeging);
  if (place.error || !place.exact) return json(400, { error: 'Check eerst je adres: we leveren alleen op adressen in ons gebied.' });
  const pack = checkPackage(body.pakket);
  if (pack.error) return json(400, { error: pack.error });
  const person = checkPerson(body.klant);
  if (person.errors) return json(400, { errors: person.errors });

  const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
  const orders = readOrders().filter((o) => o.created_ms > cutoff);
  if (orders.length >= MAX_ORDERS) return json(503, { error: 'Het maximum aantal oefenbestellingen is bereikt. Vraag de trainer om ze te wissen.' });
  registerFailure(req, 'bestelling'); // counts every order, not only failures: a cap per visitor

  const seq = Math.max(0, ...orders.map((o) => o.seq)) + 1;
  const n = String(seq).padStart(4, '0');
  const a = place.exact;
  const postcode = `${a.postcode.slice(0, 4)} ${a.postcode.slice(4)}`;
  const today = now.slice(0, 10);
  const time = new Intl.DateTimeFormat('nl-NL', { timeZone: 'Europe/Amsterdam', hour: '2-digit', minute: '2-digit' }).format(new Date());
  const planned = addDays(today, pack.installation.id === 'monteur' ? 14 : 7);

  // Reuse the address when the systems already know it (an earlier resident or another order).
  const known = db.prepare(`SELECT address_id FROM addresses WHERE replace(postcode, ' ', '') = ? AND house_number = ? AND coalesce(house_number_suffix, '') = ?`)
    .get(a.postcode, a.number, a.addition ?? '');
  const segment = db.prepare('SELECT network_segment FROM addresses WHERE street = ? LIMIT 1').get(a.street)?.network_segment ?? 'S-NIEUW';
  const addressId = known?.address_id ?? `A-9${n}`;
  const customerId = `K-9${n}`;
  const orderId = `B-2026-${n}`;
  const rows = {
    addresses: known ? [] : [{ address_id: addressId, street: a.street, house_number: a.number, house_number_suffix: a.addition || null, postcode, city: a.city, network_segment: segment, is_placeholder: 0 }],
    customers: [{ customer_id: customerId, name: person.name, customer_type: 'particulier', address_id: addressId, phone: person.phone, email: person.email,
      birth_date: person.birth, iban: person.iban, status: 'actief', customer_since: today, end_date: null, open_balance_eur: 0 }],
    contracts: [{ contract_id: `C-9${n}`, customer_id: customerId, product: pack.speed.product, download_mbps: pack.speed.download_mbps, upload_mbps: pack.speed.upload_mbps,
      monthly_fee_eur: pack.speed.monthly_fee_eur, start_date: planned, end_date: null }],
    orders: [{ order_id: orderId, customer_id: customerId, ordered_at: `${today} ${time}`, product: pack.speed.product, extras: pack.extras,
      installation: pack.installation.name, contract_term: pack.term.name, first_months: pack.term.discount_months,
      discount_price_eur: pack.discountPrice, monthly_price_eur: pack.monthlyPrice, one_off_eur: pack.oneOff, planned_date: planned, status: 'nieuw' }],
  };
  writeOrders([...orders, { seq, created_ms: Date.now(), rows }]);
  return json(201, { bestelnummer: orderId, klantnummer: customerId, postcode, naam: person.name, adres: addressLabel(a), gepland: formatStamp(planned), installatie: pack.installation.id });
}

const logout = () => json(200, { ok: true }, { 'Set-Cookie': cookie(COOKIE, '', 0) });

// Customer language for the technical status, no jargon.
function connectionView(check) {
  const m = check?.measurement;
  if (!check) return { toestand: 'onbekend', titel: 'Geen modem gevonden', uitleg: 'Neem contact op met de klantenservice.' };
  if (check.area?.status === 'storing') {
    return { toestand: 'storing', titel: 'Storing in je straat', uitleg: `Sinds ${formatStamp(check.area.since).split(' ')[1]} is er een storing bij jou in de buurt. ${check.area.description} Je hoeft ons niet te bellen: we werken eraan.` };
  }
  if (m?.status === 'online') return { toestand: 'goed', titel: 'Je internet werkt', uitleg: 'Je Vezelbox is online. Werkt het toch niet goed? Probeer een netwerkkabel of zet je wifi-apparaat dichter bij de Vezelbox.' };
  if (m?.status === 'wisselend') return { toestand: 'let-op', titel: 'Je verbinding is instabiel', uitleg: 'Je verbinding valt af en toe weg. Herstart je Vezelbox; helpt dat niet, bel dan de klantenservice.' };
  return { toestand: 'fout', titel: 'Je Vezelbox is offline', uitleg: 'We zien je Vezelbox niet. Herstart hem hieronder, of zet hem uit en na 30 seconden weer aan.' };
}

function overview({ req }) {
  const c = customerFrom(req);
  if (!c) return json(401, { error: 'Log opnieuw in.' });
  const check = getModemCheck(db, c.customer_id);
  const order = db.prepare('SELECT * FROM orders WHERE customer_id = ? ORDER BY order_id DESC').get(c.customer_id);
  // A new customer from the website has no Vezelbox yet: say when it comes instead of "offline".
  const view = !check && order
    ? { toestand: 'let-op', titel: 'Je aansluiting komt eraan', uitleg: `We hebben je bestelling ${order.order_id} ontvangen. ${order.installation === 'Installatie door een monteur' ? 'De monteur komt' : 'Je Vezelbox wordt bezorgd'} op ${formatStamp(order.planned_date)}.` }
    : connectionView(check);
  const tickets = db.prepare(`SELECT ticket_id, created_at, status, title FROM tickets WHERE customer_id = ? ORDER BY created_at DESC`).all(c.customer_id);
  // Only this customer's own contacts; earlier residents of the address are none of their business.
  const contacts = db.prepare(`SELECT contact_at, channel, subject FROM contacts WHERE customer_id = ? ORDER BY contact_at DESC LIMIT 10`).all(c.customer_id);

  return json(200, {
    nu: world.clockLabel,
    klant: { naam: c.name, klantnummer: c.customer_id, adres: formatAddress(c) },
    verbinding: {
      ...view,
      gemeten: check?.measurement ? formatStamp(check.measurement.measured_at) : null,
      snelheid: check?.measurement && check.measurement.status !== 'offline' ? `${check.measurement.download_mbps} Mbit/s` : null,
      storingsnummer: check?.area?.status === 'storing' ? check.area.ticket_id : null,
    },
    abonnement: c.product ? {
      naam: c.product,
      snelheid: `${c.download_mbps} Mbit/s download en upload`,
      prijs: `${formatEuro(c.monthly_fee_eur)} per maand`,
      sinds: formatStamp(c.contract_start),
    } : null,
    betalen: { openstaand: formatEuro(c.open_balance_eur), alles_betaald: c.open_balance_eur === 0 },
    meldingen: [
      ...(order ? [{ at: order.ordered_at, titel: `Bestelling ${order.order_id}: ${order.product}${order.extras ? `, ${order.extras}` : ''}`, status: 'In behandeling' }] : []),
      ...tickets.map((t) => ({ at: t.created_at, titel: t.title, status: t.status === 'open' ? 'In behandeling' : 'Afgehandeld' })),
      ...contacts.map((h) => ({ at: h.contact_at, titel: h.subject, status: h.channel })),
    ].sort((a, b) => b.at.localeCompare(a.at)).map(({ at, ...rest }) => ({ datum: formatStamp(at), ...rest })),
  });
}

// The fake world has no real modems: the button explains that instead of pretending.
function restart({ req }) {
  const c = customerFrom(req);
  if (!c) return json(401, { error: 'Log opnieuw in.' });
  return json(200, { melding: 'Herstart aangevraagd. Je Vezelbox start binnen een paar minuten opnieuw op. (Oefen-app: in de oefenwereld staat de klok stil, dus er verandert niets.)' });
}

serve({
  port: PORT,
  base: '',
  routes: routesOf({
    'POST /api/mijn/login': login,
    'GET /api/mijn/demo': demo,
    'GET /api/mijn/adrescheck': addressCheck,
    'POST /api/mijn/logout': logout,
    'GET /api/mijn/overzicht': overview,
    'POST /api/mijn/herstart': restart,
    'POST /api/mijn/bestelling': placeOrder,
  }),
  before: refresh,   // orders from the website: new customers can log in right away
  notFound: () => JSON.stringify({ error: 'Niet gevonden' }),
});
