// Facts the company website shows, read from the same files the systems use
// (config/world.json and data/seed/*.json). One source means the website and
// the Klantbeeld never disagree about prices or outages, unless that is
// deliberately part of an exercise.
import world from '../../config/world.json';
import addresses from '../../data/seed/addresses.json';
import areaStatus from '../../data/seed/area_status.json';
import contracts from '../../data/seed/contracts.json';

export { world };

/** '2026-10-17 08:40' -> '08:40' */
export const timeOf = (stamp: string) => stamp.split(' ')[1] ?? stamp;

/** The plans on sale, derived from the contracts (one entry per product). */
export function getPlans() {
  const seen = new Map<string, { product: string; download: number; upload: number; fee: number; business: boolean }>();
  for (const c of contracts) {
    if (!seen.has(c.product)) {
      seen.set(c.product, {
        product: c.product,
        download: c.download_mbps,
        upload: c.upload_mbps,
        fee: c.monthly_fee_eur,
        business: c.product.startsWith('Zakelijk'),
      });
    }
  }
  return [...seen.values()].sort((a, b) => Number(a.business) - Number(b.business) || a.download - b.download);
}

/** Current outages with the streets on the affected network segment. */
export function getOutages() {
  return areaStatus
    .filter((a) => a.status === 'storing')
    .map((a) => ({
      ...a,
      streets: [...new Set(addresses.filter((ad) => ad.network_segment === a.network_segment).map((ad) => ad.street))],
    }));
}

export const euro = (amount: number) =>
  new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount);
