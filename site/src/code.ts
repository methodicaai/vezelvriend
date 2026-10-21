// The source code of Vezelvriend, for the code browser at /training/oefeningen/code/.
//
// Why on the site and not only on GitHub: participants read the code next to
// the website and the systems, and compare what a page promises with what the
// code really checks. Behind the participant login, like the exercises.
//
// Read at build time (Vite "?raw"), so the browser shows exactly the code of
// this build. Left out on purpose:
// - data/seed and data/generated: customer data (on the server: real addresses),
//   participants look at that through the Klantsysteem;
// - tools/: builds the training scenarios, so it would give the exercises away;
// - exercises/: already on the site; trainer-private/: never public.
const raw = import.meta.glob([
  '../../README.md',
  '../../docker-compose.yml',
  '../../config/*.json',
  '../../data/README.md',
  '../../data/schema.sql',
  '../../data/products.json',
  '../../data/documents/*',
  '../../data/mail/*',
  '../../data/backlog/*',
  '../../docs/*.md',
  '../../systems/**/*.js',
  '../../systems/**/package.json',
  '../../systems/**/Dockerfile',
  '../../gateway/*',
  '../../site/astro.config.mjs',
  '../../site/src/**/*.{astro,ts}',
  '../../site/public/vv/*.js',
  '../../site/public/app/*.js',
  '../../site/public/assets/*.js',
  '!**/node_modules/**',
], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export const GITHUB = 'https://github.com/methodicaai/vezelvriend/blob/main/';

export interface CodeFile { path: string; folder: string; name: string; text: string; lines: string[] }

/** Glob keys are relative to this file (site/src/): turn them into paths from the repo root. */
function fromRoot(key: string) {
  const parts = ['site', 'src'];
  for (const part of key.split('/')) {
    if (part === '..') parts.pop();
    else if (part !== '.') parts.push(part);
  }
  return parts.join('/');
}

export function getCodeFiles(): CodeFile[] {
  return Object.entries(raw)
    .map(([key, text]) => {
      const path = fromRoot(key);
      const cut = path.lastIndexOf('/');
      return { path, folder: cut < 0 ? '' : path.slice(0, cut), name: path.slice(cut + 1), text, lines: text.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n') };
    })
    .sort((a, b) => a.folder.localeCompare(b.folder) || a.name.localeCompare(b.name));
}

/** What each folder is for, in plain Dutch for participants. */
export const FOLDERS: Record<string, string> = {
  '': 'Uitleg en de opbouw van alle onderdelen (Docker Compose).',
  'config': 'Instellingen van de oefenwereld: stad, wijk en de klok die stilstaat.',
  'data': 'Het databaseschema, de producten en regels van de pakket-samensteller.',
  'data/documents': 'Documenten van het bedrijf: belleidraad, servicedocument, klantverhaal.',
  'data/mail': 'Mails tussen collega\'s.',
  'data/backlog': 'User stories.',
  'docs': 'Documentatie voor beheer en ontwikkeling.',
  'gateway': 'De voordeur: nginx stuurt elk verzoek naar het juiste systeem.',
  'systems/shared': 'Code die alle systemen delen: database, sessies, webpagina\'s, bestellingen.',
  'systems/klantsysteem': 'Het Klantsysteem: klantenlijst en het SQL-scherm.',
  'systems/klantbeeld': 'Het Klantbeeld: het scherm van de servicemedewerker.',
  'systems/mijn': 'De achterkant van de website en de app: adrescheck, bestellen, inloggen.',
  'systems/ai': 'De AI-box: deelnemerscodes, vragen aan de AI en het trainerscherm.',
  'site/src/pages': 'De pagina\'s van de website en de training.',
  'site/public/vv': 'Scripts van de bedrijfswebsite, zoals de pakket-samensteller.',
  'site/public/app': 'De app Mijn Vezelvriend.',
};
