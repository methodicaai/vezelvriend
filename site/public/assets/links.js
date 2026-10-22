// Links in the training pages: systems, company documents and other sites open
// in a new tab, so the exercise stays open next to them; links to a .txt or
// .csv file download the file instead of showing raw text. Done here rather
// than at build time, because the exercises are plain Markdown.
// Without JavaScript the links simply open in the same tab.
(() => {
  const NEW_TAB = /^(\/klantbeeld\/|\/klantsysteem\/|\/training\/oefeningen\/documenten\/|\/training\/oefeningen\/notities\/|\/training\/oefeningen\/code\/|\/pakket\/|\/$)/;
  document.querySelectorAll('main a[href]').forEach((a) => {
    const url = new URL(a.getAttribute('href'), location.href);
    if (a.closest('.site-header, .site-footer, .volgende, .pad-lijst')) return;
    if (/\.(txt|csv)$/.test(url.pathname) && url.origin === location.origin) { a.setAttribute('download', ''); return; }
    const external = url.origin !== location.origin;
    if ((external || NEW_TAB.test(url.pathname)) && !a.target) {
      a.target = '_blank';
      a.rel = 'noopener';
    }
  });
})();
