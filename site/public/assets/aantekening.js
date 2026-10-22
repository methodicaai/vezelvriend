// Note fields (components/Aantekening.astro): loads what the participant saved
// before and saves every change on the server (a short moment after typing
// stops), so the trainer can read it. Without a participant code (for example
// the trainer's own login) nothing is saved, and the field says so.
(() => {
  const boxes = [...document.querySelectorAll('.aant[data-pagina]')];
  if (!boxes.length) return;
  const API = '/api/ai/aantekeningen';

  const pages = [...new Set(boxes.map((b) => b.dataset.pagina))];
  pages.forEach(async (page) => {
    const mine = boxes.filter((b) => b.dataset.pagina === page);
    let saved = {};
    let canSave = true;
    try {
      const res = await fetch(`${API}?pagina=${encodeURIComponent(page)}`);
      if (res.status === 401) canSave = false;
      else if (res.ok) saved = await res.json();
    } catch { canSave = false; }

    for (const box of mine) {
      const area = box.querySelector('textarea');
      const status = box.querySelector('.aant-status');
      const field = box.dataset.veld;
      if (saved[field] && !area.value) area.value = saved[field];
      if (!canSave) { status.textContent = 'Niet bewaard: log in met je deelnemerscode om dit te bewaren.'; continue; }
      let timer = null;
      const save = async () => {
        status.textContent = 'Bewaren...';
        try {
          const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pagina: page, veld: field, tekst: area.value }) });
          const data = await res.json().catch(() => ({}));
          status.textContent = res.ok ? 'Bewaard. De trainer kan dit lezen.' : (data.error || 'Bewaren lukte niet.');
        } catch { status.textContent = 'Bewaren lukte niet. Controleer je verbinding.'; }
      };
      area.addEventListener('input', () => { clearTimeout(timer); status.textContent = ''; timer = setTimeout(() => { timer = null; save(); }, 800); });
      area.addEventListener('blur', () => { if (timer) { clearTimeout(timer); timer = null; save(); } });
    }
  });
})();
