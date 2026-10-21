// The path of components/Pad.astro:
// - lights up the dotted trail step by step as it scrolls into view;
// - the length switch on the route page: "Kort" shows only the core steps,
//   "Alles" all of them. The choice is remembered in this browser. Hidden steps
//   keep their number, so the stones still match the "Stap N" of each page.
// Without this script all steps show and the trail is simply there.
(function () {
  var lists = document.querySelectorAll('.pad-lijst');
  if (!lists.length) return;
  var KEY = 'vv-route-lengte';

  // Cards alternate left and right over the visible steps only.
  function alternate(list) {
    var side = 0;
    list.querySelectorAll('.pad-stap').forEach(function (step) {
      if (step.classList.contains('pad-stap--uit')) return;
      step.classList.toggle('pad-stap--rechts', side % 2 === 1);
      side++;
    });
  }

  var group = document.querySelector('.route-lengte');
  if (group) {
    var setLength = function (length) {
      lists.forEach(function (list) {
        list.querySelectorAll('.pad-stap').forEach(function (step) {
          step.classList.toggle('pad-stap--uit', length === 'kort' && step.dataset.kern !== 'ja');
        });
        alternate(list);
      });
      group.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.lengte === length)); });
      document.querySelectorAll('.route-uitleg').forEach(function (p) { p.hidden = p.dataset.voor !== length; });
      try { localStorage.setItem(KEY, length); } catch (err) { /* not remembered */ }
    };
    group.hidden = false;
    group.addEventListener('click', function (e) {
      var button = e.target.closest('button');
      if (button) setLength(button.dataset.lengte);
    });
    var saved = 'alles';
    try { saved = localStorage.getItem(KEY) === 'kort' ? 'kort' : 'alles'; } catch (err) { /* default */ }
    setLength(saved);
  }

  try {
    var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (calm || !('IntersectionObserver' in window)) return;
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
