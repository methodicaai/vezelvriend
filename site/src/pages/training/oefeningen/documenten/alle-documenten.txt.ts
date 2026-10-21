// All company documents in one plain text file, for participants who would
// rather add one file to their AI than download seven.
import { getDocuments } from '../../../../documents';

export function GET() {
  const text = getDocuments().map((d) => `===== ${d.title} (${d.kind}) =====\n\n${d.text}`).join('\n\n');
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
