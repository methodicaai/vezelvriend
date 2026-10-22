// Guided tours (components/Rondleiding.astro, steps 2 and 3): ticks off what the
// participant has looked at, with a counter. Remembered in this browser only.
(() => {
  const list = document.getElementById('tour');
  if (!list) return;
  const KEY = `vv-rondleiding-${list.dataset.opslag}`;
  const counter = document.getElementById('tour-teller');
  const noun = counter.dataset.woord;
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
    counter.textContent = n === steps.length ? `Alle ${n} ${noun} gevonden. Je bent klaar voor de volgende stap.` : `${n} van ${steps.length} ${noun} gevonden.`;
  };
  list.addEventListener('change', (e) => {
    if (e.target.name !== 'gevonden') return;
    done = e.target.checked ? [...new Set([...done, e.target.value])] : done.filter((k) => k !== e.target.value);
    try { localStorage.setItem(KEY, JSON.stringify(done)); } catch { /* not kept */ }
    paint();
  });
  paint();
})();
