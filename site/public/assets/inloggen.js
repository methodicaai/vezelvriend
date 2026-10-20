// Participant login for the exercises. After a successful login the visitor
// goes back to the exercise they tried to open (?terug=...), or to the list.
(() => {
  const form = document.getElementById('inlog-form');
  const input = document.getElementById('code');
  const message = document.getElementById('inlog-melding');
  if (!form) return;

  // Only allow going back to an exercise page on this site, never elsewhere.
  const wanted = new URLSearchParams(location.search).get('terug') || '';
  const target = /^\/training\/oefeningen\/[\w\-/]*$/.test(wanted) ? wanted : '/training/oefeningen/';

  // Already logged in (e.g. the cookie is still valid): go straight on.
  fetch('/api/ai/status').then((r) => r.json()).then((s) => { if (s.loggedIn) location.replace(target); }).catch(() => {});

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    message.textContent = '';
    try {
      const response = await fetch('/api/ai/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: input.value }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Inloggen lukte niet.');
      location.replace(target);
    } catch (err) {
      message.textContent = err.message;
    }
  });
})();
