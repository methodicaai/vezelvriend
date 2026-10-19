// Starts everything without Docker (for local development):
// the two fake systems, the AI box and a small gateway on http://localhost:8080
// that serves the built site (run `npm run --prefix site build` first).
// With Docker, docker-compose.yml starts each part in its own container.
//
// The AI box runs in test mode (fake answers) unless ANTHROPIC_API_KEY is set,
// stores its database in the OS temp folder, and uses the trainer password
// 'test' unless TRAINER_PASSWORD is set.
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

// Fixed ports so the parts never fight over an inherited PORT variable.
const APPS = {
  'klantsysteem/server.js': { PORT: '3001', BASE_PATH: '/klantsysteem', KLANTBEELD_URL: '/klantbeeld' },
  'klantbeeld/server.js': { PORT: '3002', BASE_PATH: '/klantbeeld', KLANTSYSTEEM_URL: '/klantsysteem' },
  'ai/server.js': {
    PORT: '3003',
    AI_DB_FILE: process.env.AI_DB_FILE ?? path.join(os.tmpdir(), 'vezelvriend-ai-dev.db'),
    AI_FAKE: process.env.ANTHROPIC_API_KEY ? '0' : '1',
    TRAINER_PASSWORD: process.env.TRAINER_PASSWORD ?? 'test',
    COOKIE_SECURE: '0', // plain http on localhost
  },
  'mijn/server.js': { PORT: '3005', COOKIE_SECURE: '0' },
  'dev-gateway.js': { PORT: '8080' },
};

for (const [script, env] of Object.entries(APPS)) {
  const name = script.split('/')[0].replace('.js', '');
  const child = spawn(process.execPath, [path.join(here, script)], { stdio: ['ignore', 'pipe', 'inherit'], env: { ...process.env, ...env } });
  child.stdout.on('data', (d) => process.stdout.write(`[${name}] ${d}`));
  child.on('exit', (code) => { console.error(`[${name}] stopped (${code})`); process.exit(code ?? 1); });
}
