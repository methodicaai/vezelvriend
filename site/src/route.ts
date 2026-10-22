// The route of the exercises: ten steps, in order. One list for the route page
// (/training/oefeningen/), the line at the top of every step (step, ladder step,
// time) and the button to the next step at the bottom, so the numbers, titles
// and times can never disagree between pages.
//
// trede: the steps of the context ladder an exercise practises. Only their
// name is shown on the exercise ("Trede 2 · Zelf plakken"); the ladder itself
// is explained once, in step 2.
// core: part of the short route (about an hour).
import { steps as ladder } from './contexttrap';

export interface Link { href: string; label: string }
export interface RouteStep {
  nr: number; title: string; href: string; kind: string; time: string; text: string;
  trede?: number[]; core?: boolean; links?: Link[];
}

const O = '/training/oefeningen';

export const route: RouteStep[] = [
  { nr: 1, title: 'Wat kan AI voor jou?', href: `${O}/wat-kan-ai/`, kind: 'Begin hier', time: '20 minuten', core: true,
    text: 'Kies een taak uit je eigen werk en zoek uit welke AI je hebt.' },
  { nr: 2, title: 'De contexttrap', href: `${O}/contexttrap/`, kind: 'Uitleg', time: '20 minuten', core: true,
    text: 'Vijf manieren waarop context bij een AI komt, elk met een zwak en een sterk voorbeeld.' },
  { nr: 3, title: 'De systemen van Vezelvriend', href: `${O}/systemen/`, kind: 'Kennismaken', time: '15 minuten',
    text: 'Je krijgt een eigen klant en zoekt die op in de systemen. Daarna weet je waar je wat vindt.' },
  { nr: 4, title: 'Context maakt het verschil', href: `${O}/04-context/`, kind: 'Oefening', time: '30 minuten', trede: [1, 2], core: true,
    text: 'Dezelfde klantvraag, eerst kaal en daarna met gegevens die je zelf uit de systemen haalt.' },
  { nr: 5, title: 'Wat mag er naar de AI?', href: `${O}/05-wat-mag-erin/`, kind: 'Oefening', time: '50 minuten', trede: [2],
    text: 'Vijftig notities van de servicedesk: wat geef je aan de AI, en wat niet? Daarna twaalf situaties: groen, oranje of rood?' },
  { nr: 6, title: 'Documenten van Vezelvriend', href: `${O}/documenten/`, kind: 'Oefening', time: '25 minuten', trede: [3],
    text: 'Geef de AI documenten van Vezelvriend en vraag ernaar. Kloppen je bronnen?' },
  { nr: 7, title: 'Claude zoekt zelf', href: `${O}/07-claude-zoekt-zelf/`, kind: 'Oefening', time: '25 minuten', trede: [4],
    text: 'Claude haalt alles zelf op en wil een monteur aanvragen. Wat komt er ongevraagd mee?' },
  { nr: 8, title: 'Guardrails schrijven', href: `${O}/08-guardrails/`, kind: 'Oefening', time: '30 minuten', trede: [5],
    text: 'Schrijf regels voor wat de AI wel en niet mag, en probeer ze te breken.' },
  { nr: 9, title: 'Verdiepen in je eigen vak', href: `${O}/verdiepen/`, kind: 'Naar je rol', time: '45 minuten per keuze',
    text: 'Kies wat bij je past: een user story (analist), testcases (tester), SQL of de code.',
    links: [
      { href: `${O}/verdiepen/#analist`, label: 'Analist' },
      { href: `${O}/verdiepen/#tester`, label: 'Tester' },
      { href: `${O}/verdiepen/#sql`, label: 'SQL' },
      { href: `${O}/verdiepen/#code`, label: 'Code' },
    ] },
  { nr: 10, title: 'Werkbladen', href: `${O}/werkbladen/`, kind: 'Eigen werk', time: '35 minuten', core: true,
    text: 'Je eigen taak uit stap 1 in je eigen AI, en je als-dan-kaart om mee af te sluiten.' },
];

export const stepNr = (nr: number) => route.find((s) => s.nr === nr)!;

/** "Trede 2 · Zelf plakken" or "Trede 1 en 2 · Kale vraag en zelf plakken". */
export function ladderLabel(nrs: number[] = []): string {
  if (nrs.length === 0) return '';
  const names = nrs.map((n) => ladder.find((l) => l.nr === n)!.name);
  const join = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} en ${xs.at(-1)}` : xs[0]);
  return `Trede ${join(nrs.map(String))} · ${join(names.map((n, i) => (i === 0 ? n : n.toLowerCase())))}`;
}

/** The line at the top of a step: "Stap 4 · Trede 1 en 2 · ... · ± 30 minuten". */
export function headLine(nr: number): string {
  const s = stepNr(nr);
  return [`Stap ${s.nr}`, s.trede ? ladderLabel(s.trede) : s.kind, `± ${s.time}`].join(' · ');
}
