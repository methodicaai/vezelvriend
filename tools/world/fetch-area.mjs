// Fetches the outline of the training district and its neighbourhoods
// (CBS wijk and buurten) from the public PDOK Locatieserver, for the maps on
// the website ("Ons gebied", storingen, pakket samenstellen).
//
//   node tools/world/fetch-area.mjs
//
// Run after fetch-bag.mjs: it reads the district from data/generated/bag.json,
// so the map always shows the same area as the addresses. Writes
// data/generated/area.json. The outlines are public data (CBS) and contain no
// addresses or people.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const API = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1';
const bagFile = path.join(ROOT, 'data', 'generated', 'bag.json');
if (!fs.existsSync(bagFile)) {
  console.error('Eerst de adressen ophalen: node tools/world/fetch-bag.mjs --city ... --district ...');
  process.exit(1);
}
const { meta } = JSON.parse(fs.readFileSync(bagFile, 'utf8'));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function call(endpoint, params, attempt = 1) {
  const url = `${API}/${endpoint}?${new URLSearchParams(params)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (res.status >= 400 && res.status < 500) throw Object.assign(new Error(`HTTP ${res.status}`), { fatal: true });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()).response.docs;
  } catch (err) {
    if (err.fatal || attempt >= 8) throw new Error(`PDOK gaf geen antwoord (${err.message}) voor ${url}`);
    await sleep(Math.min(500 * 2 ** attempt, 10_000));
    return call(endpoint, params, attempt + 1);
  }
}

/** 'MULTIPOLYGON(((lon lat, ...)), ...)' -> [[[lat, lon], ...], ...] (outer rings and holes, as Leaflet wants them). */
function parseWkt(wkt) {
  return [...wkt.matchAll(/\(([^()]+)\)/g)].map(([, ring]) =>
    ring.split(',').map((pair) => { const [lon, lat] = pair.trim().split(/\s+/).map(Number); return [lat, lon]; }));
}

async function outline(type, code, field) {
  const [hit] = await call('free', [['q', '*'], ['fq', `type:${type}`], ['fq', `${field}:${code}`], ['fl', 'id'], ['rows', '1']]);
  if (!hit) throw new Error(`${type} ${code} niet gevonden`);
  const [doc] = await call('lookup', [['id', hit.id], ['fl', 'geometrie_ll']]);
  return parseWkt(doc.geometrie_ll);
}

const wijk = { code: meta.wijkcode, naam: meta.wijknaam, rings: await outline('wijk', meta.wijkcode, 'wijkcode') };
console.log(`Wijk: ${wijk.naam}`);

const buurten = [];
for (let start = 0; ; start += 100) {
  const docs = await call('free', [['q', '*'], ['fq', 'type:buurt'], ['fq', `gemeentenaam:${meta.city}`], ['fl', 'buurtcode,buurtnaam,wijkcode'], ['rows', '100'], ['start', String(start)]]);
  buurten.push(...docs.filter((b) => b.wijkcode === meta.wijkcode));
  if (docs.length < 100) break;
}
const result = { meta: { city: meta.city, wijkcode: meta.wijkcode, wijknaam: meta.wijknaam, source: 'CBS wijken en buurten via PDOK Locatieserver', fetched_at: new Date().toISOString() }, wijk, buurten: [] };
for (const b of buurten) {
  result.buurten.push({ code: b.buurtcode, naam: b.buurtnaam, rings: await outline('buurt', b.buurtcode, 'buurtcode') });
  console.log(`  ${b.buurtnaam}`);
}
fs.writeFileSync(path.join(ROOT, 'data', 'generated', 'area.json'), JSON.stringify(result));
console.log(`Opgeslagen: data/generated/area.json (${result.buurten.length} buurten)`);
