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
    $('bestel-uitleg').textContent = addressOk ? 'Vul bij stap 6 je (verzonnen) gegevens in en klik op Bestellen.' : 'Check eerst je adres.';
  }

  // A practice IBAN of the made-up "Vezelvriend Oefenbank" (VVBK) with a
  // correct check number, so nobody needs to type in a real bank account.
  function practiceIban() {
    let account = '';
    for (let i = 0; i < 10; i++) account += Math.floor(Math.random() * 10);
    // Check number: 98 minus the remainder of (account + VVBK + NL00, letters as numbers) divided by 97.
    const digits = `VVBK${account}NL00`.replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55));
    let rest = 0;
    for (const d of digits) rest = (rest * 10 + Number(d)) % 97;
    const check = String(98 - rest).padStart(2, '0');
    return `NL${check}VVBK${account}`.replace(/(.{4})/g, '$1 ').trim();
  }

  function showErrors(errors = {}) {
    form.querySelectorAll('[data-fout]').forEach((el) => {
      el.textContent = errors[el.dataset.fout] ?? '';
      const input = form.elements[el.dataset.fout];
      if (input && input.setAttribute) input.setAttribute('aria-invalid', String(Boolean(errors[el.dataset.fout])));
    });
  }

  async function order(e) {
    e.preventDefault();
    if (!addressOk) {
      $('adres-uitkomst').className = 'pk-melding pk-melding--fout';
      $('adres-uitkomst').textContent = 'Check eerst of je adres in ons gebied valt.';
      $('adres-uitkomst').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const extras = {};
    form.querySelectorAll('.pk-extra input').forEach((input) => {
      extras[input.name] = input.type === 'checkbox' ? (input.checked ? 1 : 0) : Number(input.value) || 0;
    });
    const value = (name) => form.elements[name].value;
    const body = {
      adres: { postcode: value('postcode'), huisnummer: value('huisnummer'), toevoeging: value('toevoeging') },
      pakket: { snelheid: value('snelheid'), extras, installatie: value('installatie'), looptijd: value('looptijd') },
      klant: Object.fromEntries(['aanhef', 'voorletters', 'tussenvoegsel', 'achternaam', 'geboortedatum', 'email', 'telefoon', 'iban'].map((f) => [f, value(f)])),
      akkoord: form.elements.akkoord.checked,
    };
    const button = $('bestellen');
    button.disabled = true;
    $('bestel-uitleg').textContent = 'Bezig met bestellen...';
    try {
      const r = await fetch('/api/mijn/bestelling', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (r.status === 400 && d.errors) {
        showErrors(d.errors);
        $('bestel-uitleg').textContent = 'Niet alles is goed ingevuld. Kijk bij stap 6.';
        form.querySelector('[aria-invalid="true"]')?.focus();
        return;
      }
      if (!r.ok) throw new Error(d.error || 'Bestellen lukte niet. Probeer het opnieuw.');
      showErrors();
      $('b-bestelnummer').textContent = d.bestelnummer;
      $('b-klantnummer').textContent = d.klantnummer;
      $('b-postcode').textContent = d.postcode;
      $('bevestiging-tekst').textContent = `${d.naam}, we hebben je bestelling voor ${d.adres} ontvangen. `
        + (d.installatie === 'monteur' ? `De monteur komt op ${d.gepland}.` : `We bezorgen je Vezelbox op ${d.gepland}.`);
      $('b-klantsysteem').href = `/klantsysteem/?q=${encodeURIComponent(d.klantnummer)}`;
      $('b-klantbeeld').href = `/klantbeeld/klant/${encodeURIComponent(d.klantnummer)}`;
      form.hidden = true;
      $('bevestiging').hidden = false;
      button.hidden = true;
      $('bestel-uitleg').textContent = 'Besteld.';
      $('bevestiging').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      $('bestel-uitleg').textContent = err.message;
    } finally {
      button.disabled = false;
    }
  }

  $('adrescheck').addEventListener('click', checkAddress);
  $('maak-iban').addEventListener('click', () => { form.elements.iban.value = practiceIban(); });
  form.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.closest('.pk-adres')) { e.preventDefault(); checkAddress(); } });
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  form.addEventListener('submit', order);
  update();
})();
