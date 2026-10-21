// "Vind de fout": keeps the participant's choices in this browser only
// (localStorage) and copies them as text for the discussion with the trainer.
// The answer key is deliberately not here: it is trainer material. When the
// trainer releases it for a training, /api/ai/vindfout returns it and each item
// shows its explanation, but only after the participant chose "klopt" or not.
(() => {
  const form = document.getElementById('vindfout');
  if (!form) return;
  const KEY = 'vv-vindfout';
  const status = document.getElementById('vf-status');

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
    const data = {};
    for (const el of form.elements) {
      if (!el.name) continue;
      if (el.type === 'radio') { if (el.checked) data[el.name] = el.value; }
      else data[el.name] = el.value;
    }
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* private window: just don't keep it */ }
  };

  const load = () => {
    let data = {};
    try { data = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { data = {}; }
    for (const el of form.elements) {
      if (!el.name || !(el.name in data)) continue;
      if (el.type === 'radio') el.checked = el.value === data[el.name];
      else el.value = data[el.name];
    }
  };

  function asText() {
    const lines = ['Vind de fout: mijn antwoorden', ''];
    form.querySelectorAll('.vf-item').forEach((item) => {
      const nr = item.dataset.nr;
      const pick = (name) => form.querySelector(`input[name="${name}-${nr}"]:checked`)?.value ?? '-';
      const note = form.elements[`uitleg-${nr}`].value.trim();
      lines.push(`${nr}. schatting vooraf: ${pick('schatting')} | oordeel: ${pick('oordeel')}${note ? ` | ${note}` : ''}`);
    });
    return lines.join('\n');
  }

  // Released answers: shown per item once the participant has given a verdict.
  let answers = null;
  function showAnswers() {
    if (!answers) return;
    form.querySelectorAll('.vf-item').forEach((item) => {
      const nr = Number(item.dataset.nr);
      const a = answers.find((x) => x.nr === nr);
      let box = item.querySelector('.vf-antwoord');
      const chosen = form.querySelector(`input[name="oordeel-${nr}"]:checked`);
      if (!a || !chosen) { if (box) box.remove(); return; }
      if (!box) { box = document.createElement('div'); box.className = 'vf-antwoord'; item.append(box); }
      const head = document.createElement('p');
      head.className = 'vf-antwoord-kop';
      head.textContent = a.klopt ? 'Uitleg: dit antwoord klopt' : `Uitleg: dit antwoord klopt niet (${a.soort})`;
      const text = document.createElement('p');
      text.textContent = a.uitleg;
      box.replaceChildren(head, text);
    });
  }
  fetch('/api/ai/vindfout').then((r) => r.json()).then((d) => {
    if (!d.released) return;
    answers = d.answers;
    const note = document.getElementById('vf-vrijgegeven');
    if (note) note.hidden = false;
    showAnswers();
  }).catch(() => { /* no answers: the page works as before */ });

  form.addEventListener('input', save);
  form.addEventListener('change', () => { save(); showAnswers(); });
  document.getElementById('vf-kopieer').addEventListener('click', async () => {
    status.textContent = (await copyText(asText()))
      ? 'Gekopieerd. Plak je antwoorden waar de trainer om vraagt.'
      : 'Kopiëren lukte niet in deze browser.';
  });
  document.getElementById('vf-wis').addEventListener('click', () => {
    form.reset();
    form.querySelectorAll('.vf-antwoord').forEach((b) => b.remove());
    try { localStorage.removeItem(KEY); } catch { /* nothing kept */ }
    status.textContent = 'Alles gewist.';
  });
  load();
})();
