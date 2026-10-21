// Lights up the dotted trail of a path (components/Pad.astro) step by step as it
// scrolls into view. Without this script the trail simply shows in full.
(function () {
  try {
    var lists = document.querySelectorAll('.pad-lijst');
    var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!lists.length || calm || !('IntersectionObserver' in window)) return;
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('zichtbaar'); obs.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
    lists.forEach(function (list) {
      list.classList.add('pad-anim');
      list.querySelectorAll('.pad-spoor').forEach(function (el) { obs.observe(el); });
    });
  } catch (err) { /* the trail is decoration; the page works without it */ }
})();
