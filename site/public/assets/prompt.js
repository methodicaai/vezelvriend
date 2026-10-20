// Turns the example prompts of an exercise into fill-in blocks.
//
// In the Markdown an exercise prompt is a ```prompt code block:
//   {{what to fill in}}          a field the participant fills in by hand
//   {{auto:key|what it holds}}   a field filled automatically from the
//                                Klantbeeld once a customer is chosen
// The fixed text is shown as is; every field is a clearly labelled box.
// "Kopieer prompt" copies the whole prompt, "Stuur naar AI" sends the same
// text (only when the server has an AI connection and the participant is
// logged in with a code). Without JavaScript the plain block stays readable.
//
// Why fields instead of one big text box: participants see exactly which
// context they still have to add and cannot change the fixed part, which
// keeps the comparison between prompt A, B and C fair.
(() => {
  const FIELD = /\{\{(.+?)\}\}/g;
  const KLANTBEELD = '/klantbeeld';
  const exercise = location.pathname.split('/').filter(Boolean).pop();
  const storageKey = (block, field) => `prompt:${location.pathname}:${block}:${field}`;
  const load = (key) => { try { return sessionStorage.getItem(key) ?? ''; } catch { return ''; } };
  const save = (key, value) => { try { sessionStorage.setItem(key, value); } catch { /* storage blocked: not remembered */ } };

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
      const area = el('textarea', 'prompt-verborgen');
      area.value = text;
      document.body.append(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    }
  }

  async function getJson(url, options) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Er ging iets mis.');
    return data;
  }

  const sendButtons = [];
  const handInButtons = [];

  document.querySelectorAll('pre > code.language-prompt').forEach((code, blockIndex) => {
    const source = code.textContent.replace(/\n$/, '');
    const parts = source.split(FIELD); // even index = fixed text, odd index = field
    const fieldCount = (parts.length - 1) / 2;

    // The heading above the block ("Voorbeeldprompt met context (B)") tells the
    // trainer later which prompt a stored conversation came from.
    let heading = code.parentElement.previousElementSibling;
    while (heading && !/^H[23]$/.test(heading.tagName)) heading = heading.previousElementSibling;
    const blockTitle = heading ? heading.textContent.trim() : `Prompt ${blockIndex + 1}`;

    const box = el('section', 'prompt');
    box.setAttribute('aria-label', blockTitle);
    const head = el('div', 'prompt-kop');
    head.append(el('span', 'prompt-titel', 'Prompt'));
    const counter = el('span', 'prompt-telling');
    head.append(counter);
    box.append(head);

    const fields = [];
    parts.forEach((part, i) => {
      if (i % 2 === 0) {
        if (part.trim() !== '') box.append(el('div', 'prompt-tekst', part.replace(/^\n+|\n+$/g, '')));
        return;
      }
      const auto = part.match(/^auto:(\w+)\|(.+)$/);
      const number = fields.length + 1;
      const labelText = auto ? auto[2] : part;
      const key = storageKey(blockIndex, number);
      const label = el('label', `prompt-veld${auto ? ' prompt-veld--auto' : ''}`);
      const caption = el('span', 'prompt-veld-label', auto
        ? `Automatisch (${number}/${fieldCount}): ${labelText}`
        : `Vul in (${number}/${fieldCount}): ${labelText}`);
      label.append(caption);
      const input = el('textarea');
      input.rows = auto ? 5 : 3;
      input.placeholder = auto ? 'Wordt automatisch ingevuld zodra je een klant kiest' : labelText;
      input.value = load(key);
      input.addEventListener('input', () => {
        save(key, input.value);
        if (input.value.trim()) label.classList.remove('prompt-veld--leeg');
      });
      label.append(input);
      box.append(label);
      fields.push({ label: labelText, input, auto: auto ? auto[1] : null, key });
    });

    const autoFields = fields.filter((f) => f.auto);
    const manualCount = fields.length - autoFields.length;
    counter.textContent = fields.length === 0 ? 'Klaar om te kopiëren'
      : autoFields.length === 0 ? `${manualCount} ${manualCount === 1 ? 'vak' : 'vakken'} om zelf in te vullen`
      : `${autoFields.length} ${autoFields.length === 1 ? 'vak wordt' : 'vakken worden'} automatisch ingevuld`;

    // Blocks with automatic fields start with a customer picker.
    if (autoFields.length) {
      const picker = el('div', 'prompt-kies');
      const pickLabel = el('label', 'prompt-veld-label', 'Kies de klant aan de lijn');
      pickLabel.htmlFor = `klant-${blockIndex}`;
      const select = el('select');
      select.id = `klant-${blockIndex}`;
      select.append(new Option('Kies een klant...', ''));
      const pickStatus = el('p', 'prompt-status');
      pickStatus.setAttribute('aria-live', 'polite');
      picker.append(pickLabel, select, pickStatus);
      head.after(picker);

      getJson(`${KLANTBEELD}/api/klanten`).then((list) => {
        list.forEach((c) => select.append(new Option(`${c.name} (${c.customer_id}), ${c.address}`, c.customer_id)));
      }).catch(() => { pickStatus.textContent = 'De klantenlijst kon niet worden opgehaald.'; });

      select.addEventListener('change', async () => {
        if (!select.value) return;
        pickStatus.className = 'prompt-status';
        pickStatus.textContent = 'Context ophalen uit het Klantbeeld...';
        try {
          const context = await getJson(`${KLANTBEELD}/api/context/${encodeURIComponent(select.value)}`);
          autoFields.forEach((f) => {
            f.input.value = context[f.auto] ?? '';
            save(f.key, f.input.value);
            f.input.parentElement.classList.remove('prompt-veld--leeg');
          });
          pickStatus.textContent = 'Alle context is automatisch ingevuld. Bekijk wat erin staat voordat je het verstuurt.';
        } catch (err) {
          pickStatus.className = 'prompt-status prompt-status--let-op';
          pickStatus.textContent = `Ophalen lukte niet: ${err.message}`;
        }
      });
    }

    const actions = el('div', 'prompt-acties');
    const copyButton = el('button', 'prompt-knop', 'Kopieer prompt');
    copyButton.type = 'button';
    const sendButton = el('button', 'prompt-knop prompt-knop--rand', 'Stuur naar AI');
    sendButton.type = 'button';
    sendButton.hidden = true;
    const handInButton = el('button', 'prompt-knop prompt-knop--rand', 'Inleveren');
    handInButton.type = 'button';
    handInButton.hidden = true;
    const status = el('p', 'prompt-status');
    status.setAttribute('aria-live', 'polite');
    actions.append(copyButton, sendButton, handInButton, status);
    box.append(actions);
    const answer = el('div', 'prompt-antwoord');
    answer.hidden = true;
    box.append(answer);
    sendButtons.push(sendButton);
    handInButtons.push(handInButton);

    const setStatus = (text, warn) => {
      status.className = 'prompt-status' + (warn ? ' prompt-status--let-op' : '');
      status.textContent = text;
    };
    // Marks empty fields and returns their labels.
    const checkMissing = () => fields.filter((f) => {
      const empty = !f.input.value.trim();
      f.input.parentElement.classList.toggle('prompt-veld--leeg', empty);
      return empty;
    }).map((f) => f.label);

    // One text for copying and for sending, so both are always identical.
    const promptText = () => parts.map((part, i) => {
      if (i % 2 === 0) return part;
      const f = fields[(i - 1) / 2];
      return f.input.value.trim() || `[NOG INVULLEN: ${f.label}]`;
    }).join('');

    copyButton.addEventListener('click', async () => {
      const missing = checkMissing();
      const ok = await copyText(promptText());
      if (!ok) setStatus('Kopiëren lukte niet. Selecteer de tekst en kopieer met Ctrl+C.', true);
      else if (missing.length) setStatus(`Gekopieerd, maar nog niet alles is ingevuld: ${missing.join('; ')}.`, true);
      else setStatus('Gekopieerd. Plak de prompt in je AI-assistent.', false);
    });

    // Empty fields are never sent silently: the first click warns, a second click sends anyway.
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
        const data = await getJson('/api/ai/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: promptText(), exercise, block: blockTitle }),
        });
        answer.hidden = false;
        answer.replaceChildren(el('p', 'prompt-antwoord-kop', 'Antwoord van de AI'), el('div', 'prompt-antwoord-tekst', data.answer || data.note || ''));
        if (data.note) setStatus(data.note, true);
        else setStatus(missing.length ? 'Verstuurd, met lege vakken. Let daarop bij het antwoord.' : 'Antwoord ontvangen.', missing.length > 0);
      } catch (err) {
        setStatus(err.message, true);
      } finally {
        sendButton.disabled = false;
      }
    });

    // "Inleveren": for participants who used their own AI (e.g. Copilot at work).
    // They paste in what they want the trainer to see; the prompt is prefilled
    // with this block's text, the answer comes from their own AI.
    const handIn = el('form', 'prompt-inleveren');
    handIn.hidden = true;
    const field = (label, control) => {
      const wrap = el('label', 'prompt-veld');
      wrap.append(el('span', 'prompt-veld-label', label), control);
      return wrap;
    };
    const toolSelect = el('select');
    ['Microsoft Copilot', 'ChatGPT', 'Claude', 'Gemini', 'Anders'].forEach((t) => toolSelect.append(new Option(t, t)));
    const promptInput = el('textarea'); promptInput.rows = 6;
    const answerInput = el('textarea'); answerInput.rows = 8; answerInput.placeholder = 'Plak hier het antwoord van je AI';
    const noteInput = el('textarea'); noteInput.rows = 2; noteInput.placeholder = 'Optioneel: wat viel je op?';
    const handInSubmit = el('button', 'prompt-knop', 'Verstuur naar de trainer');
    handInSubmit.type = 'submit';
    const handInStatus = el('p', 'prompt-status');
    handInStatus.setAttribute('aria-live', 'polite');
    handIn.append(
      el('p', 'prompt-login-privacy', 'Haal eerst werkgegevens en persoonsgegevens weg uit je prompt en het antwoord. Alleen wat je hier invult, gaat naar de trainer.'),
      field('Welke AI gebruikte je?', toolSelect),
      field('Je prompt, zoals je hem gebruikte', promptInput),
      field('Het antwoord van je AI', answerInput),
      field('Toelichting (optioneel)', noteInput),
      handInSubmit,
      handInStatus,
    );
    box.append(handIn);

    handInButton.addEventListener('click', () => {
      handIn.hidden = !handIn.hidden;
      if (!handIn.hidden && !promptInput.value) promptInput.value = promptText();
      if (!handIn.hidden) answerInput.focus();
    });
    handIn.addEventListener('submit', async (e) => {
      e.preventDefault();
      handInSubmit.disabled = true;
      try {
        await getJson('/api/ai/inleveren', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ exercise, block: blockTitle, tool: toolSelect.value, prompt: promptInput.value, answer: answerInput.value, note: noteInput.value }),
        });
        handInStatus.className = 'prompt-status';
        handInStatus.textContent = 'Ingeleverd. De trainer kan het nu zien.';
        answerInput.value = '';
        noteInput.value = '';
      } catch (err) {
        handInStatus.className = 'prompt-status prompt-status--let-op';
        handInStatus.textContent = err.message;
      } finally {
        handInSubmit.disabled = false;
      }
    });

    code.parentElement.replaceWith(box);
  });

  // "Stuur naar AI" only appears when the server has an AI connection; "Inleveren"
  // and the login bar appear whenever participant codes work (no AI key needed).
  if (sendButtons.length) {
    getJson('/api/ai/status').then((state) => {
      if (state.enabled) sendButtons.forEach((b) => { b.hidden = false; });
      if (state.handIn) handInButtons.forEach((b) => { b.hidden = false; });
      if (state.enabled || state.handIn) showLoginBar(state);
    }).catch(() => { /* no server: copy only */ });
  }

  function showLoginBar(state) {
    const article = document.querySelector('section.prompt')?.closest('article');
    if (!article) return;
    const bar = el('section', 'prompt-login');
    bar.setAttribute('aria-label', 'Inloggen voor de AI');
    article.prepend(bar);

    const render = (s) => {
      bar.replaceChildren();
      if (s.loggedIn) {
        bar.append(el('p', 'prompt-login-tekst', `Ingelogd als ${s.participant.label} (${s.participant.training}). Je kunt nu inleveren.`));
        const out = el('button', 'prompt-knop prompt-knop--rand', 'Uitloggen');
        out.type = 'button';
        out.addEventListener('click', async () => {
          await fetch('/api/ai/logout', { method: 'POST' });
          render({ loggedIn: false });
        });
        bar.append(out);
      } else {
        bar.append(el('p', 'prompt-login-tekst', 'Wil je je werk inleveren bij de trainer? Log in met de code die je van de trainer kreeg.'));
        const form = el('form', 'prompt-login-form');
        const label = el('label', 'prompt-veld-label', 'Je deelnemerscode');
        label.htmlFor = 'deelnemerscode';
        const input = el('input');
        input.id = 'deelnemerscode';
        input.autocomplete = 'off';
        input.placeholder = 'VV-XXXX-XXXX';
        const go = el('button', 'prompt-knop', 'Inloggen');
        go.type = 'submit';
        const msg = el('p', 'prompt-status');
        msg.setAttribute('aria-live', 'polite');
        form.append(label, input, go, msg);
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          try {
            const participant = await getJson('/api/ai/login', {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: input.value }),
            });
            render({ loggedIn: true, participant });
          } catch (err) {
            msg.className = 'prompt-status prompt-status--let-op';
            msg.textContent = err.message;
          }
        });
        bar.append(form);
      }
      bar.append(el('p', 'prompt-login-privacy', 'Let op: wat je inlevert of naar de AI stuurt, wordt bewaard, zodat de trainer het met je kan bespreken. Plak geen echte persoonsgegevens of werkgegevens.'));
    };
    render(state);
  }
})();
