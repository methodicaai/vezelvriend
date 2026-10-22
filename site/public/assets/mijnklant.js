// Your own customer (step 3 and 6). Every participant gets a customer of their
// own (chosen at random by the server, then fixed); the trainer may pick any.
//
// - Fills every <div class="mijn-klant"> with who your customer is (or, for the
//   trainer, a list to choose from).
// - Turns links to a system into links for your customer, opening in a new tab:
//   in the Markdown a link like /klantbeeld/?systeem=modem becomes
//   /klantbeeld/klant/K-1004?tab=techniek&actie=controle. Without JavaScript the
//   link still opens the system, at its start page.
// - window.vvKlant lets prompt.js fill and link its fields for the same customer.
(() => {
  const API = '/api/ai/mijn-klant';
  const KEY = 'vv-trainer-klant';
  const SYSTEMS = {
    klantbeeld: { label: 'Open de klantgegevens in het Klantbeeld', href: (id) => `/klantbeeld/klant/${id}?tab=gegevens` },
    modem: { label: 'Open Modem controleren', href: (id) => `/klantbeeld/klant/${id}?tab=techniek&actie=controle` },
    historie: { label: 'Open de klanthistorie op het adres', href: (id) => `/klantbeeld/klant/${id}?tab=historie` },
    klantsysteem: { label: 'Open het Klantsysteem', href: (id) => `/klantsysteem/?q=${id}` },
    beslisboom: { label: 'Open de beslisboom', href: () => '/training/oefeningen/documenten/beslisboom/' },
  };
  const START = { klantbeeld: '/klantbeeld/', modem: '/klantbeeld/', historie: '/klantbeeld/', klantsysteem: '/klantsysteem/', beslisboom: SYSTEMS.beslisboom.href() };

  let current = null;
  let info = null;
  let loaded = false;
  const listeners = [];
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };

  const link = (key) => (SYSTEMS[key] ? (current || key === 'beslisboom' ? SYSTEMS[key].href(current?.customer_id) : START[key]) : null);

  function relink() {
    document.querySelectorAll('a[href*="systeem="], a[data-systeem]').forEach((a) => {
      const key = a.dataset.systeem ?? new URL(a.href, location.href).searchParams.get('systeem');
      if (!SYSTEMS[key]) return;
      a.dataset.systeem = key; // the href changes below; remember which system it is
      a.href = link(key);
      a.target = '_blank';
      a.rel = 'noopener';
    });
  }

  function set(klant) {
    current = klant;
    relink();
    paint();
    listeners.forEach((fn) => fn(current));
  }

  function paint() {
    document.querySelectorAll('.mijn-klant').forEach((box) => {
      box.replaceChildren();
      if (!info) return;
      if (info.vrij) {
        box.append(el('p', 'label', 'Klant voor deze oefening (trainer)'));
        const select = el('select');
        select.setAttribute('aria-label', 'Kies een klant');
        select.append(new Option('Kies een klant...', ''));
        info.klanten.forEach((k) => select.append(new Option(`${k.name} (${k.customer_id}), ${k.address}`, k.customer_id)));
        select.value = current?.customer_id ?? '';
        select.addEventListener('change', async () => {
          const klant = info.klanten.find((k) => k.customer_id === select.value) ?? null;
          try { localStorage.setItem(KEY, select.value); } catch { /* not kept */ }
          if (info.opgeslagen && klant) await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ klant: klant.customer_id }) }).catch(() => {});
          set(klant);
        });
        box.append(select, el('p', 'code-klein', 'Als trainer kies je zelf een klant. Deelnemers krijgen er een toegewezen.'));
        return;
      }
      if (!current) { box.append(el('p', '', 'Er is nog geen klant voor je gekozen. Vraag het de trainer.')); return; }
      box.append(el('p', 'label', 'Jouw klant'));
      box.append(el('p', 'mijn-klant-naam', `${current.name} (${current.customer_id})`));
      if (current.address) box.append(el('p', '', current.address));
      box.append(el('p', 'code-klein', 'Deze klant is voor jou gekozen. Je collega\'s hebben meestal een andere klant.'));
    });
  }

  const ready = fetch(API).then((r) => (r.ok ? r.json() : null)).catch(() => null).then((data) => {
    info = data;
    loaded = true;
    let klant = data?.klant ?? null;
    if (data?.vrij && !klant) {
      let saved = '';
      try { saved = localStorage.getItem(KEY) || ''; } catch { /* nothing kept */ }
      klant = data.klanten.find((k) => k.customer_id === saved) ?? null;
    }
    set(klant);
    return current;
  });

  window.vvKlant = {
    ready,
    systems: SYSTEMS,
    link,
    /** Calls fn now (once known) and every time the customer changes. */
    onChange(fn) { listeners.push(fn); if (loaded) fn(current); },
  };
  relink();
})();
