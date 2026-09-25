(() => {
  'use strict';
  const profiles = { male: { name: 'Aziz ustoz', label: 'Erkak ustoz', initial: 'A' }, female: { name: 'Malika ustoz', label: 'Ayol ustoz', initial: 'M' } };
  let selected = 'male';
  try { const saved = localStorage.getItem('mathlvl.teacher.profile'); if (profiles[saved]) selected = saved; } catch {}
  window.mathlvlTeacherProfile = selected;
  const panels = [];
  function update() {
    window.mathlvlTeacherProfile = selected;
    for (const panel of panels) {
      panel.querySelectorAll('[data-teacher-profile]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.teacherProfile === selected)));
      panel.querySelector('.teacher-selection-status').textContent = `${profiles[selected].name} tanlandi. Tanlov keyingi javoblarda ishlatiladi.`;
    }
    const heading = document.querySelector('#ai-welcome h3');
    if (heading) heading.textContent = 'Birga tushunib olamiz.';
    const welcome = document.querySelector('#ai-welcome > p');
    if (welcome) welcome.textContent = `${profiles[selected].name} bilan mavzuni tushuning, masalani yeching va bilimlaringizni sinang.`;
  }
  function createPicker(parent, before, compact) {
    if (!parent) return;
    const panel = document.createElement('section');
    panel.className = 'teacher-picker' + (compact ? ' teacher-picker-compact' : '');
    panel.setAttribute('aria-label', 'AI ustoz tanlash');
    panel.innerHTML = `<div class="teacher-picker-heading"><div><span class="teacher-eyebrow">SIZNING DARSINGIZ</span><h3>Ustozingizni tanlang</h3></div><span class="teacher-ai-badge">AI yordamchi</span></div><div class="teacher-options" role="group" aria-label="Ustoz obrazi">${Object.entries(profiles).map(([key, p]) => `<button type="button" class="teacher-option" data-teacher-profile="${key}" aria-pressed="false"><span class="teacher-avatar" aria-hidden="true">${p.initial}</span><span class="teacher-option-copy"><strong>${p.name}</strong><small>${p.label}</small></span><span class="teacher-check" aria-hidden="true">✓</span></button>`).join('')}</div><p class="teacher-selection-status" role="status" aria-live="polite"></p>`;
    panel.addEventListener('click', event => {
      const button = event.target.closest('[data-teacher-profile]');
      if (!button) return;
      selected = button.dataset.teacherProfile;
      try { localStorage.setItem('mathlvl.teacher.profile', selected); } catch {}
      update();
    });
    parent.insertBefore(panel, before || null);
    panels.push(panel);
  }
  function init() {
    const homeHero = document.querySelector('#panel-home .dash-home-hero');
    createPicker(homeHero?.parentElement, homeHero?.nextSibling, false);
    const chat = document.getElementById('chat-window');
    createPicker(chat?.parentElement, chat, false);
    const sheet = document.getElementById('ai-sheet-chat');
    createPicker(sheet?.parentElement, sheet, true);
    document.querySelector('#ai-welcome .ai-welcome-kicker')?.replaceChildren(document.createTextNode('TUSHUNISH • MASHQ • NATIJA'));
    const input = document.getElementById('chat-input');
    if (input) { input.setAttribute('aria-label', 'Ustoz AI uchun savolingiz'); input.placeholder = 'Qaysi mavzuni tushunmayapsiz? Shu yerdan boshlaymiz…'; }
    update();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
