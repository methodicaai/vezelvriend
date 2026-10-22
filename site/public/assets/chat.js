// The Vezelvriend chat: Claude with the AI connection (see systems/ai/agent.js).
// One component, two shapes:
//   <div class="vc" data-vorm="volledig" data-context="chat">   the own tab, with a list of conversations
//   <div class="vc" data-vorm="paneel" data-context="07-...">   a panel next to an exercise
// External script (the Content-Security-Policy forbids inline scripts). All
// text from Claude or the systems is inserted as text, never as HTML, except
// through the small markdown renderer below, which escapes everything first.
(() => {
  const root = document.querySelector('.vc');
  if (!root) return;
  const shape = root.dataset.vorm === 'paneel' ? 'paneel' : 'volledig';
  const context = root.dataset.context || 'chat';
  const API = '/api/ai';
  const PREF = 'vv-chat-voorkeur';

  // ------------------------------------------------------------ helpers
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
  async function api(path, body) {
    const res = await fetch(API + path, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || 'Er ging iets mis.'), { status: res.status });
    return data;
  }
  const prefs = (() => { try { return JSON.parse(localStorage.getItem(PREF) || '{}'); } catch { return {}; } })();
  const savePrefs = () => { try { localStorage.setItem(PREF, JSON.stringify(prefs)); } catch { /* not kept */ } };

  /** Tiny markdown: escape first, then bold, code, headings, lists and paragraphs. */
  function markdown(text) {
    const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
    const out = [];
    let list = null;
    const close = () => { if (list) { out.push(`</${list}>`); list = null; } };
    for (const line of text.split('\n')) {
      const bullet = line.match(/^\s*[-*]\s+(.*)/);
      const number = line.match(/^\s*\d+[.)]\s+(.*)/);
      const head = line.match(/^#{1,4}\s+(.*)/);
      if (bullet || number) {
        const kind = bullet ? 'ul' : 'ol';
        if (list !== kind) { close(); out.push(`<${kind}>`); list = kind; }
        out.push(`<li>${inline((bullet || number)[1])}</li>`);
      } else if (head) { close(); out.push(`<p class="vc-kop">${inline(head[1])}</p>`); }
      else if (!line.trim()) close();
      else { close(); out.push(`<p>${inline(line)}</p>`); }
    }
    close();
    return out.join('');
  }

  const TOOL_LABELS = {
    zoek_klanten: 'klanten gezocht', klantbeeld: 'klantbeeld', modem_controleren: 'modem gecontroleerd', historie_op_adres: 'historie op adres',
    storingen: 'storingen', beslisboom: 'beslisboom', documenten: 'lijst met documenten', document_lezen: 'document gelezen', sql: 'SQL-vraag', monteur_inplannen: 'monteur aangevraagd',
  };
  const argText = (args) => Object.values(args || {}).filter((v) => typeof v === 'string' && v.length < 80).join(', ');

  // ------------------------------------------------------------ layout
  root.replaceChildren();
  const side = el('aside', 'vc-zij');
  const main = el('section', 'vc-hoofd');
  if (shape === 'volledig') root.append(side);
  root.append(main);

  const bar = el('div', 'vc-balk');
  const title = el('h1', 'vc-titel', 'Claude voor Vezelvriend');
  const controls = el('div', 'vc-knoppen');
  const badge = el('span', 'vc-badge');
  const showLabel = el('label', 'vc-toon');
  const showBox = el('input'); showBox.type = 'checkbox';
  showLabel.append(showBox, ' Laat zien wat Claude opvroeg');
  showBox.addEventListener('change', () => { prefs.toon = showBox.checked; savePrefs(); root.classList.toggle('vc--toon', showBox.checked); });
  const about = el('details', 'vc-over');
  about.append(el('summary', '', 'Wat weet Claude vooraf?'));
  const aboutText = el('div', 'vc-over-tekst');
  about.append(aboutText);
  controls.append(badge, showLabel, about);
  bar.append(title, controls);

  const thread = el('div', 'vc-gesprek');
  thread.setAttribute('aria-live', 'polite');
  const form = el('form', 'vc-invoer');
  const input = el('textarea'); input.rows = 2; input.placeholder = 'Stel een vraag, bijvoorbeeld: Familie Bakker belt, ze hebben geen internet. Wat moet ik doen?'; input.maxLength = 30000;
  input.setAttribute('aria-label', 'Je vraag aan Claude');
  const send = el('button', 'vc-stuur', 'Verstuur'); send.type = 'submit';
  const status = el('p', 'vc-status');
  form.append(input, send);
  main.append(bar, thread, form, status);

  showBox.checked = Boolean(prefs.toon);
  root.classList.toggle('vc--toon', showBox.checked);

  // ------------------------------------------------------------ state
  let chatId = null;
  let busy = false;
  let info = null;                                  // from GET /api/ai/chat: names and descriptions of the assistants
  const fixed = root.dataset.assistent || null;     // next to an exercise the assistant is fixed
  let assistant = fixed;

  /** Shows which assistant this conversation uses, and what it can see. */
  function setAssistant(a) {
    assistant = a;
    const about = a && info ? info.assistants[a] : null;
    badge.textContent = about ? about.name : '';
    badge.hidden = !about;
    root.classList.toggle('vc--koppeling', a === 'koppeling');
    showLabel.hidden = a !== 'koppeling';
    aboutText.replaceChildren();
    if (!about) return;
    aboutText.append(el('p', '', about.sees));
    if (about.instruction) aboutText.append(el('p', '', 'Claude krijgt bij elk gesprek deze instructie mee:'), el('pre', '', about.instruction));
    else aboutText.append(el('p', '', 'Claude krijgt geen instructie vooraf: alleen jouw vraag.'));
    aboutText.append(el('p', '', `Model: ${info.model}. Je kunt ${info.maxPerDay} vragen per dag stellen. Je gesprekken worden bewaard, zodat de trainer ze kan nabespreken.`));
  }

  /** The two assistants as cards; a new conversation starts with a choice. */
  function chooser() {
    const box = el('div', 'vc-kies');
    box.append(el('p', 'vc-leeg-kop', fixed ? 'Waar kan ik je mee helpen?' : 'Kies een assistent'));
    const cards = el('div', 'vc-kies-kaarten');
    for (const key of fixed ? [fixed] : ['zonder', 'koppeling']) {
      const a = info.assistants[key];
      const card = el(fixed ? 'div' : 'button', `vc-kies-kaart${assistant === key ? ' vc-gekozen' : ''}`);
      if (!fixed) {
        card.type = 'button';
        card.setAttribute('aria-pressed', String(assistant === key));
        card.addEventListener('click', () => { setAssistant(key); showItems([], true); input.focus(); });
      }
      card.append(el('span', 'vc-kies-naam', a.name), el('span', 'vc-kies-tekst', a.sees));
      cards.append(card);
    }
    box.append(cards);
    if (!fixed) box.append(el('p', 'vc-kies-uitleg', assistant ? 'Typ je vraag hieronder. De assistent blijft hetzelfde in dit gesprek.' : 'Je kunt in een gesprek niet wisselen. Wil je vergelijken? Stel dezelfde vraag in een nieuw gesprek met de andere assistent.'));
    return box;
  }

  function renderItem(item) {
    if (item.type === 'vraag') {
      const n = el('div', `vc-vraag${item.waarschuwingen?.length ? ' vc-vraag--rood' : ''}`);
      n.append(el('span', 'vc-label', 'Jij'), el('p', '', item.text));
      if (item.waarschuwingen?.length) n.append(warning(item.waarschuwingen));
      return n;
    }
    if (item.type === 'tekst') {
      const n = el('div', 'vc-antwoord');
      n.append(el('span', 'vc-label', 'Claude'));
      const body = el('div', 'vc-tekst');
      body.innerHTML = markdown(item.text); // safe: markdown() escapes all text first
      n.append(body);
      return n;
    }
    if (item.type === 'opvraging') {
      const n = el('details', `vc-opvraging${item.ok ? '' : ' vc-opvraging--fout'}`);
      const extra = argText(item.args);
      n.append(el('summary', '', `Claude vroeg op: ${TOOL_LABELS[item.tool] ?? item.tool}${extra ? ` (${extra})` : ''}${item.ok ? '' : ' · mislukt'}`));
      n.append(el('pre', '', typeof item.result === 'string' ? item.result : JSON.stringify(item.result, null, 2)));
      return n;
    }
    if (item.type === 'goedkeuring') return approvalCard(item);
    return el('p', 'vc-melding', item.text ?? '');
  }

  /**
   * Red warning under a message: what went in that should not go to an AI
   * (found by the server, see systems/ai/sensitive.js). The chat warns, it
   * does not block.
   */
  function warning(list) {
    const box = el('div', 'vc-waarschuwing');
    box.setAttribute('role', 'alert');
    box.append(el('p', 'vc-waarschuwing-kop', 'Let op: hier stond informatie in die niet naar een AI mag'));
    const ul = el('ul');
    list.forEach((w) => ul.append(el('li', '', `${w.soort}: ${w.gevonden}`)));
    box.append(ul);
    const tip = el('p', '', 'Dit is nu naar de AI gegaan. Haal het de volgende keer eerst weg of vervang het door een label, zoals [IBAN]. ');
    const how = el('a', '', 'Zo maak je gegevens veilig');
    how.href = '/training/oefeningen/07-wat-mag-erin/#zo-maak-je-gegevens-veilig';
    how.target = '_blank'; how.rel = 'noopener';
    tip.append(how, '. De chat herkent niet alles: kijk ook zelf.');
    box.append(tip);
    return box;
  }

  /** The chat turns red as long as the last message had a warning. */
  function paintWarning(items) {
    const questions = items.filter((i) => i.type === 'vraag');
    if (questions.length) root.classList.toggle('vc--rood', Boolean(questions.at(-1).waarschuwingen?.length));
  }

  function approvalCard(item) {
    const n = el('div', 'vc-kaart');
    n.append(el('p', 'vc-kaart-kop', 'Claude wil een monteur aanvragen'));
    const dl = el('dl');
    for (const [k, v] of [['Verzoek', item.verzoek], ['Klant', item.klantnummer], ['Reden', item.reden || '-'], ['Voorgestelde tijd', item.tijd]]) dl.append(el('dt', '', k), el('dd', '', v));
    n.append(dl);
    const state = el('p', 'vc-kaart-status');
    const buttons = el('div', 'vc-kaart-knoppen');
    const decide = async (besluit) => {
      buttons.querySelectorAll('button').forEach((b) => { b.disabled = true; });
      try {
        const r = await api(`/chats/${chatId}/besluit`, { verzoek: item.verzoek, besluit });
        item.status = r.status;
      } catch (err) { state.textContent = err.message; }
      paint();
    };
    const yes = el('button', 'vc-ja', 'Goedkeuren'); yes.type = 'button'; yes.addEventListener('click', () => decide('goedkeuren'));
    const no = el('button', 'vc-nee', 'Afwijzen'); no.type = 'button'; no.addEventListener('click', () => decide('afwijzen'));
    buttons.append(yes, no);
    const paint = () => {
      const open = item.status === 'wacht op goedkeuring';
      buttons.hidden = !open;
      n.classList.toggle('vc-kaart--klaar', !open);
      if (!state.textContent || !open) state.textContent = open ? 'Controleer eerst zelf of een monteur echt nodig is. Er gebeurt niets zonder jouw besluit.' : `Status: ${item.status}.`;
    };
    paint();
    n.append(buttons, state);
    return n;
  }

  function showItems(items, replace) {
    if (replace) { thread.replaceChildren(); root.classList.remove('vc--rood'); }
    paintWarning(items);
    if (replace && items.length === 0) thread.append(chooser());
    for (const item of items) thread.append(renderItem(item));
    thread.scrollTop = thread.scrollHeight;
  }

  // ------------------------------------------------------------ conversations
  const list = el('ul', 'vc-lijst');
  const newButton = el('button', 'vc-nieuw', '+ Nieuw gesprek'); newButton.type = 'button';
  newButton.addEventListener('click', () => openChat(null));
  if (shape === 'volledig') {
    side.append(newButton, el('p', 'vc-zij-kop', 'Gesprekken'), list);
  } else {
    const panelNew = el('button', 'vc-klein', 'Nieuw gesprek'); panelNew.type = 'button';
    panelNew.addEventListener('click', () => openChat(null));
    const tab = el('a', 'vc-klein', 'Open in apart tabblad'); tab.href = '/training/oefeningen/claude/'; tab.target = '_blank'; tab.rel = 'noopener';
    controls.append(panelNew, tab);
  }

  async function refreshList() {
    if (shape !== 'volledig') return;
    const chats = await api('/chats').catch(() => []);
    list.replaceChildren(...chats.map((c) => {
      const li = el('li', c.chat_id === chatId ? 'vc-actief' : '');
      const open = el('button', 'vc-lijst-titel', c.title); open.type = 'button';
      open.addEventListener('click', () => openChat(c.chat_id));
      const del = el('button', 'vc-wis', '×'); del.type = 'button'; del.title = 'Gesprek verwijderen'; del.setAttribute('aria-label', `Verwijder ${c.title}`);
      del.addEventListener('click', async () => {
        if (!confirm('Dit gesprek verwijderen?')) return;
        await api(`/chats/${c.chat_id}/verwijderen`, {}).catch(() => {});
        if (c.chat_id === chatId) openChat(null); else refreshList();
      });
      li.append(open, del);
      return li;
    }));
  }

  async function openChat(id) {
    chatId = id;
    status.textContent = '';
    if (id === null) { title.textContent = 'Nieuw gesprek'; setAssistant(fixed); showItems([], true); refreshList(); return; }
    try {
      const c = await api(`/chats/${id}`);
      title.textContent = c.title;
      setAssistant(c.assistant);
      showItems(c.items, true);
    } catch (err) {
      // A remembered conversation may have been deleted: start a new one.
      if (err.status === 404) { chatId = null; title.textContent = 'Nieuw gesprek'; setAssistant(fixed); showItems([], true); } else status.textContent = err.message;
    }
    refreshList();
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || busy) return;
    if (!assistant) { status.textContent = 'Kies eerst een assistent.'; return; }
    busy = true; send.disabled = true;
    status.textContent = assistant === 'koppeling' ? 'Claude zoekt het uit in de systemen...' : 'Claude denkt na...';
    root.classList.add('vc--bezig');
    try {
      if (chatId === null) chatId = (await api('/chats', { context, assistent: assistant })).id;
      if (thread.querySelector('.vc-kies')) thread.replaceChildren();
      const r = await api(`/chats/${chatId}/bericht`, { tekst: text });
      input.value = '';
      title.textContent = r.title;
      showItems(r.items, false);
      status.textContent = '';
      refreshList();
      if (shape === 'paneel') { prefs[`chat-${context}`] = chatId; savePrefs(); }
    } catch (err) {
      status.textContent = err.message;
    } finally {
      busy = false; send.disabled = false;
      root.classList.remove('vc--bezig');
    }
  });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });

  // "Zet in de chat" on a prompt block (prompt.js): the prompt lands in the input,
  // the participant reads it and sends it. Nothing is sent automatically.
  document.addEventListener('vv-prompt', (e) => {
    if (!form.isConnected) { root.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    input.value = e.detail.text;
    root.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
    input.scrollTop = input.scrollHeight;
  });

  // ------------------------------------------------------------ start: login or chat
  function loginForm(message) {
    main.replaceChildren(bar);
    const box = el('form', 'vc-login');
    box.append(el('p', '', message));
    const code = el('input'); code.placeholder = 'VV-XXXX-XXXX'; code.autocomplete = 'off'; code.setAttribute('aria-label', 'Deelnemerscode');
    const go = el('button', 'vc-stuur', 'Inloggen'); go.type = 'submit';
    const err = el('p', 'vc-status');
    box.append(code, go, err);
    box.addEventListener('submit', async (e) => {
      e.preventDefault();
      try { await api('/login', { code: code.value }); location.reload(); } catch (x) { err.textContent = x.message; }
    });
    main.append(box);
  }

  (async () => {
    try { info = await api('/chat'); } catch { info = null; }
    if (!info) { main.replaceChildren(bar, el('p', 'vc-melding', 'De chat is nu niet bereikbaar.')); return; }
    if (!info.loggedIn) return loginForm('Log in met je deelnemerscode om met Claude te chatten. Je gesprekken worden bewaard, zodat de trainer ze kan nabespreken.');
    if (!info.enabled) { main.replaceChildren(bar, el('p', 'vc-melding', 'De AI staat uit. Vraag je trainer.')); return; }
    const remembered = shape === 'paneel' ? prefs[`chat-${context}`] : null;
    if (remembered) await openChat(remembered); else await openChat(null);
  })();
})();
