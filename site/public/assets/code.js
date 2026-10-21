// Code browser: search across all files (overview page) and copy a file
// (file page). External script because the Content-Security-Policy forbids
// inline scripts.
(() => {
  // ---- copy a whole file, to paste it into an AI as context
  const file = document.getElementById('code-bestand');
  const copy = document.getElementById('code-kopieer');
  if (file && copy) {
    copy.addEventListener('click', async () => {
      const text = [...file.querySelectorAll('code')].map((c) => c.textContent).join('\n');
      try {
        await navigator.clipboard.writeText(`Bestand: ${file.dataset.path}\n\n${text}\n`);
        copy.textContent = 'Gekopieerd';
      } catch {
        copy.textContent = 'Kopiëren lukte niet';
      }
      setTimeout(() => { copy.textContent = 'Kopieer bestand'; }, 2000);
    });
  }

  // ---- search
  const field = document.getElementById('code-zoekveld');
  if (!field) return;
  const status = document.getElementById('code-zoek-status');
  const list = document.getElementById('code-zoek-resultaten');
  const MAX = 100;
  let index = null;
  let timer = null;

  async function load() {
    if (index) return index;
    status.textContent = 'Code laden...';
    const r = await fetch(field.dataset.index);
    index = await r.json();
    return index;
  }

  async function search() {
    const q = field.value.trim().toLowerCase();
    list.replaceChildren();
    if (q.length < 2) { status.textContent = ''; return; }
    let files;
    try { files = await load(); } catch { status.textContent = 'Zoeken lukte niet. Ververs de pagina.'; return; }
    let count = 0;
    for (const f of files) {
      f.l.forEach((line, i) => {
        if (!line.toLowerCase().includes(q)) return;
        count++;
        if (count > MAX) return;
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `/training/oefeningen/code/${f.p}/#L${i + 1}`;
        a.textContent = `${f.p}:${i + 1}`;
        const code = document.createElement('code');
        code.textContent = line.trim().slice(0, 160);
        li.append(a, code);
        list.append(li);
      });
    }
    status.textContent = count === 0 ? 'Niets gevonden.'
      : count > MAX ? `${count} regels gevonden, de eerste ${MAX} staan hieronder. Zoek preciezer.`
      : `${count} regel${count === 1 ? '' : 's'} gevonden.`;
  }

  field.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(search, 200); });
})();
