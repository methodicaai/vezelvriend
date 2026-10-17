// Starts both systems without Docker (for local development).
// With Docker, docker-compose.yml starts each system in its own container.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

// Fixed ports so the two systems never fight over an inherited PORT variable.
const PORTS = { klantsysteem: 3001, klantbeeld: 3002 };

for (const [app, port] of Object.entries(PORTS)) {
  const child = spawn(process.execPath, [path.join(here, app, 'server.js')], { stdio: ['ignore', 'pipe', 'inherit'], env: { ...process.env, PORT: String(port) } });
  child.stdout.on('data', (d) => process.stdout.write(`[${app}] ${d}`));
  child.on('exit', (code) => { console.error(`[${app}] stopped (${code})`); process.exit(code ?? 1); });
}
