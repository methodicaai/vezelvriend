// Switch between two versions on a page (step 1: the short and the long
// prompt). Buttons in .wissel with data-deel, parts in .wissel-deel with the
// same data-deel. Without JavaScript both parts stay visible.
(() => {
  document.querySelectorAll('.wissel').forEach((group) => {
    const buttons = [...group.querySelectorAll('button[data-deel]')];
    const parts = [...document.querySelectorAll('.wissel-deel')].filter((p) => buttons.some((b) => b.dataset.deel === p.dataset.deel));
    const show = (key) => {
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.deel === key)));
      parts.forEach((p) => { p.hidden = p.dataset.deel !== key; });
    };
    buttons.forEach((b) => b.addEventListener('click', () => show(b.dataset.deel)));
    group.hidden = false;
    show(buttons[0].dataset.deel);
  });
})();
