// The company documents of Vezelvriend, for the documents page (step 2 of the
// context ladder: "you choose the documents"). Participants download them as
// plain text and put them in their own AI (add a file, or a notebook).
//
// Read from data/ at build time, so there is one copy of each document.
// The descriptions are neutral on purpose: they never hint at what is wrong.
import callGuide from '../../data/documents/call-guide.json';

const raw = import.meta.glob(['../../data/documents/*.md', '../../data/mail/*.md', '../../data/backlog/*.md'],
  { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const file = (name: string) => Object.entries(raw).find(([key]) => key.endsWith(name))?.[1] ?? '';

/** Markdown to readable plain text: drop the bold markers, keep the structure. */
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
  return [
    { slug: 'gespreksleidraad', kind: 'Klantenservice', title: 'Gespreksleidraad', about: 'De stappen voor een gesprek met een klant die een probleem met internet meldt.', text: guideText },
    { slug: 'servicevoorwaarden', kind: 'Voorwaarden', title: 'Servicevoorwaarden', about: 'Hersteltijden, monteursbezoek en vergoedingen.', text: plain(file('service-document.md')) },
    { slug: 'tarieven', kind: 'Verkoop', title: 'Tarievenoverzicht internet voor thuis', about: 'Abonnementen, extra\'s en eenmalige kosten.', text: plain(file('rates-2025.md')) },
    { slug: 'ai-beleid', kind: 'Beleid', title: 'AI-beleid', about: 'Welke AI je mag gebruiken, welke gegevens je meegeeft en wat je met de uitkomst doet.', text: plain(file('ai-policy.md')) },
    { slug: 'us-014', kind: 'Backlog', title: 'User story US-014', about: 'Hersteltijd noemen bij een storing in de straat.', text: plain(file('US-014-outage-repair-time.md')) },
    { slug: 'mail-sanne-us-014', kind: 'Mail', title: 'Mail van Sanne over US-014', about: 'Mail van de product owner aan het productteam, 14 oktober.', text: plain(file('2026-10-14-sanne-us-014.md')) },
    { slug: 'klantverhaal-de-wit', kind: 'Klant', title: 'Klantverhaal Familie De Wit', about: 'Wat de klant vertelt over het gesprek met de klantenservice.', text: plain(file('customer-story-de-wit.md')) },
  ];
}
