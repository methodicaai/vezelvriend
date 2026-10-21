// The Vezelvriend chat: Claude answers a participant's question and may use
// the tools of the AI connection (systems/koppeling) to look things up itself.
// This is step 3 and 4 of the context ladder: the AI fetches its own context.
//
// One turn = one question of the participant. Claude may call tools several
// times before it answers; we stop after MAX_STEPS to keep cost and time in
// check. Every tool call becomes an item the participant can open
// ("Laat zien wat Claude opvroeg"), and a technician request becomes an
// approval card: the AI only proposes, the participant decides.
//
// Unlike "Stuur naar AI" this chat has a short system prompt: the assistant
// needs to know where it works and what time it is. The participant can read
// it in the chat (SYSTEM_PROMPT is shown there), so nothing is hidden.
import Anthropic from '@anthropic-ai/sdk';

const MODEL = process.env.AI_CHAT_MODEL || process.env.AI_MODEL || 'claude-sonnet-5-5';
const EFFORT = process.env.AI_CHAT_EFFORT || 'medium';
const MAX_TOKENS = Number(process.env.AI_MAX_TOKENS || 8000);
const MAX_STEPS = 8;
const MAX_HISTORY = 40;          // messages kept for Claude; older turns drop off
const MAX_RESULT_CHARS = 12_000; // a single tool result sent to Claude
const KOPPELING_URL = process.env.KOPPELING_URL ?? 'http://localhost:3006';
const FALLBACK_MODELS = new Set(['claude-fable-5-1', 'claude-opus-5-5', 'claude-opus-5', 'claude-sonnet-5-5']);

const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
export const chatModel = () => (client ? MODEL : 'test (geen echte AI)');

export const SYSTEM_PROMPT = `Je bent de AI-assistent van de klantenservice van Vezelvriend B.V., een fictief glasvezelbedrijf (bedacht voor een training). Je helpt medewerkers die een klant aan de lijn hebben.
Het is nu zaterdag 17-10-2026 10:15.
Je kunt de systemen van Vezelvriend raadplegen met je gereedschappen. Een monteur kun je alleen aanvragen: een medewerker keurt het verzoek goed of af.
Antwoord in het Nederlands, kort en praktisch.`;

