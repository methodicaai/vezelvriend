// Worksheets: keeps the if-then card in this browser only (localStorage),
// and lets the participant print or copy it. Nothing is sent anywhere.
(() => {
  const form = document.getElementById('alsdan');
  if (!form) return;
  const KEY = 'vv-alsdan';
  const status = document.getElementById('ad-status');

  // Copy with a fallback: some browsers (or embedded views) refuse the clipboard API.
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch {
      const area = document.createElement('textarea');
      area.className = 'prompt-verborgen';
      area.value = text;
      document.body.append(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    }
  }

  const save = () => {
    const data = Object.fromEntries([...form.elements].filter((el) => el.name).map((el) => [el.name, el.value]));
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* private window: not kept */ }
  };
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || '{}');
    for (const el of form.elements) if (el.name && el.name in data) el.value = data[el.name];
  } catch { /* nothing kept yet */ }

  function asText() {
    const v = (name) => form.elements[name].value.trim();
    const lines = ['Mijn als-dan-kaart', '', `AI op het werk: ${v('tool') || '-'}`, `Trede: ${v('trede') || '-'}`, ''];
    for (const n of [1, 2, 3]) if (v(`als-${n}`) || v(`dan-${n}`)) lines.push(`Als ik ${v(`als-${n}`)}, dan ${v(`dan-${n}`)}`);
    if (v('zelf')) lines.push('', `Bewust zelf: ${v('zelf')}`);
    if (v('uitzoeken')) lines.push(`Nog uitzoeken: ${v('uitzoeken')}`);
    return lines.join('\n');
  }

  form.addEventListener('input', save);
  form.addEventListener('change', save);
  document.getElementById('ad-print').addEventListener('click', () => window.print());
  document.getElementById('ad-kopieer').addEventListener('click', async () => {
    status.textContent = (await copyText(asText())) ? 'Gekopieerd.' : 'Kopiëren lukte niet in deze browser.';
  });
})();
