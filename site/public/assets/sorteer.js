// "Groen, oranje of rood" (components/GroenOranjeRood.astro, step 7): the participant chooses for all
// twelve situations, locks the choices, and only then sees what the AI policy of
// Vezelvriend says. Choices stay in this browser only (localStorage).
(() => {
  const form = document.getElementById('sorteer');
  if (!form) return;
  const KEY = 'vv-sorteer';
  const RANK = { groen: 0, oranje: 1, rood: 2 };
  const items = [...form.querySelectorAll('.vf-item')];
  const lockButton = document.getElementById('sorteer-vast');
  const status = document.getElementById('sorteer-status');
  const result = document.getElementById('sorteer-uitslag');
  const resultText = document.getElementById('sorteer-tekst');

  let state = { keuze: {}, vast: false };
  try { state = Object.assign(state, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { /* fresh start */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* not kept */ } };

  function paint() {
    const chosen = Object.keys(state.keuze).length;
    for (const item of items) {
      const nr = item.dataset.nr;
      item.querySelectorAll('input').forEach((input) => {
        input.checked = state.keuze[nr] === input.value;
        input.disabled = state.vast;
      });
      item.querySelector('.vf-antwoord').hidden = !state.vast;
      // After locking: green when the choice matches the policy, red when it does not.
      const right = matches(state.keuze[nr], item.dataset.antwoord);
      item.classList.toggle('vf-item--goed', state.vast && right);
      item.classList.toggle('vf-item--fout', state.vast && !right);
      item.querySelector('.vf-uitslag').textContent = state.vast ? (right ? 'Goed' : 'Anders dan het beleid') : '';
    }
    lockButton.hidden = state.vast;
    lockButton.disabled = chosen < items.length;
    status.textContent = state.vast ? '' : `${chosen} van ${items.length} gekozen.`;
    result.hidden = !state.vast;
    if (state.vast) resultText.textContent = summary();
  }

  // "Weet ik niet" is the right answer where the policy says nothing.
  const matches = (mine, policy) => (policy === 'open' ? mine === 'weet ik niet' : mine === policy);

  function summary() {
    let same = 0, stricter = 0, looser = 0, unsure = 0, gapsSeen = 0;
    for (const item of items) {
      const mine = state.keuze[item.dataset.nr];
      const policy = item.dataset.antwoord;
      if (policy === 'open') { if (mine === 'weet ik niet') gapsSeen++; continue; }
      if (mine === 'weet ik niet') unsure++;
      else if (RANK[mine] === RANK[policy]) same++;
      else if (RANK[mine] > RANK[policy]) stricter++;
      else looser++;
    }
    const gaps = items.filter((i) => i.dataset.antwoord === 'open').length;
    const parts = [`${same} keer gelijk aan het beleid, ${stricter} keer strenger, ${looser} keer soepeler, ${unsure} keer "weet ik niet".`,
      `Bij ${gaps} situaties zegt het beleid niets; daar koos je ${gapsSeen} keer "weet ik niet".`];
    if (looser > 0) parts.push('Waar je soepeler was, zou je op je werk misschien iets doen wat niet mag. Schrijf die situaties op.');
    return parts.join(' ');
  }

  form.addEventListener('change', (e) => {
    if (state.vast || e.target.type !== 'radio') return;
    state.keuze[e.target.closest('.vf-item').dataset.nr] = e.target.value;
    save(); paint();
  });
  lockButton.addEventListener('click', () => { state.vast = true; save(); paint(); result.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
  document.getElementById('sorteer-wis').addEventListener('click', () => {
    if (!confirm('Al je keuzes wissen?')) return;
    state = { keuze: {}, vast: false }; save(); paint();
  });
  paint();
})();
