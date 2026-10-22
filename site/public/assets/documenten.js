// Step 6: give documents to the chat. The participant ticks documents and
// clicks "Zet in de chat": their text (the same plain text as the download)
// goes into the chat input with a heading per document, and the participant
// types the question below it. Nothing is sent automatically (chat.js listens
// for the "vv-prompt" event).
(() => {
  const form = document.getElementById('docs');
  if (!form) return;
  const status = document.getElementById('docs-status');
  const MAX = 30000; // the chat accepts at most this many characters per message
  const cache = {};
  const chosen = () => [...form.querySelectorAll('input[name="doc"]:checked')];
  const text = async (slug) => {
    if (!cache[slug]) cache[slug] = await fetch(`/training/oefeningen/documenten/${slug}.txt`).then((r) => (r.ok ? r.text() : Promise.reject()));
    return cache[slug];
  };

  form.addEventListener('change', async () => {
    const boxes = chosen();
    if (!boxes.length) { status.textContent = 'Nog geen document gekozen.'; return; }
    const size = (await Promise.all(boxes.map((b) => text(b.value).catch(() => '')))).reduce((n, t) => n + t.length, 0);
    status.className = `prompt-status${size > MAX ? ' prompt-status--let-op' : ''}`;
    status.textContent = `${boxes.length} document${boxes.length === 1 ? '' : 'en'} gekozen, samen ${size.toLocaleString('nl-NL')} tekens.`
      + (size > MAX ? ` Dat past niet in één bericht (maximaal ${MAX.toLocaleString('nl-NL')}). Kies minder.` : '');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const boxes = chosen();
    if (!boxes.length) { status.textContent = 'Vink eerst een of meer documenten aan.'; return; }
    try {
      const parts = await Promise.all(boxes.map(async (b) => `=== Document: ${b.dataset.titel} ===\n${(await text(b.value)).trim()}`));
      const prompt = `Hieronder staan documenten van Vezelvriend. Gebruik ze om mijn vraag te beantwoorden.\n\n${parts.join('\n\n')}\n\n=== Einde van de documenten ===\n\nMijn vraag: `;
      document.dispatchEvent(new CustomEvent('vv-prompt', { detail: { text: prompt } }));
      status.className = 'prompt-status';
      status.textContent = 'De documenten staan in de chat. Typ je vraag eronder en klik op Verstuur.';
    } catch {
      status.className = 'prompt-status prompt-status--let-op';
      status.textContent = 'Een document kon niet worden opgehaald. Probeer het opnieuw.';
    }
  });
})();