async function koppeling(pathname, body) {
  const res = await fetch(`${KOPPELING_URL}${pathname}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`koppeling ${res.status}`);
  return res.json();
}

/** Asks the connection to run one tool; returns { result } or { error }. */
const callTool = (name, args, stand, source) => koppeling('/internal/tools/call', { name, arguments: args, stand, source });

/** Turns one tool call into what the participant sees. */
function itemsFor(name, args, outcome) {
  const items = [{ type: 'opvraging', tool: name, args, ok: !outcome.error, result: outcome.error ?? outcome.result }];
  if (name === 'monteur_inplannen' && outcome.result?.verzoek) {
    const r = outcome.result;
    items.push({ type: 'goedkeuring', verzoek: r.verzoek, klantnummer: r.klantnummer, reden: args.reden ?? '', tijd: r.voorgestelde_tijd, status: r.status });
  }
  return items;
}

/** Keeps the history short, cutting only at the start of a plain user question. */
function trim(messages) {
  const list = [...messages];
  while (list.length > MAX_HISTORY) {
    list.shift();
    while (list.length && !(list[0].role === 'user' && typeof list[0].content === 'string')) list.shift();
  }
  return list;
}

/**
 * Runs one question. Returns the new API history, the new items for the
 * screen, the final answer text, and usage for the trainer's overview.
 */
export async function runTurn({ apiMessages, question, stand, source }) {
  const started = Date.now();
  const messages = trim([...apiMessages, { role: 'user', content: question }]);
  const newItems = [];
  if (!client) return fakeTurn({ messages, newItems, question, stand, source, started });

  const tools = (await koppeling(`/internal/tools?stand=${stand}`)).map(({ name, description, input_schema }) => ({ name, description, input_schema }));
  let inputTokens = 0;
  let outputTokens = 0;
  let model = MODEL;
  try {
    for (let step = 0; step < MAX_STEPS; step++) {
      const params = { model: MODEL, max_tokens: MAX_TOKENS, output_config: { effort: EFFORT }, system: SYSTEM_PROMPT, tools, messages };
      if (FALLBACK_MODELS.has(MODEL)) { params.betas = ['server-side-fallback-2026-07-01']; params.fallbacks = 'default'; }
      const response = await client.beta.messages.create(params);
      model = response.model;
      inputTokens += response.usage?.input_tokens ?? 0;
      outputTokens += response.usage?.output_tokens ?? 0;
      messages.push({ role: 'assistant', content: response.content });

      for (const block of response.content) if (block.type === 'text' && block.text.trim()) newItems.push({ type: 'tekst', text: block.text.trim() });
      if (response.stop_reason === 'refusal') newItems.push({ type: 'melding', text: 'De AI weigerde deze vraag te beantwoorden.' });
      if (response.stop_reason !== 'tool_use') break;

      const results = [];
      for (const block of response.content.filter((b) => b.type === 'tool_use')) {
        const outcome = await callTool(block.name, block.input, stand, source).catch(() => ({ error: 'De koppeling is niet bereikbaar.' }));
        newItems.push(...itemsFor(block.name, block.input, outcome));
        const text = outcome.error ?? JSON.stringify(outcome.result);
        results.push({ type: 'tool_result', tool_use_id: block.id, content: text.length > MAX_RESULT_CHARS ? `${text.slice(0, MAX_RESULT_CHARS)} [afgekapt]` : text, is_error: Boolean(outcome.error) });
      }
      messages.push({ role: 'user', content: results });
      if (step === MAX_STEPS - 1) newItems.push({ type: 'melding', text: 'De AI had te veel stappen nodig en is gestopt. Stel je vraag preciezer.' });
    }
    return { status: 'ok', apiMessages: messages, newItems, answer: answerOf(newItems), model, inputTokens, outputTokens, durationMs: Date.now() - started };
  } catch (err) {
    let message = 'De AI is nu niet bereikbaar. Probeer het over een minuut opnieuw.';
    if (err instanceof Anthropic.AuthenticationError) message = 'De AI-koppeling is niet goed ingesteld. Meld dit aan je trainer.';
    else if (err instanceof Anthropic.RateLimitError) message = 'Het is even te druk bij de AI. Probeer het over een minuut opnieuw.';
    return {
      status: 'error', apiMessages, newItems: [], participantMessage: message, model: MODEL, durationMs: Date.now() - started,
      error: err instanceof Anthropic.APIError ? `${err.status}: ${err.message}` : String(err.message ?? err),
    };
  }
}

const answerOf = (items) => items.filter((i) => i.type === 'tekst').map((i) => i.text).join('\n\n');

// Test mode (no API key): no real AI, but the tools are really called, so the
// whole flow (look-ups, the two modes, the approval card) can be tried for free.
async function fakeTurn({ messages, newItems, question, stand, source, started }) {
  const id = question.match(/K-\d{4,5}/i)?.[0]?.toUpperCase();
  const steps = id
    ? [['klantbeeld', { klantnummer: id }], ['modem_controleren', { klantnummer: id }], ['historie_op_adres', { klantnummer: id }], ['beslisboom', {}]]
    : [['zoek_klanten', { zoekterm: question.replace(/[^\p{L}\s-]/gu, ' ').trim().split(/\s+/).slice(-1)[0] ?? '' }]];
  if (id && /monteur/i.test(question)) steps.push(['monteur_inplannen', { klantnummer: id, reden: 'Testverzoek uit de testmodus.' }]);
  for (const [name, args] of steps) {
    const outcome = await callTool(name, args, stand, source).catch(() => ({ error: 'De koppeling is niet bereikbaar.' }));
    newItems.push(...itemsFor(name, args, outcome));
  }
  newItems.push({ type: 'tekst', text: `Dit is een testantwoord: de chat draait zonder echte AI.\n\nIk heb ${steps.length} keer iets opgevraagd in de stand **${stand}**. Noem een klantnummer (bijvoorbeeld K-1004) om klantgegevens te laten ophalen, en het woord "monteur" om een monteursverzoek te zien.` });
  messages.push({ role: 'assistant', content: answerOf(newItems) });
  return { status: 'ok', apiMessages: messages, newItems, answer: answerOf(newItems), model: chatModel(), inputTokens: 0, outputTokens: 0, durationMs: Date.now() - started };
}

/** Approves or rejects a technician request on behalf of the participant. */
export const decideRequest = (id, besluit, door) => koppeling(`/internal/verzoeken/${encodeURIComponent(id)}`, { besluit, door });
