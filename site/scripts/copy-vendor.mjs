// Copies the map library (Leaflet) from node_modules to public/vendor/, so the
// site serves it itself: no external CDN, which the Content-Security-Policy
// would block and which would tell a third party who visits the site.
import fs from 'node:fs';

const from = new URL('../node_modules/leaflet/dist/', import.meta.url);
const to = new URL('../public/vendor/leaflet/', import.meta.url);
fs.mkdirSync(to, { recursive: true });
for (const file of ['leaflet.js', 'leaflet.css']) fs.copyFileSync(new URL(file, from), new URL(file, to));
