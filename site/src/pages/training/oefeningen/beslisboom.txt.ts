// The decision tree as a plain text file, to paste into a prompt (step 6,
// prompt B) or give to an AI. Same source as the systems page and the repo.
import tree from '../../../../../docs/decision-tree.md?raw';

const plain = (md: string) => md.replace(/\*\*(.+?)\*\*/g, '$1').trim() + '\n\nFictief document, bedacht voor de training.\n';

export function GET() {
  return new Response(plain(tree), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
