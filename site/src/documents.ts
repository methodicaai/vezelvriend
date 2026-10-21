// The company documents of Vezelvriend, for the documents page (step 2 of the
// context ladder: "you choose the documents"). Participants download them as
// plain text and put them in their own AI (add a file, or a notebook).
//
// The list lives in data/documents/index.json, shared with the AI connection
// (systems/koppeling), so the site and the connection offer the same documents.
import index from '../../data/documents/index.json';
import callGuide from '../../data/documents/call-guide.json';

const raw = import.meta.glob(['../../data/documents/*.md', '../../data/mail/*.md', '../../data/backlog/*.md'],
  { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const file = (name: string) => Object.entries(raw).find(([key]) => key.endsWith(name))?.[1] ?? '';

/** Markdown to readable plain text: drop the bold markers, keep the structure. Same rule as systems/shared/documents.js. */
const plain = (md: string) => md.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^\*(.+)\*$/gm, '$1').trim() + '\n';

const guideText = [
  callGuide.title,
  `Versie: ${callGuide.version}`,
  '',
  ...callGuide.steps.map((s: { title: string; text: string }, i: number) => `${i + 1}. ${s.title}. ${s.text}`),
  '',
  'Fictief document, bedacht voor de training.',
].join('\n') + '\n';

export interface CompanyDocument { slug: string; kind: string; title: string; text: string; about: string }

export function getDocuments(): CompanyDocument[] {
  return index.documents.map((d) => ({
    slug: d.slug, kind: d.kind, title: d.title, about: d.about,
    text: d.file.endsWith('call-guide.json') ? guideText : plain(file(d.file.split('/').pop()!)),
  }));
}
