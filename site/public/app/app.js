// "Mijn Vezelvriend" oefen-app (fictional company).
// A small single-page app: login with customer number + postcode, then three
// tabs. All data comes from /api/mijn/ and is never stored in the browser,
// so a shared phone shows nothing after logging out.
(() => {
  const $ = (id) => document.getElementById(id);
  const screens = ['login', 'overzicht', 'meldingen', 'account'];
  let data = null;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }
  const row = (label, value) => { const r = el('div', 'app-rij'); r.append(el('span', '', label), el('span', '', value)); return r; };

  async function api(path, options) {
    const response = await fetch(`/api/mijn/${path}`, { credentials: 'same-origin', ...options });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(body.error || 'Er ging iets mis. Ben je online?'), { status: response.status });
    return body;
  }

  function show(name) {
    screens.forEach((s) => { $(`scherm-${s}`).hidden = s !== name; });
    const loggedIn = name !== 'login';
    $('tabs').hidden = !loggedIn;
    $('uitloggen').hidden = !loggedIn;
    document.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-current', b.dataset.tab === name ? 'page' : 'false'));
    window.scrollTo(0, 0);
  }

  // ------------------------------------------------------------ screens

  function renderOverview() {
    const s = $('scherm-overzicht');
    s.replaceChildren();
    s.append(el('h1', '', `Hallo ${data.klant.naam}`), el('p', 'app-zacht', data.klant.adres));

    const v = data.verbinding;
    const card = el('div', `app-kaart app-status app-status--${v.toestand}`);
    const symbol = { goed: '✓', fout: '!', storing: '!', 'let-op': '~', onbekend: '?' }[v.toestand] ?? '?';
    const text = el('div');
    text.append(el('h2', '', v.titel), el('p', '', v.uitleg));
    const details = [v.snelheid && `Gemeten snelheid: ${v.snelheid}`, v.gemeten && `Laatst gemeten: ${v.gemeten}`, v.storingsnummer && `Storingsnummer: ${v.storingsnummer}`].filter(Boolean);
    if (details.length) text.append(el('p', 'app-klein', details.join(' · ')));
    card.append(el('div', 'app-status-bol', symbol), text);
    s.append(card);

    if (v.toestand !== 'storing') {
      const restartCard = el('div', 'app-kaart');
      restartCard.append(el('h2', '', 'Vezelbox herstarten'), el('p', 'app-zacht', 'Lost veel problemen op. Je internet is daarna een paar minuten weg.'));
      const button = el('button', 'app-knop app-knop--rand', 'Herstart mijn Vezelbox');
      button.type = 'button';
      const msg = el('p', 'app-melding');
      msg.setAttribute('role', 'status');
      button.addEventListener('click', async () => {
        button.disabled = true;
        try { msg.className = 'app-melding app-melding--ok'; msg.textContent = (await api('herstart', { method: 'POST' })).melding; }
        catch (err) { msg.className = 'app-melding'; msg.textContent = err.message; }
        finally { button.disabled = false; }
      });
      restartCard.append(button, msg);
      s.append(restartCard);
    }

    if (data.abonnement) {
      const sub = el('div', 'app-kaart');
      sub.append(el('h2', '', 'Je abonnement'), row('Pakket', data.abonnement.naam), row('Snelheid', data.abonnement.snelheid), row('Prijs', data.abonnement.prijs), row('Klant sinds', data.abonnement.sinds));
      s.append(sub);
    }

    const pay = el('div', 'app-kaart');
    pay.append(el('h2', '', 'Betalen'), row('Openstaand', data.betalen.openstaand));
    pay.append(el('p', 'app-klein', data.betalen.alles_betaald ? 'Je hebt alles betaald.' : 'Je betaalt automatisch via incasso.'));
    s.append(pay);
    s.append(el('p', 'app-klein', `Oefenwereld: ${data.nu}`));
  }

  function renderMessages() {
    const s = $('scherm-meldingen');
    s.replaceChildren(el('h1', '', 'Meldingen'), el('p', 'app-zacht', 'Je contact met de klantenservice en je storingsmeldingen.'));
    const card = el('div', 'app-kaart');
    if (data.meldingen.length === 0) card.append(el('p', 'app-zacht', 'Geen meldingen.'));
    else {
      const list = el('ul', 'app-lijst');
      data.meldingen.forEach((m) => {
        const li = el('li');
        li.append(el('strong', '', m.titel), el('span', 'app-klein', `${m.datum} · ${m.status}`));
        list.append(li);
      });
      card.append(list);
    }
    s.append(card);
  }

  function renderAccount() {
    const s = $('scherm-account');
    s.replaceChildren(el('h1', '', 'Account'));
    const card = el('div', 'app-kaart');
    card.append(row('Naam', data.klant.naam), row('Klantnummer', data.klant.klantnummer), row('Adres', data.klant.adres));
    s.append(card);
    const help = el('div', 'app-kaart');
    help.append(el('h2', '', 'Hulp nodig?'), el('p', 'app-zacht', 'Klantenservice: 076 000 00 00 (verzonnen nummer). Storingen zie je ook op vezelvriend.nl/storingen.'));
    s.append(help);
    const note = el('div', 'app-kaart app-kaart--let-op');
    note.append(el('p', '', 'Dit is een oefen-app voor de AI-training van Methodica. Vezelvriend B.V. en alle klanten zijn verzonnen.'));
    s.append(note);
  }

  async function loadAndShow(tab = 'overzicht') {
    try {
      data = await api('overzicht');
      renderOverview(); renderMessages(); renderAccount();
      show(tab);
    } catch (err) {
      data = null;
      show('login');
      if (err.status !== 401) $('login-melding').textContent = err.message;
    }
  }

  // ------------------------------------------------------------ events

  $('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('login-melding').textContent = '';
    try {
      await api('login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ klantnummer: $('klantnummer').value, postcode: $('postcode').value }) });
      $('login-form').reset();
      await loadAndShow();
    } catch (err) { $('login-melding').textContent = err.message; }
  });

  // Demo customers come from the server: their postcode depends on the city
  // the training world is set to.
  api('demo').then((list) => {
    const ul = $('demo-lijst');
    ul.replaceChildren();
    list.forEach((c) => {
      const li = el('li');
      const b = el('button', '', c.naam);
      b.type = 'button';
      b.addEventListener('click', () => {
        $('klantnummer').value = c.klantnummer;
        $('postcode').value = c.postcode;
        $('login-form').requestSubmit();
      });
      li.append(b);
      ul.append(li);
    });
  }).catch(() => { $('demo-lijst').replaceChildren(el('li', 'app-zacht', 'Demoklanten konden niet worden geladen.')); });

  document.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => show(b.dataset.tab)));

  $('uitloggen').addEventListener('click', async () => {
    await api('logout', { method: 'POST' }).catch(() => {});
    data = null;
    show('login');
  });

  // ------------------------------------------------------------ install as app

  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (!standalone) $('installeer').hidden = false;
  let installPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installPrompt = e;
    $('installeer-knop').hidden = false;
  });
  $('installeer-knop').addEventListener('click', async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    $('installeer-knop').hidden = true;
  });

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/app/sw.js', { scope: '/app/' }).catch(() => {});

  loadAndShow();
})();
