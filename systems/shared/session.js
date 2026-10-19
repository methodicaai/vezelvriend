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

// Brake on guessing (codes, passwords, customer logins), per visitor, in memory.
// nginx has its own limit in front of this.
const attempts = new Map();
export function tooManyAttempts(req, max = 20, windowMs = 15 * 60 * 1000) {
  const ip = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress).split(',')[0].trim();
  const now = Date.now();
  const recent = (attempts.get(ip) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  attempts.set(ip, recent);
  return recent.length > max;
}
