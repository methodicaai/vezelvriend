// The fictional world: company, city and a clock that never moves.
//
// Why a fixed clock: every participant must see the same situation. "Is this
// measurement older than 15 minutes?" only has one answer if "now" is the
// same for everyone, on every day the training runs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export const world = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'world.json'), 'utf8'));

/** "Now" in the fictional world, as 'YYYY-MM-DD HH:MM'. */
export const now = world.clock.replace('T', ' ');

// Timestamps are local wall-clock time without a time zone. Parsing both
// sides as UTC keeps the arithmetic simple and free of daylight-saving surprises.
function toMinutes(stamp) {
  return Date.parse(stamp.replace(' ', 'T') + ':00Z') / 60000;
}

/** Whole minutes from `stamp` until the world clock. */
export function minutesAgo(stamp, reference = now) {
  return Math.round(toMinutes(reference) - toMinutes(stamp));
}

/** '2026-10-17 07:12' -> '17-10-2026 07:12' (Dutch notation for the screens). */
export function formatStamp(stamp) {
  if (!stamp) return '';
  const [date, time = ''] = stamp.split(' ');
  const [y, m, d] = date.split('-');
  return `${d}-${m}-${y}${time ? ' ' + time : ''}`;
}

export function formatEuro(amount) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount);
}
