(() => {
  const section = document.querySelector('#install-app');
  const button = document.querySelector('#install-android');
  let installRequest;
  const standalone = matchMedia('(display-mode: standalone)');
  function update() {
    section.hidden = standalone.matches || navigator.standalone === true;
    button.hidden = !installRequest;
  }
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installRequest = event;
    update();
  });
  button.addEventListener('click', async () => {
    const request = installRequest;
    if (!request) return;
    installRequest = null;
    update();
    try { await request.prompt(); await request.userChoice; }
    catch { /* The browser menu remains available. */ }
  });
  window.addEventListener('appinstalled', () => { installRequest = null; section.hidden = true; });
  standalone.addEventListener('change', update);
  update();
})();