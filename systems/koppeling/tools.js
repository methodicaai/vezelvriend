// The tools an AI may use to look things up in the Vezelvriend systems
// (step 3 and 4 of the context ladder: the AI fetches context itself).
//
// Two modes, so participants can compare:
// - "zuinig" (frugal): only what a decision needs. No names of other
//   residents, no phone, e-mail or bank details, no SQL.
// - "breed" (broad): everything the systems hold, the way many real
//   connections are built. Participants should notice what comes along.
//
// One action: requesting a technician. It never happens directly: it creates
// a request that a person must approve (in the chat, or in the Klantbeeld).
// Tool names and descriptions are in Dutch: participants see them.
import fs from 'node:fs';
import path from 'node:path';
import { listDocuments, readDocument } from '../shared/documents.js';
import { formatAddress, getAddressHistory, getCustomer, getModemCheck, searchCustomers } from '../shared/queries.js';
import { ROOT, world } from '../shared/world.js';
import { runQuery } from '../klantsysteem/sql-runner.js';
import { createRequest } from './requests.js';

const DECISION_TREE = fs.readFileSync(path.join(ROOT, 'docs', 'decision-tree.md'), 'utf8');
const SQL_ROWS_FOR_AI = 100;

const customerArg = { klantnummer: { type: 'string', description: 'Klantnummer, bijvoorbeeld K-1004' } };
const schema = (properties = {}, required = Object.keys(properties)) => ({ type: 'object', properties, required, additionalProperties: false });

class ToolError extends Error {}
function customerOrFail(db, id) {
  const c = getCustomer(db, String(id ?? '').trim().toUpperCase());
  if (!c) throw new ToolError(`Klant ${id} bestaat niet. Zoek eerst met zoek_klanten.`);
  return c;
}

