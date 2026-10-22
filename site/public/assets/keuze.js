// Step 9: choose one part of the page (analyst, tester, SQL, code). First only
// the choices show; after choosing, only that part, with the choices on top to
// switch. The choice is in the address (#tester), so the route can link to a
// part, and it is remembered in this browser. Without JavaScript all parts show.
(() => {
  const group = document.querySelector('.keuze-kaarten');
  if (!group) return;
  const KEY = 'vv-verdiepen-keuze';
  const cards = [...group.querySelectorAll('.keuze-kaart')];
  const parts = [...document.querySelectorAll('.keuze-deel')];
  const status = document.getElementById('keuze-status');
  const valid = (k) => cards.some((c) => c.dataset.keuze === k);

  function show(key, scroll) {
    cards.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.keuze === key)));
    parts.forEach((p) => { p.hidden = p.dataset.keuze !== key; });
    status.textContent = key ? '' : 'Kies hierboven een onderdeel.';
    if (!key) return;
    try { localStorage.setItem(KEY, key); } catch { /* not kept */ }
    history.replaceState(null, '', `#${key}`);
    if (scroll) group.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  cards.forEach((c) => c.addEventListener('click', () => show(c.dataset.keuze, true)));
  window.addEventListener('hashchange', () => { const k = location.hash.slice(1); if (valid(k)) show(k, false); });
  group.hidden = false;
  let start = location.hash.slice(1);
  if (!valid(start)) { try { start = localStorage.getItem(KEY) || ''; } catch { start = ''; } }
  show(valid(start) ? start : '', false);
})();
