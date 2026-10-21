// The AI connection ("koppeling"): lets an AI look things up in the
// Vezelvriend systems itself, instead of the participant pasting context.
//
// Two entrances to the same tools (tools.js):
// - /internal/...: for the Vezelvriend chat (systems/ai). Only reachable
//   inside the Docker network: the gateway does not forward /internal/.
// - /mcp/<key>: the Model Context Protocol, for an AI app of the
//   participant's own (Claude Desktop, claude.ai, Claude Code, Copilot Studio).
//   <key> is the connection key of a training, made in the trainer screen;
//   it stops working when the trainer switches the training off.
//
// Every call is logged (who, which tool, which arguments), so the
// trainer can discuss what the AI looked up. Results are not logged.
import { openDatabase } from '../shared/db.js';
import { readJson, routesOf, serve } from '../shared/web.js';
import { TOOLS, callTool } from './tools.js';
import { callsFor, decideRequest, logCall, requestsFor, wipeCalls, wipeRequests } from './requests.js';

const PORT = Number(process.env.PORT ?? 3006);
const AI_URL = process.env.AI_URL ?? 'http://localhost:3003';
const { db, file, refresh } = openDatabase('koppeling');

const json = (status, data) => ({ status, type: 'application/json; charset=utf-8', body: JSON.stringify(data) });

// ---------------------------------------------------------------- internal (chat, Klantbeeld, trainer)

function listTools() {
  return json(200, TOOLS.map(({ name, description, input_schema, approval }) => ({ name, description, input_schema, approval: Boolean(approval) })));
}

async function internalCall({ req }) {
  const body = await readJson(req, 50_000);
  const outcome = await callTool({ name: body.name, args: body.arguments, db, dbFile: file, source: body.source });
  logCall({ source: body.source ?? null, tool: body.name, arguments: body.arguments ?? {}, ok: !outcome.error });
  return json(200, outcome);
}

const listRequests = ({ url }) => json(200, requestsFor(url.searchParams.get('klant')));

async function decide({ req, params }) {
  const body = await readJson(req, 2_000);
  const outcome = decideRequest(params.id, body.besluit, body.door);
  return json(outcome.error ? 400 : 200, outcome);
}

const listCalls = ({ url }) => json(200, callsFor(Number(url.searchParams.get('training')) || null));

async function wipe({ req }) {
  const body = await readJson(req, 1_000);
  const training = Number(body.training) || null;
  wipeRequests(training);
  wipeCalls(training);
  return json(200, { ok: true });
}

// ---------------------------------------------------------------- MCP (own AI app of the participant)
//
// Streamable HTTP transport, the simple way: every POST carries one JSON-RPC
// message and gets one JSON answer. No server-sent events: these tools answer
// at once, so there is nothing to stream.

const PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];
const keyCache = new Map(); // key -> { training, label, until }

async function trainingForKey(key) {
  const cached = keyCache.get(key);
  if (cached && cached.until > Date.now()) return cached.training ? cached : null;
  let found = null;
  try {
    const res = await fetch(`${AI_URL}/internal/koppeling-sleutel?sleutel=${encodeURIComponent(key)}`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) found = await res.json();
  } catch { /* AI box down: no access */ }
  const entry = { training: found?.training ?? null, label: found?.label ?? null, until: Date.now() + 60_000 };
  keyCache.set(key, entry);
  return entry.training ? entry : null;
}

const rpc = (id, result) => json(200, { jsonrpc: '2.0', id, result });
const rpcError = (id, code, message) => json(200, { jsonrpc: '2.0', id, error: { code, message } });

async function mcp({ req, params }) {
  const access = await trainingForKey(params.key);
  if (!access) return json(404, { error: 'Onbekende of uitgezette sleutel.' });
  let msg;
  try { msg = await readJson(req, 100_000); } catch { return rpcError(null, -32700, 'Parse error'); }
  if (Array.isArray(msg)) return rpcError(null, -32600, 'Batches worden niet ondersteund.');
  if (msg.id === undefined || msg.id === null) return { status: 202, type: 'text/plain', body: '' }; // a notification

  switch (msg.method) {
    case 'initialize': {
      const asked = msg.params?.protocolVersion;
      return rpc(msg.id, {
        protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'vezelvriend', title: 'Vezelvriend (fictief oefenbedrijf)', version: '1.0.0' },
        instructions: `Koppeling met de systemen van Vezelvriend B.V., een fictief glasvezelbedrijf voor een AI-training. Alle klanten zijn verzonnen. In de oefenwereld is het nu zaterdag 17-10-2026 10:15.`,
      });
    }
    case 'ping':
      return rpc(msg.id, {});
    case 'tools/list':
      return rpc(msg.id, {
        tools: TOOLS.map((t) => ({
          name: t.name, description: t.description, inputSchema: t.input_schema,
          annotations: { readOnlyHint: !t.approval, destructiveHint: false, openWorldHint: false },
        })),
      });
    case 'tools/call': {
      const name = msg.params?.name;
      const source = { kind: 'mcp', training: access.training, label: access.label };
      const outcome = await callTool({ name, args: msg.params?.arguments, db, dbFile: file, source });
      logCall({ source, tool: name, arguments: msg.params?.arguments ?? {}, ok: !outcome.error });
      return rpc(msg.id, {
        content: [{ type: 'text', text: outcome.error ?? JSON.stringify(outcome.result, null, 2) }],
        isError: Boolean(outcome.error),
      });
    }
    default:
      return rpcError(msg.id, -32601, `Onbekende methode: ${msg.method}`);
  }
}

// GET would open an event stream; this server never pushes, so it says no.
const noStream = () => ({ status: 405, type: 'text/plain', body: 'Method Not Allowed', headers: { Allow: 'POST' } });

serve({
  port: PORT,
  base: '',
  before: refresh, // orders from the website are customers too
  routes: routesOf({
    'GET /internal/tools': listTools,
    'POST /internal/tools/call': internalCall,
    'GET /internal/verzoeken': listRequests,
    'POST /internal/verzoeken/:id': decide,
    'GET /internal/opvragingen': listCalls,
    'POST /internal/wissen': wipe,
    'POST /mcp/:key': mcp,
    'GET /mcp/:key': noStream,
  }),
  notFound: () => JSON.stringify({ error: 'Niet gevonden' }),
});
