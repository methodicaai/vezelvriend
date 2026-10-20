// Signed session cookies, shared by the AI box and the customer app.
//
// The cookie holds a small value (an id and an expiry time) plus an HMAC
// signature, so a visitor cannot change it without the server noticing.
// SESSION_SECRET comes from .env on the server; without it a random secret is
// used, which only means that everybody logs in again after a restart.
import crypto from 'node:crypto';

const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.SESSION_SECRET) console.warn('SESSION_SECRET not set: sessions end on restart');
const SECURE = process.env.COOKIE_SECURE !== '0';

export const sign = (value) => `${value}.${crypto.createHmac('sha256', SECRET).update(value).digest('base64url')}`;

export function unsign(signed) {
  const i = (signed ?? '').lastIndexOf('.');
  if (i < 0) return null;
  const value = signed.slice(0, i);
  const expected = Buffer.from(sign(value));
  const given = Buffer.from(signed);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given) ? value : null;
}

/** Set-Cookie header value; maxAge 0 deletes the cookie. */
export const cookie = (name, value, maxAge) =>
  `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${SECURE ? '; Secure' : ''}`;

/** Creates a signed "id:expiresAt" value valid for `seconds`. */
export const newSession = (id, seconds) => sign(`${id}:${Date.now() + seconds * 1000}`);

/** Returns the id from a signed session value, or null when invalid or expired. */
export function sessionId(signed) {
  const value = unsign(signed);
  if (!value) return null;
  const [id, expires] = value.split(':');
  return id && Number(expires) > Date.now() ? id : null;
}

// Brake on guessing (codes, passwords, customer logins), in memory.
//
// Only FAILED attempts count, per IP address and per kind of login. Why: a
// whole training group often shares one IP address (the office network), so
// counting every login would lock out the group; counting failures still stops
// someone from guessing. nginx has its own, coarser limit in front of this.
const failures = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const ipOf = (req) => String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress).split(',')[0].trim();

function recent(key) {
  const now = Date.now();
  const list = (failures.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  failures.set(key, list);
  return list;
}

/** True when this IP had `max` or more failed attempts of this kind in the last 15 minutes. */
export function tooManyFailures(req, kind, max) {
  return recent(`${kind}:${ipOf(req)}`).length >= max;
}

/** Records one failed attempt of this kind for this IP. */
export function registerFailure(req, kind) {
  recent(`${kind}:${ipOf(req)}`).push(Date.now());
}
