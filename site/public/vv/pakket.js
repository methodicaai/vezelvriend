// Package builder: keeps the basket up to date and checks the address.
// All amounts are calculated in cents to avoid rounding errors.
(() => {
  const form = document.getElementById('pakket');
  if (!form) return;
  const $ = (id) => document.getElementById(id);
  const cents = (euros) => Math.round(Number(euros) * 100);
  const euro = (c) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(c / 100);
  let addressOk = false;

  // Prefill the speed from a link like /pakket/?snelheid=vezel-1000
  const wanted = new URLSearchParams(location.search).get('snelheid');
  const preset = wanted && form.querySelector(`input[name="snelheid"][value="${CSS.escape(wanted)}"]`);
  if (preset) preset.checked = true;

  function update() {
    const speed = form.querySelector('input[name="snelheid"]:checked');
    const install = form.querySelector('input[name="installatie"]:checked');
    const term = form.querySelector('input[name="looptijd"]:checked');
    const lines = [];
    const speedC = cents(speed.dataset.price);
    lines.push([speed.dataset.name, `${euro(speedC)} p/m`]);

    // Extras, with the rule that some are only possible with certain speeds.
    let extrasC = 0;
    form.querySelectorAll('.pk-extra').forEach((box) => {
      const input = box.querySelector('input');
      const allowed = !box.dataset.onlyWith || box.dataset.onlyWith.split(' ').includes(speed.value);
      input.disabled = !allowed;
      box.querySelector('.pk-niet-mogelijk').hidden = allowed;
      if (!allowed) { if (input.type === 'checkbox') input.checked = false; else input.value = 0; }
      const count = input.type === 'checkbox' ? (input.checked ? 1 : 0)
        : Math.max(0, Math.min(Number(input.max), Math.floor(Number(input.value) || 0)));
      if (input.type !== 'checkbox' && String(count) !== input.value) input.value = String(count);
      if (count > 0) {
        const c = cents(input.dataset.price) * count;
        extrasC += c;
        lines.push([count > 1 ? `${count}x ${input.dataset.name}` : input.dataset.name, `${euro(c)} p/m`]);
      }
    });

    const onceC = cents(install.dataset.once) + cents(term.dataset.connection);
    if (cents(install.dataset.once) > 0) lines.push([install.dataset.name, `${euro(cents(install.dataset.once))} eenmalig`]);
    if (cents(term.dataset.connection) > 0) lines.push(['Aansluitkosten', `${euro(cents(term.dataset.connection))} eenmalig`]);
    lines.push([`Looptijd ${term.dataset.name}`, '']);

    // The discount applies to the speed only, not to the extras (see the conditions).
    const discountC = Math.round(speedC * Number(term.dataset.discountPercent) / 100);
    const normalC = speedC + extrasC;
    $('mandje-regels').replaceChildren(...lines.map(([name, price]) => {
      const li = document.createElement('li');
      const a = document.createElement('span'); a.textContent = name;
      const b = document.createElement('span'); b.textContent = price;
      li.append(a, b);
      return li;
    }));
    $('actie-label').textContent = `Eerste ${term.dataset.discountMonths} maanden`;
    $('actie-prijs').textContent = `${euro(normalC - discountC)} p/m`;
    $('maand-prijs').textContent = `${euro(normalC)} p/m`;
    $('eenmalig').textContent = euro(onceC);
  }

  async function checkAddress() {
    const out = $('adres-uitkomst');
    const params = new URLSearchParams({ postcode: form.postcode.value, huisnummer: form.huisnummer.value, toevoeging: form.toevoeging.value });
    out.className = 'pk-melding';
    out.textContent = 'Even kijken...';
    try {
      const r = await fetch(`/api/mijn/adrescheck?${params}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Dat lukte niet.');
      out.replaceChildren();
      if (d.inGebied === true) {
        addressOk = true;
        out.className = 'pk-melding pk-melding--goed';
        out.textContent = `Goed nieuws: glasvezel van Vezelvriend is beschikbaar op ${d.adres}.`;
      } else if (d.inGebied === null) {
        addressOk = false;
        out.textContent = 'Op dit huisnummer zijn meerdere adressen. Kies het jouwe:';
        d.keuze.forEach((k) => {
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'pk-adres-keuze'; b.textContent = k.adres;
          b.addEventListener('click', () => { form.toevoeging.value = k.toevoeging; checkAddress(); });
          out.append(b);
        });
      } else {
        addressOk = false;
        out.className = 'pk-melding pk-melding--fout';
        out.textContent = 'Helaas: op dit adres heeft Vezelvriend (nog) geen glasvezel. We zitten alleen in het centrum.';
      }
    } catch (err) {
      addressOk = false;
      out.className = 'pk-melding pk-melding--fout';
      out.textContent = err.message;
    }
    $('bestellen').setAttribute('aria-disabled', String(!addressOk));
    $('bestel-uitleg').textContent = addressOk ? 'Let op: dit is een oefenbedrijf. Bestellen kan niet echt.' : 'Check eerst je adres.';
  }

  $('adrescheck').addEventListener('click', checkAddress);
  form.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.closest('.pk-adres')) { e.preventDefault(); checkAddress(); } });
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  $('bestellen').addEventListener('click', (e) => { if (!addressOk) { e.preventDefault(); $('adres-uitkomst').textContent = 'Check eerst of je adres in ons gebied valt.'; } });
  update();
})();
