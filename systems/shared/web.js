// Tiny web layer shared by the fake systems.
//
// Why no framework: two small screens do not need Express or React, and
// fewer dependencies means fewer updates and less to explain. Pages are
// rendered on the server as plain HTML, without inline scripts or styles,
// so they work with the same strict Content-Security-Policy as methodica.nl.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { ROOT, world } from './world.js';

const CSS = fs.readFileSync(path.join(ROOT, 'systems', 'shared', 'systems.css'));
const FAVICON = fs.readFileSync(path.join(ROOT, 'site', 'public', 'favicon.svg'));

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

/** Marks a string as already-safe HTML so html`` does not escape it again. */
export class Safe { constructor(value) { this.value = value; } toString() { return this.value; } }
export const raw = (value) => new Safe(value);

/** Tagged template that escapes every interpolated value unless it is Safe (or an array of Safe). */
export function html(strings, ...values) {
  const out = strings.reduce((acc, s, i) => {
    const v = values[i - 1];
    const rendered = Array.isArray(v) ? v.map((x) => (x instanceof Safe ? x.value : esc(x))).join('')
      : v instanceof Safe ? v.value : esc(v);
    return acc + rendered + s;
  });
  return new Safe(out);
}

/** Page frame with the fictional-company notice and the frozen world clock. */
export function page({ base, system, title, body, links = [] }) {
  return html`<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>${title} | ${system} | ${world.company}</title>
  <link rel="icon" href="${base}/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="${base}/assets/systems.css">
</head>
<body>
  <div class="fictief" role="note">Oefenomgeving van Methodica. ${world.company} is een fictief bedrijf; alle gegevens zijn verzonnen.</div>
  <header class="balk">
    <a class="systeem" href="${base}/">${system}</a>
    <nav aria-label="Systemen">${links.map((l) => html`<a href="${l.href}">${l.label}</a>`)}</nav>
    <span class="klok" title="De klok in de oefenwereld staat stil">${world.clockLabel} · ${world.city} ${world.district}</span>
  </header>
  <main>${body}</main>
</body>
</html>`.value;
}

/** Reads a small urlencoded form body (max 20 kB). */
export function readForm(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 20_000) { reject(new Error('Body too large')); req.destroy(); }
    });
    req.on('end', () => resolve(new URLSearchParams(data)));
    req.on('error', reject);
  });
}

/**
 * Starts a server. `routes` maps 'METHOD /path' to a handler that returns
 * { status?, type?, body }. BASE_PATH lets the app live under a prefix
 * (e.g. /klantbeeld) behind the gateway, and at the root when run locally.
 */
export function serve({ port, base, routes, notFound }) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let pathname = url.pathname;
    if (base && pathname.startsWith(base)) pathname = pathname.slice(base.length) || '/';
    const send = (status, type, body) => {
      res.writeHead(status, {
        'Content-Type': type,
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'same-origin',
        'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; form-action 'self'; frame-ancestors 'self'",
      });
      res.end(body);
    };
    try {
      if (pathname === '/assets/systems.css') return send(200, 'text/css; charset=utf-8', CSS);
      if (pathname === '/favicon.svg') return send(200, 'image/svg+xml', FAVICON);
      if (pathname === '/health') return send(200, 'text/plain', 'ok');
      const handler = routes[`${req.method} ${pathname}`] ?? findPatternRoute(routes, req.method, pathname);
      if (!handler) return send(404, 'text/html; charset=utf-8', notFound());
      const result = await handler.fn({ req, url, params: handler.params ?? {} });
      send(result.status ?? 200, result.type ?? 'text/html; charset=utf-8', result.body);
    } catch (err) {
      console.error(err);
      send(500, 'text/plain; charset=utf-8', 'Er ging iets mis in het systeem.');
    }
  });
  server.listen(port, '0.0.0.0', () => console.log(`listening on http://localhost:${port}${base || '/'}`));
  return server;
}

// Supports routes like 'GET /klant/:id'.
function findPatternRoute(routes, method, pathname) {
  for (const [key, { fn }] of Object.entries(routes)) {
    const [m, pattern] = key.split(' ');
    if (m !== method || !pattern.includes(':')) continue;
    const names = [];
    const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, n) => { names.push(n); return '([^/]+)'; }) + '/?$');
    const match = pathname.match(re);
    if (match) return { fn, params: Object.fromEntries(names.map((n, i) => [n, decodeURIComponent(match[i + 1])])) };
  }
  return null;
}

// Wrap plain route functions so serve() can treat them uniformly.
export const routesOf = (map) => Object.fromEntries(Object.entries(map).map(([k, fn]) => [k, { fn }]));
