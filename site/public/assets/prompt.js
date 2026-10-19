// Turns the example prompts of an exercise into fill-in blocks.
//
// In the Markdown an exercise prompt is a ```prompt code block; every part the
// participant must fill in is written as {{what to fill in}}. This script shows
// the fixed text as is and turns each {{...}} into a clearly labelled field,
// with a "Kopieer prompt" button that copies the whole prompt including what
// was filled in. Without JavaScript the plain block stays readable.
//
// Why fields instead of one big text box: participants see exactly which
// context they still have to add, and cannot accidentally change the fixed
// part of the prompt (which keeps the A/B comparison fair).
//
// "Stuur naar AI" sends exactly the same text as "Kopieer prompt". The button
// only appears when the server reports that the AI connection is switched on
// (GET /api/ai/status). Empty fields are never sent silently: the first click
// shows what is missing, a second click sends anyway.
(() => {
  const FIELD = /\{\{(.+?)\}\}/g;
  const storageKey = (block, field) => `prompt:${location.pathname}:${block}:${field}`;
  const load = (key) => { try { return sessionStorage.getItem(key) ?? ''; } catch { return ''; } };
  const save = (key, value) => { try { sessionStorage.setItem(key, value); } catch { /* storage blocked: fields just are not remembered */ } };

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback for browsers without clipboard permission.
      const area = el('textarea', 'prompt-verborgen');
      area.value = text;
      document.body.append(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    }
  }

  const sendButtons = [];

  document.querySelectorAll('pre > code.language-prompt').forEach((code, blockIndex) => {
    const source = code.textContent.replace(/\n$/, '');
    const parts = source.split(FIELD); // even = fixed text, odd = field label
    const fieldCount = (parts.length - 1) / 2;

    const box = el('section', 'prompt');
    box.setAttribute('aria-label', 'Prompt');
    const head = el('div', 'prompt-kop');
    head.append(el('span', 'prompt-titel', 'Prompt'));
    head.append(el('span', 'prompt-telling', fieldCount === 0
      ? 'Klaar om te kopiëren'
      : `${fieldCount} ${fieldCount === 1 ? 'vak' : 'vakken'} om zelf in te vullen`));
    box.append(head);

    const fields = [];
    let fieldNumber = 0;
    parts.forEach((part, i) => {
      if (i % 2 === 0) {
        if (part.trim() !== '') box.append(el('div', 'prompt-tekst', part.replace(/^\n+|\n+$/g, '')));
        return;
      }
      fieldNumber += 1;
      const key = storageKey(blockIndex, fieldNumber);
      const label = el('label', 'prompt-veld');
      label.append(el('span', 'prompt-veld-label', `Vul in (${fieldNumber}/${fieldCount}): ${part}`));
      const input = el('textarea');
      input.rows = 3;
      input.placeholder = part;
      input.value = load(key);
      input.addEventListener('input', () => save(key, input.value));
      label.append(input);
      box.append(label);
      fields.push({ label: part, input });
    });

    const actions = el('div', 'prompt-acties');
    const copyButton = el('button', 'prompt-knop', 'Kopieer prompt');
    copyButton.type = 'button';
    const sendButton = el('button', 'prompt-knop prompt-knop--rand', 'Stuur naar AI');
    sendButton.type = 'button';
    sendButton.hidden = true;
    const status = el('p', 'prompt-status');
    status.setAttribute('aria-live', 'polite');
    actions.append(copyButton, sendButton, status);
    box.append(actions);
    const answer = el('div', 'prompt-antwoord');
    answer.hidden = true;
    box.append(answer);
    sendButtons.push(sendButton);

    // Marks empty fields and returns their labels.
    const checkMissing = () => fields.filter((f) => {
      const empty = !f.input.value.trim();
      f.input.parentElement.classList.toggle('prompt-veld--leeg', empty);
      return empty;
    }).map((f) => f.label);
    fields.forEach((f) => f.input.addEventListener('input', () => {
      if (f.input.value.trim()) f.input.parentElement.classList.remove('prompt-veld--leeg');
    }));
    const setStatus = (text, warn) => {
      status.className = 'prompt-status' + (warn ? ' prompt-status--let-op' : '');
      status.textContent = text;
    };

    // The same text is used for copying and, once enabled, for sending to the AI.
    box.promptText = () => parts.map((part, i) => {
      if (i % 2 === 0) return part;
      const value = fields[(i - 1) / 2].input.value.trim();
      return value || `[NOG INVULLEN: ${part}]`;
    }).join('');

    copyButton.addEventListener('click', async () => {
      const missing = checkMissing();
      const ok = await copyText(box.promptText());
      if (!ok) setStatus('Kopiëren lukte niet. Selecteer de tekst en kopieer met Ctrl+C.', true);
      else if (missing.length) setStatus(`Gekopieerd, maar nog niet alles is ingevuld: ${missing.join('; ')}.`, true);
      else setStatus('Gekopieerd. Plak de prompt in je AI-assistent.', false);
    });

    let confirmedIncomplete = false;
    fields.forEach((f) => f.input.addEventListener('input', () => { confirmedIncomplete = false; }));
    sendButton.addEventListener('click', async () => {
      const missing = checkMissing();
      if (missing.length && !confirmedIncomplete) {
        confirmedIncomplete = true;
        setStatus(`Nog niet ingevuld: ${missing.join('; ')}. Vul dit eerst in, of klik nogmaals op "Stuur naar AI" om toch te versturen.`, true);
        return;
      }
      confirmedIncomplete = false;
      sendButton.disabled = true;
      setStatus('Bezig met versturen naar de AI...', false);
      try {
        const response = await fetch('/api/ai/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: box.promptText() }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'De AI gaf geen antwoord.');
        answer.hidden = false;
        answer.replaceChildren(el('p', 'prompt-antwoord-kop', 'Antwoord van de AI'), el('div', 'prompt-antwoord-tekst', data.answer));
        setStatus(missing.length ? 'Verstuurd, met lege vakken. Let daarop bij het antwoord.' : 'Antwoord ontvangen.', missing.length > 0);
      } catch (err) {
        setStatus(err.message, true);
      } finally {
        sendButton.disabled = false;
      }
    });

    code.parentElement.replaceWith(box);
  });

  // Show "Stuur naar AI" only when the server says the AI connection is on.
  if (sendButtons.length) {
    fetch('/api/ai/status').then((r) => (r.ok ? r.json() : null)).then((data) => {
      if (data && data.enabled) sendButtons.forEach((b) => { b.hidden = false; });
    }).catch(() => { /* no AI connection: copy only */ });
  }
})();
