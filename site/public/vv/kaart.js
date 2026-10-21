// Maps on the company website: service area, outage and the address from the
// package builder. Uses Leaflet (served from /vendor/, see site/scripts/) and
// the free background map of PDOK (Kadaster), so no API key is needed.
//
// Every element <div class="vv-kaart" data-kaart="gebied|storing|pakket">
// becomes a map. External script: the Content-Security-Policy forbids inline ones.
(() => {
  const elements = document.querySelectorAll('.vv-kaart[data-kaart]');
  if (elements.length === 0 || !window.L) return;
  const L = window.L;
  const TILES = 'https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/grijs/EPSG:3857/{z}/{x}/{y}.png';
  const COLOURS = { gebied: '#0f766e', buurt: '#0f766e', storing: '#d9480f', adres: '#1d4ed8' };

  function unavailable(el) {
    el.classList.add('vv-kaart--leeg');
    el.textContent = 'De kaart is nu niet beschikbaar.';
  }

  function baseMap(el, data) {
    const map = L.map(el, { scrollWheelZoom: false, minZoom: 12, maxZoom: 18 });
    L.tileLayer(TILES, {
      maxZoom: 19,
      attribution: 'Kaart: <a href="https://www.pdok.nl/">PDOK</a> / Kadaster · Gebied: CBS',
    }).addTo(map);
    const area = L.polygon(data.gebied, { color: COLOURS.gebied, weight: 3, fillOpacity: 0.08 }).addTo(map);
    map.fitBounds(area.getBounds(), { padding: [12, 12] });
    return { map, area };
  }

  function showArea(el, data) {
    const { map } = baseMap(el, data);
    for (const b of data.buurten) {
      L.polygon(b.rings, { color: COLOURS.buurt, weight: 1, dashArray: '4 4', fillOpacity: 0 })
        .bindTooltip(b.naam, { permanent: true, direction: 'center', className: 'vv-kaart-label' })
        .addTo(map);
    }
    return map;
  }

  function showOutage(el, data) {
    const { map } = baseMap(el, data);
    for (const s of data.storingen) {
      for (const p of s.punten) {
        L.circleMarker(p, { radius: 4, color: COLOURS.storing, fillColor: COLOURS.storing, fillOpacity: 0.9, weight: 1 })
          .bindTooltip(`Storing ${s.straten.join(', ')} sinds ${s.sinds}`)
          .addTo(map);
      }
    }
    return map;
  }

  function showPackage(el, data) {
    const { map } = baseMap(el, data);
    let marker = null;
    // pakket.js sends this event after a successful address check.
    document.addEventListener('vv:adres', (e) => {
      const { lat, lon, adres } = e.detail;
      if (marker) marker.remove();
      if (typeof lat !== 'number') return;
      marker = L.circleMarker([lat, lon], { radius: 9, color: '#fff', weight: 3, fillColor: COLOURS.adres, fillOpacity: 1 })
        .bindTooltip(adres, { permanent: true, direction: 'top', offset: [0, -10] })
        .addTo(map);
      map.setView([lat, lon], 16);
    });
    return map;
  }

  fetch('/vv/gebied.json')
    .then((r) => r.json())
    .then((data) => {
      elements.forEach((el) => {
        if (!data.beschikbaar) return unavailable(el);
        const kind = el.dataset.kaart;
        if (kind === 'gebied') showArea(el, data);
        else if (kind === 'storing') showOutage(el, data);
        else if (kind === 'pakket') showPackage(el, data);
      });
    })
    .catch(() => elements.forEach(unavailable));
})();
