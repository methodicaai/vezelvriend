// Local stand-in for the nginx gateway (gateway/nginx.conf), for running
// everything without Docker: serves the built site from site/dist and
// forwards the same paths to the systems as nginx does on the server.
// Development only: no rate limits or security headers here.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(here, '..', 'site', 'dist');
const PORT = Number(process.env.PORT ?? 8080);
const ROUTES = [
  ['/klantsysteem/', 3001],
  ['/klantbeeld/', 3002],
  ['/api/ai/', 3003],
  ['/trainer/', 3003],
];
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain' };

http.createServer((req, res) => {
  const route = ROUTES.find(([prefix]) => req.url.startsWith(prefix));
  if (route) {
    const upstream = http.request({ host: '127.0.0.1', port: route[1], path: req.url, method: req.method, headers: req.headers }, (up) => {
      res.writeHead(up.statusCode, up.headers);
      up.pipe(res);
    });
    upstream.on('error', () => { res.writeHead(502); res.end('System not running'); });
    return req.pipe(upstream);
  }
  let file = path.join(DIST, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(DIST)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404, { 'Content-Type': TYPES['.html'] }); return res.end(fs.readFileSync(path.join(DIST, '404.html'))); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`gateway on http://localhost:${PORT}`));
