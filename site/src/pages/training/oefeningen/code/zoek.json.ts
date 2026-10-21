// Search index for the code browser: every file with its lines. Built once,
// searched in the browser by /assets/code.js (no server needed).
import { getCodeFiles } from '../../../../code';

export function GET() {
  return new Response(JSON.stringify(getCodeFiles().map((f) => ({ p: f.path, l: f.lines }))), {
    headers: { 'Content-Type': 'application/json' },
  });
}