export const TOOLS = [
  {
    name: 'zoek_klanten',
    description: 'Zoek klanten op naam, klantnummer, straat of postcode. Geeft maximaal 20 klanten.',
    input_schema: schema({ zoekterm: { type: 'string', description: 'Naam, klantnummer, straat of postcode' } }),
    run: ({ db, args, stand }) => searchCustomers(db, String(args.zoekterm ?? '')).slice(0, 20).map((c) => ({
      klantnummer: c.customer_id, naam: c.name, adres: formatAddress(c), status: c.status,
      ...(stand === 'breed' ? { telefoon: c.phone, email: c.email } : {}),
    })),
  },
  {
    name: 'klantbeeld',
    description: 'De klantgegevens en het contract van één klant.',
    input_schema: schema(customerArg),
    run: ({ db, args, stand }) => {
      const c = customerOrFail(db, args.klantnummer);
      const base = {
        klantnummer: c.customer_id, soort_klant: c.customer_type, status: c.status, klant_sinds: c.customer_since,
        contract: c.product ? { product: c.product, snelheid_mbps: c.download_mbps, sinds: c.contract_start } : null,
      };
      if (stand !== 'breed') return base;
      return {
        ...base, naam: c.name, adres: formatAddress(c), telefoon: c.phone, email: c.email,
        geboortedatum: c.birth_date ?? null, iban: c.iban ?? null, openstaand_bedrag_eur: c.open_balance_eur,
        einddatum: c.end_date, maandbedrag_eur: c.monthly_fee_eur,
      };
    },
  },
  {
    name: 'modem_controleren',
    description: 'Controleer het modem van een klant: laatste meting, straatstatus, laatste herstart, firmware en of andere aansluitingen in de straat offline zijn. Zelfde gegevens als de knop "Modem controleren" in het Klantbeeld.',
    input_schema: schema(customerArg),
    run: ({ db, args, stand }) => {
      const c = customerOrFail(db, args.klantnummer);
      const check = getModemCheck(db, c.customer_id);
      if (!check) return { klantnummer: c.customer_id, modem: null, melding: 'Geen modem gekoppeld aan deze klant.' };
      const m = check.measurement;
      return {
        nu: world.clockLabel,
        klantnummer: c.customer_id,
        laatste_meting: m ? { tijd: m.measured_at, minuten_geleden: check.measurementAgeMinutes, status: m.status, sessie: m.session, download_mbps: m.download_mbps, upload_mbps: m.upload_mbps } : null,
        contract_snelheid_mbps: check.contract?.download_mbps ?? null,
        straatstatus: check.area ? { status: check.area.status, sinds: check.area.since, ticket: check.area.ticket_id, omschrijving: check.area.description } : null,
        andere_aansluitingen_offline: check.offlineNeighbours,
        laatste_herstart: check.restart ? { tijd: check.restart.requested_at, resultaat: check.restart.result } : null,
        firmware: { versie: check.modem.firmware, nieuwste: check.firmwareLatest },
        ...(stand === 'breed' ? { modem: { model: check.modem.model, serienummer: check.modem.serial_number, mac_adres: check.modem.mac_address }, netwerksegment: c.network_segment } : {}),
      };
    },
  },
  {
    name: 'historie_op_adres',
    description: 'Contactmomenten en tickets bij een klant, nieuwste eerst.',
    input_schema: schema(customerArg),
    run: ({ db, args, stand }) => {
      const c = customerOrFail(db, args.klantnummer);
      // Broad: everything at the address, also from earlier residents (as the Klantbeeld shows it).
      // Frugal: only this customer's own history.
      const items = getAddressHistory(db, c.address_id).filter((i) => stand === 'breed' || i.customer_id === c.customer_id);
      return items.map((i) => ({
        datum: i.at, kanaal: i.channel, richting: i.direction, onderwerp: i.subject, samenvatting: i.summary,
        ...(stand === 'breed' ? { klant: `${i.customer_name} (${i.customer_id})` } : {}),
      }));
    },
  },
  {
    name: 'storingen',
    description: 'De storingen die nu in het netwerk spelen, met de straten die erbij horen.',
    input_schema: schema(),
    run: ({ db }) => db.prepare("SELECT * FROM area_status WHERE status = 'storing'").all().map((a) => ({
      sinds: a.since, ticket: a.ticket_id, omschrijving: a.description,
      straten: db.prepare('SELECT DISTINCT street FROM addresses WHERE network_segment = ?').all(a.network_segment).map((r) => r.street),
    })),
  },
  {
    name: 'beslisboom',
    description: 'De werkwijze van de klantenservice bij "mijn internet doet het niet".',
    input_schema: schema(),
    run: () => ({ beslisboom: DECISION_TREE }),
  },
  {
    name: 'documenten',
    description: 'De lijst met bedrijfsdocumenten (leidraad, voorwaarden, tarieven, beleid, backlog, mail). Lees er een met document_lezen.',
    input_schema: schema(),
    run: () => listDocuments(),
  },
  {
    name: 'document_lezen',
    description: 'Lees één bedrijfsdocument helemaal.',
    input_schema: schema({ document: { type: 'string', description: 'De code van het document uit de lijst van documenten, bijvoorbeeld servicevoorwaarden' } }),
    run: ({ args }) => {
      const doc = readDocument(String(args.document ?? '').trim().toLowerCase());
      if (!doc) throw new ToolError(`Document ${args.document} bestaat niet. Vraag de lijst op met documenten.`);
      return doc;
    },
  },
  {
    name: 'sql',
    description: 'Stel een SQL-vraag (alleen SELECT) aan de database van het Klantsysteem. Tabellen: addresses, customers, contracts, modems, modem_measurements, remote_restarts, area_status, tickets, contacts, network_map, support_log, orders. Maximaal 100 rijen.',
    input_schema: schema({ query: { type: 'string', description: 'Eén SELECT-vraag' } }),
    stands: ['breed'],
    run: async ({ dbFile, args }) => {
      const result = await runQuery(dbFile, String(args.query ?? ''));
      if (result.error) throw new ToolError(result.error);
      return { kolommen: result.columns, rijen: result.rows.slice(0, SQL_ROWS_FOR_AI), afgekapt: result.rows.length > SQL_ROWS_FOR_AI || result.truncated };
    },
  },
  {
    name: 'monteur_inplannen',
    description: 'Vraag een monteursbezoek aan voor een klant. Er wordt NIETS ingepland zonder dat een medewerker het verzoek eerst goedkeurt.',
    input_schema: schema({ ...customerArg, reden: { type: 'string', description: 'Waarom een monteur nodig is, in één of twee zinnen' } }),
    approval: true,
    run: ({ db, args, source }) => {
      const c = customerOrFail(db, args.klantnummer);
      const request = createRequest({ customerId: c.customer_id, reason: String(args.reden ?? '').slice(0, 500), source });
      return {
        verzoek: request.id, klantnummer: c.customer_id, status: request.status, voorgestelde_tijd: request.slot,
        uitleg: 'Het verzoek wacht op goedkeuring door een medewerker. Er is nog niets ingepland.',
      };
    },
  },
];

export const toolsFor = (stand) => TOOLS.filter((t) => !t.stands || t.stands.includes(stand));

/** Runs a tool. Returns { result } or { error } (a message the AI can act on). */
export async function callTool({ name, args, stand, db, dbFile, source }) {
  const tool = toolsFor(stand).find((t) => t.name === name);
  if (!tool) return { error: `Het gereedschap ${name} bestaat niet${name === 'sql' ? ' in de stand "zuinig"' : ''}.` };
  try {
    return { result: await tool.run({ db, dbFile, args: args ?? {}, stand, source }) };
  } catch (err) {
    if (err instanceof ToolError) return { error: err.message };
    console.error(err);
    return { error: 'Er ging iets mis in de koppeling.' };
  }
}

