// Rules for the chat: recognises information that should not go to an AI.
//
// The chat only warns, it never blocks: participants must see what went in,
// so they learn to spot it themselves (the chat turns red and lists what was
// found; the trainer sees the warnings too). Fixed patterns only, so the
// result is predictable and explainable. Names do not count: they are too
// hard to recognise reliably, and that is a lesson in itself.
//
// Order matters: a piece of text found by one rule is blanked out before the
// next rule runs, so the digits of an IBAN are not reported as a phone number.

const RULES = [
  // Practice IBANs look like NL20INGB0001234567, sometimes in lower case or with spaces.
  { kind: 'IBAN (rekeningnummer)', re: /\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){2,7}(?: ?[A-Z0-9]{1,3})?\b/gi, test: (m) => /\d{6}/.test(m.replace(/\s/g, '')) },
  { kind: 'e-mailadres', re: /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g },
  // Our own participant codes, connection keys and API keys are codes too.
  { kind: 'code of sleutel', re: /\b(?:VVK?-[A-Z0-9]{4}(?:-[A-Z0-9]{4}){1,3}|sk-[A-Za-z0-9_-]{20,})\b/g },
  { kind: 'wachtwoord of code', re: /\b(?:wachtwoord|password|wifi-wachtwoord|pincode|pin|inlogcode|toegangscode|beveiligingscode|code)\s*(?:is|=|:)\s*\S{3,}/gi },
  { kind: 'klantnummer', re: /\bK-\d{4}\b/g },
  // Dutch phone numbers: 0 or +31 followed by nine digits, with optional spaces or dashes.
  { kind: 'telefoonnummer', re: /(?<![\w-])(?:\+31|0031|0)(?:[ -]?\d){9}(?!\d)/g },
  // A postcode together with a house number, in either order.
  { kind: 'postcode en huisnummer', re: /\b\d{1,4}[a-zA-Z]?(?:-\d{1,3})?,?\s+[1-9]\d{3}\s?[A-Z]{2}\b|\b[1-9]\d{3}\s?[A-Z]{2}\s+\d{1,4}\b/g },
];

/**
 * Finds information that should not go to an AI.
 * @returns {{ soort: string, gevonden: string }[]} one entry per distinct find, at most 30
 */
export function findSensitive(text) {
  let rest = String(text ?? '');
  const found = [];
  const seen = new Set();
  for (const rule of RULES) {
    rest = rest.replace(rule.re, (m) => {
      if (rule.test && !rule.test(m)) return m;
      const key = `${rule.kind}|${m.trim().toLowerCase()}`;
      if (!seen.has(key) && found.length < 30) { seen.add(key); found.push({ soort: rule.kind, gevonden: m.trim() }); }
      return ' '.repeat(m.length);
    });
  }
  return found;
}
