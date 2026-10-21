// The company documents as plain text, for the AI connection (systems/koppeling).
// The list is data/documents/index.json, shared with the documents page of the
// site (site/src/documents.ts), so both offer exactly the same documents.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './world.js';

const DATA = path.join(ROOT, 'data');
const index = JSON.parse(fs.readFileSync(path.join(DATA, 'documents', 'index.json'), 'utf8')).documents;

/** Markdown to readable plain text: drop the bold markers, keep the structure. Same rule as the site. */
const plain = (md) => md.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^\*(.+)\*$/gm, '$1').trim() + '\n';

function textOf(doc) {
  const source = fs.readFileSync(path.join(DATA, doc.file), 'utf8');
  if (!doc.file.endsWith('call-guide.json')) return plain(source);
  const guide = JSON.parse(source);
  return [guide.title, `Versie: ${guide.version}`, '', ...guide.steps.map((s, i) => `${i + 1}. ${s.title}. ${s.text}`),
    '', 'Fictief document, bedacht voor de training.'].join('\n') + '\n';
}

export const listDocuments = () => index.map(({ slug, kind, title, about }) => ({ slug, kind, title, about }));

export function readDocument(slug) {
  const doc = index.find((d) => d.slug === slug);
  return doc ? { slug: doc.slug, title: doc.title, text: textOf(doc) } : null;
}
