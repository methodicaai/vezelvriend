// Whether the AI is available. The calls to Claude themselves live in agent.js
// (the chat); this file only answers "is there a key, or test mode?".
const client = Boolean(process.env.ANTHROPIC_API_KEY);
const fake = process.env.AI_FAKE === '1';

export const aiEnabled = () => client || fake;
