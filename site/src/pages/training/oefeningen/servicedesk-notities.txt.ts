// The servicedesk notes of step 7 as a plain text file, so participants
// do not need SQL to get them. Built from the same seed as the Klantsysteem
// (the generated world when it exists), one note per line.
import notes from '../../../../../data/seed/support_log.json';

interface Note { log_id: string; logged_at: string; agent: string; customer_id: string | null; category: string; free_text: string }

export function GET() {
  const lines = (notes as Note[]).map((n) => [n.log_id, n.logged_at, n.agent, n.customer_id ?? '-', n.category, n.free_text].join(' | '));
  const text = ['Servicedesk Vezelvriend, notities van vrijdag 16-10-2026', 'Kolommen: nummer | tijd | medewerker | klant | categorie | notitie', '', ...lines, ''].join('\n');
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
