(() => {
  'use strict';
  try { localStorage.removeItem('mathlvl.teacher.profile'); } catch {}
  function init() {
    document.querySelectorAll('.teacher-picker').forEach(panel => panel.remove());
    const heading = document.querySelector('#ai-welcome h3');
    if (heading) heading.textContent = 'Birga tushunib olamiz.';
    const welcome = document.querySelector('#ai-welcome > p');
    if (welcome) welcome.textContent = 'Ustoz AI bilan mavzuni tushuning, masalani yeching va bilimlaringizni sinang.';
    document.querySelector('#ai-welcome .ai-welcome-kicker')?.replaceChildren(document.createTextNode('TUSHUNISH • MASHQ • NATIJA'));
    const input = document.getElementById('chat-input');
    if (input) { input.setAttribute('aria-label', 'Ustoz AI uchun savolingiz'); input.placeholder = 'Qaysi mavzuni tushunmayapsiz? Shu yerdan boshlaymiz…'; }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
