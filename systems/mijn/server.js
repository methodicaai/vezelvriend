// "Mijn Vezelvriend": the API behind the customer app at /app/ (fictional).
//
// Customers of the fictional company log in with their customer number and
// postcode. Both are fake and published in this repo on purpose: there are
// no e-mail addresses or passwords, because a fake internet provider on a
// real domain must never invite people to type in real login details.
// Nothing a visitor types in is stored.
//
// The app shows the customer's own view of the same data the employees see
// in the Klantbeeld, in customer language. It only reads.
import { openDatabase } from '../shared/db.js';
import { formatAddress, getCustomer, getModemCheck } from '../shared/queries.js';
import { cookie, newSession, registerFailure, sessionId, tooManyFailures } from '../shared/session.js';
import { formatEuro, formatStamp, world } from '../shared/world.js';
import { cookies, readJson, routesOf, serve } from '../shared/web.js';

const PORT = Number(process.env.PORT ?? 3004);
const COOKIE = 'vv_mijn';
const DAY = 24 * 60 * 60;
const { db } = openDatabase('mijn');

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
  const view = connectionView(check);
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
    'POST /api/mijn/logout': logout,
    'GET /api/mijn/overzicht': overview,
    'POST /api/mijn/herstart': restart,
  }),
  notFound: () => JSON.stringify({ error: 'Niet gevonden' }),
});
