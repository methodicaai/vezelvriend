// Map data for the company website: outline of the service area, its
// neighbourhoods and where the current outage is. Built once per site build,
// read by /vv/kaart.js.
//
// The outlines come from data/generated/area.json (tools/world/fetch-area.mjs),
// the outage street from the BAG snapshot. Without them (the template world)
// the maps say they are not available.
import { getOutages, timeOf, world } from '../../world';

type Rings = [number, number][][];
const areaFiles = import.meta.glob('../../../../data/generated/area.json', { eager: true, import: 'default' }) as Record<string, any>;
const bagFiles = import.meta.glob('../../../../data/generated/bag.json', { eager: true, import: 'default' }) as Record<string, any>;

export function GET() {
  const area = Object.values(areaFiles)[0];
  const bag = Object.values(bagFiles)[0];
  if (!area) return new Response(JSON.stringify({ beschikbaar: false }), { headers: { 'Content-Type': 'application/json' } });

  // Every address on the streets of the outage, rounded to about a metre: enough to draw the street.
  const storingen = getOutages().map((o) => ({
    straten: o.streets,
    sinds: timeOf(o.since ?? ''),
    tekst: o.description,
    punten: (bag?.addresses ?? [])
      .filter((a: any) => o.streets.includes(a.street) && a.lat)
      .map((a: any) => [Math.round(a.lat * 1e5) / 1e5, Math.round(a.lon * 1e5) / 1e5]),
  }));

  return new Response(JSON.stringify({
    beschikbaar: true,
    naam: `${world.city} ${world.district}`,
    gebied: area.wijk.rings as Rings,
    buurten: area.buurten.map((b: any) => ({ naam: b.naam, rings: b.rings as Rings })),
    adressen: bag?.meta?.count ?? null,
    storingen,
  }), { headers: { 'Content-Type': 'application/json' } });
}
