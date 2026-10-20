// Fetches all addresses of one city district from the BAG, via the public
// PDOK Locatieserver (no API key needed), and saves them as a snapshot.
//
//   node tools/world/fetch-bag.mjs --city Breda --district centrum
//
// Why a snapshot instead of live calls: a training must not depend on an
// external service, every group must see the same data, and a snapshot is
// fast. Run this again only when you switch city or want fresh data.
//
// The snapshot goes to data/generated/ (in .gitignore): real addresses stay
// on the server and never end up in the public repository.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const API = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1/free';
const PAGE = 100;            // PDOK returns at most 100 rows per request
const MAX_START = 10_000;    // and cannot page further than this
const FIELDS = 'nummeraanduiding_id,adresseerbaarobject_id,openbareruimte_id,straatnaam,huisnummer,huisletter,huisnummertoevoeging,postcode,woonplaatsnaam,gemeentenaam,wijkcode,wijknaam,buurtcode,buurtnaam,centroide_ll';

const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean)
  .map((a) => { const [k, ...v] = a.trim().split(' '); return [k, v.join(' ')]; }));
const city = args.city;
const district = args.district;
if (!city || !district) {
  console.error('Gebruik: node tools/world/fetch-bag.mjs --city Breda --district centrum');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// params: list of [key, value] pairs, because PDOK wants filters as repeated "fq" keys.
async function query(params, attempt = 1) {
  const url = `${API}?${new URLSearchParams(params)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    // A 4xx means the question itself is wrong: retrying will not help.
    if (res.status >= 400 && res.status < 500) throw Object.assign(new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`), { fatal: true });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()).response;
  } catch (err) {
    if (err.fatal || attempt >= 8) throw new Error(`PDOK gaf geen antwoord (${err.message}) voor ${url}`);
    await sleep(Math.min(500 * 2 ** attempt, 10_000));
    return query(params, attempt + 1);
  }
}

// 1. Find the district code. City centres have different names per city
//    ("Breda centrum", "Centrum", "Binnenstad"), so match loosely and show the choices.
const wijken = (await query([['q', district], ['fq', 'type:wijk'], ['rows', String(PAGE)], ['fl', 'wijkcode,wijknaam,gemeentenaam']])).docs
  .filter((w) => w.gemeentenaam.toLowerCase() === city.toLowerCase());
const match = wijken.filter((w) => w.wijknaam.toLowerCase().includes(district.toLowerCase()));
if (match.length !== 1) {
  console.error(`Wijk "${district}" in ${city} niet eenduidig gevonden. Mogelijkheden:`);
  for (const w of wijken) console.error(`  ${w.wijknaam} (${w.wijkcode})`);
  process.exit(1);
}
const { wijkcode, wijknaam } = match[0];
console.log(`Wijk: ${wijknaam} (${wijkcode})`);

// 2. The neighbourhoods of the district, in one request. Fetching per
//    neighbourhood keeps every request under PDOK's paging limit.
const buurtDocs = [];
for (let start = 0; ; start += PAGE) {
  const r = await query([['q', '*'], ['fq', 'type:buurt'], ['fq', `gemeentenaam:${city}`], ['rows', String(PAGE)], ['start', String(start)], ['fl', 'buurtcode,buurtnaam,wijkcode']]);
  buurtDocs.push(...r.docs.filter((b) => b.wijkcode === wijkcode));
  if (start + PAGE >= r.numFound) break;
}
const buurten = [];
for (const b of buurtDocs) {
  const r = await query([['q', '*'], ['fq', 'type:adres'], ['fq', `buurtcode:${b.buurtcode}`], ['rows', '0']]);
  buurten.push({ buurtcode: b.buurtcode, buurtnaam: b.buurtnaam, count: r.numFound });
  console.log(`  ${b.buurtnaam}: ${r.numFound} adressen`);
}

function addressesIn(buurtcode, start) {
  return query([['q', '*'], ['fq', 'type:adres'], ['fq', `buurtcode:${buurtcode}`], ['rows', String(PAGE)],
    ['start', String(start)], ['fl', FIELDS], ['sort', 'nummeraanduiding_id asc']]);
}

console.log(`Buurten: ${buurten.length}`);
const addresses = [];
for (const b of buurten) {
  if (b.count > MAX_START + PAGE) console.warn(`Let op: buurt ${b.buurtcode} heeft ${b.count} adressen; alleen de eerste ${MAX_START + PAGE} worden opgehaald.`);
  for (let start = 0; start < Math.min(b.count, MAX_START + PAGE); start += PAGE) {
    const r = await addressesIn(b.buurtcode, start);
    for (const d of r.docs) {
      const [lon, lat] = (d.centroide_ll ?? '').replace(/^POINT\(|\)$/g, '').split(' ').map(Number);
      addresses.push({
        bag_id: d.nummeraanduiding_id,
        object_id: d.adresseerbaarobject_id,
        street_id: d.openbareruimte_id,
        street: d.straatnaam,
        house_number: d.huisnummer,
        house_letter: d.huisletter ?? null,
        house_suffix: d.huisnummertoevoeging ?? null,
        postcode: d.postcode,
        city: d.woonplaatsnaam,
        buurt: d.buurtnaam,
        lat, lon,
      });
    }
    process.stdout.write(`\r${addresses.length} adressen opgehaald`);
    await sleep(100); // be polite to a free public service
  }
}
console.log();

const unique = [...new Map(addresses.map((a) => [a.bag_id, a])).values()];
const out = path.join(ROOT, 'data', 'generated', 'bag.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({
  meta: { city, district, wijkcode, wijknaam, source: 'BAG via PDOK Locatieserver v3_1', fetched_at: new Date().toISOString(), count: unique.length },
  addresses: unique,
}));
console.log(`Opgeslagen: ${unique.length} adressen in ${path.relative(ROOT, out)}`);
