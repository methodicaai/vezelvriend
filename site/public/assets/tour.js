// Step 3: ticks off the systems the participant has looked at, with a counter.
// Remembered in this browser only.
(() => {
  const list = document.getElementById('tour');
  if (!list) return;
  const KEY = 'vv-systemen-gevonden';
  const counter = document.getElementById('tour-teller');
  const steps = [...list.querySelectorAll('.tour-stap')];
  let done = [];
  try { done = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { /* fresh start */ }

  const paint = () => {
    steps.forEach((s) => {
      const on = done.includes(s.dataset.systeem);
      s.classList.toggle('tour-stap--klaar', on);
      s.querySelector('input').checked = on;
    });
    const n = steps.filter((s) => done.includes(s.dataset.systeem)).length;
    counter.textContent = n === steps.length ? `Alle ${n} systemen gevonden. Je bent klaar voor stap 4.` : `${n} van ${steps.length} systemen gevonden.`;
  };
  list.addEventListener('change', (e) => {
    if (e.target.name !== 'gevonden') return;
    done = e.target.checked ? [...new Set([...done, e.target.value])] : done.filter((k) => k !== e.target.value);
    try { localStorage.setItem(KEY, JSON.stringify(done)); } catch { /* not kept */ }
    paint();
  });
  paint();
})();
