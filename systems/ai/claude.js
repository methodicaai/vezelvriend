// Sends one participant prompt to Claude and returns the answer.
//
// Deliberately no hidden system prompt: participants must see the effect of
// exactly the prompt they wrote, otherwise the with/without-context exercises
// would measure our instructions instead of theirs.
import Anthropic from '@anthropic-ai/sdk';

const MODEL = process.env.AI_MODEL || 'claude-opus-5-5';
const EFFORT = process.env.AI_EFFORT || 'medium';
const MAX_TOKENS = Number(process.env.AI_MAX_TOKENS || 8000);

// Server-side refusal fallback: if this model declines a request, the API
// retries it on a suitable other model within the same call. Only some models
// accept the parameter.
const FALLBACK_MODELS = new Set(['claude-fable-5-1', 'claude-opus-5-5', 'claude-opus-5', 'claude-sonnet-5-5']);

const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
const fake = process.env.AI_FAKE === '1';

export const aiEnabled = () => Boolean(client) || fake;
export const aiModel = () => (fake && !client ? 'test (geen echte AI)' : MODEL);

export async function askClaude(prompt) {
  const started = Date.now();
  if (!client) {
    // Test mode (AI_FAKE=1, no key): lets trainers try the whole flow for free.
    return {
      status: 'ok', model: aiModel(), inputTokens: 0, outputTokens: 0, durationMs: Date.now() - started,
      answer: `Dit is een testantwoord: de AI-koppeling draait in testmodus, zonder echte AI.\n\nJe prompt was ${prompt.length} tekens lang.`,
    };
  }

  const params = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    output_config: { effort: EFFORT },
    messages: [{ role: 'user', content: prompt }],
  };
  if (FALLBACK_MODELS.has(MODEL)) {
    params.betas = ['server-side-fallback-2026-07-01'];
    params.fallbacks = 'default';
  }

  try {
    const response = await client.beta.messages.create(params);
    const answer = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    const base = {
      model: response.model,
      inputTokens: response.usage?.input_tokens ?? null,
      outputTokens: response.usage?.output_tokens ?? null,
      durationMs: Date.now() - started,
    };
    if (response.stop_reason === 'refusal') {
      return { ...base, status: 'refusal', answer: answer || null, error: 'De AI weigerde deze vraag te beantwoorden.' };
    }
    if (response.stop_reason === 'max_tokens') {
      return { ...base, status: 'ok', answer: `${answer}\n\n[Het antwoord is afgekapt omdat het te lang werd.]` };
    }
    return { ...base, status: 'ok', answer };
  } catch (err) {
    // Typed SDK errors, most specific first. The message for the participant
    // stays general; the technical detail goes to the trainer's database.
    let message = 'De AI is nu niet bereikbaar. Probeer het over een minuut opnieuw.';
    if (err instanceof Anthropic.AuthenticationError) message = 'De AI-koppeling is niet goed ingesteld. Meld dit aan je trainer.';
    else if (err instanceof Anthropic.RateLimitError) message = 'Het is even te druk bij de AI. Probeer het over een minuut opnieuw.';
    else if (err instanceof Anthropic.BadRequestError) message = 'De AI kon deze vraag niet verwerken. Is de prompt erg lang?';
    return {
      status: 'error', model: MODEL, durationMs: Date.now() - started,
      error: err instanceof Anthropic.APIError ? `${err.status}: ${err.message}` : String(err.message ?? err),
      participantMessage: message,
    };
  }
}
