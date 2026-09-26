
(function(){
  const html = document.documentElement;
  const themeKey = 'nova-theme';
  const wrap = document.getElementById('sidebar-profile-wrap');
  const trigger = document.getElementById('sidebar-footer');
  const menu = document.getElementById('sidebar-profile-menu');

  function setTheme(theme){
    const next = theme === 'light' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    try{ localStorage.setItem(themeKey, next); }catch(e){}
    const label = document.getElementById('sidebar-theme-label');
    if(label) label.textContent = next === 'dark' ? 'Light mode' : 'Dark mode';
  }

  let saved = 'dark';
  try{ saved = localStorage.getItem(themeKey) || 'dark'; }catch(e){}
  setTheme(saved);

  function closeProfileMenu(){
    if(!wrap || !trigger || !menu) return;
    wrap.classList.remove('open');
    trigger.setAttribute('aria-expanded','false');
    menu.hidden = true;
  }
  function toggleProfileMenu(){
    if(!wrap || !trigger || !menu) return;
    const willOpen = menu.hidden;
    menu.hidden = !willOpen;
    wrap.classList.toggle('open', willOpen);
    trigger.setAttribute('aria-expanded', String(willOpen));
  }

  trigger?.addEventListener('click', (e)=>{
    e.stopPropagation();
    toggleProfileMenu();
  });

  document.addEventListener('click', (e)=>{
    if(wrap && !wrap.contains(e.target)) closeProfileMenu();
  });

  document.getElementById('sidebar-profile-open')?.addEventListener('click', ()=>{
    closeProfileMenu();
    if(typeof activateTab === 'function') activateTab('profile');
  });

  document.getElementById('sidebar-plan-open')?.addEventListener('click', async ()=>{
    closeProfileMenu();
    if(typeof activateTab === 'function') activateTab('profile');
    try{
      const res = await fetch('/api/gift?action=status');
      const data = await res.json();
      if(typeof openPlanSelect === 'function') openPlanSelect(data);
    }catch(e){
      if(typeof openPlanSelect === 'function') openPlanSelect({active:false});
    }
  });

  document.getElementById('sidebar-help-open')?.addEventListener('click', ()=>{
    closeProfileMenu();
    if(typeof activateTab === 'function') activateTab('profile');
    setTimeout(()=>{
      document.getElementById('profile-help-card')?.scrollIntoView({behavior:'smooth',block:'center'});
    },80);
  });

  document.getElementById('sidebar-theme-toggle')?.addEventListener('click', ()=>{
    setTheme(html.getAttribute('data-theme') === 'light' ? 'dark' : 'light');
  });

  document.getElementById('sidebar-logout')?.addEventListener('click', async ()=>{
    closeProfileMenu();
    try{
      await fetch('/api/auth', {method:'POST', credentials:'include', cache:'no-store'});
      if(typeof window.refreshMathlvlAuthState === 'function') await window.refreshMathlvlAuthState();
      if(typeof activateTab === 'function') activateTab('home');
    }catch(e){
      console.error('MATHLVL hisobidan chiqishda xatolik:', e);
    }
  });
})();
