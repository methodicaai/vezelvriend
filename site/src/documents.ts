// The company documents of Vezelvriend, for step 8 ("Documenten van
// Vezelvriend"). Participants open them as a page in the Vezelvriend house
// style (components/DocumentLayout.astro), give them to the chat next to the
// exercise, or download them as plain text for their own AI.
//
// The list lives in data/documents/index.json, shared with the AI connection
// (systems/koppeling), so the site and the connection offer the same documents.
import index from '../../data/documents/index.json';
import callGuide from '../../data/documents/call-guide.json';

const raw = import.meta.glob(['../../data/documents/*.md', '../../data/mail/*.md', '../../data/backlog/*.md'],
  { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const rendered = import.meta.glob(['../../data/documents/*.md', '../../data/mail/*.md', '../../data/backlog/*.md'],
  { eager: true }) as Record<string, any>;
const find = <T>(all: Record<string, T>, name: string) => Object.entries(all).find(([key]) => key.endsWith(name))?.[1];

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

export interface CompanyDocument {
  slug: string; kind: string; title: string; text: string; about: string;
  /** The rendered Markdown, or null for the call guide (shown as a numbered list). */
  Content: any | null;
}

export const guide = callGuide as { title: string; version: string; steps: { title: string; text: string }[] };

export function getDocuments(): CompanyDocument[] {
  return index.documents.map((d) => {
    const name = d.file.split('/').pop()!;
    const isGuide = d.file.endsWith('call-guide.json');
    return {
      slug: d.slug, kind: d.kind, title: d.title, about: d.about,
      text: isGuide ? guideText : plain(find(raw, name) ?? ''),
      Content: isGuide ? null : find(rendered, name)?.Content ?? null,
    };
  });
}
