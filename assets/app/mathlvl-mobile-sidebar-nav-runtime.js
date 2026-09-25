
(function(){
  const body = document.body;
  const btn = document.getElementById('mathlvl-mobile-menu-btn');
  const backdrop = document.getElementById('mathlvl-mobile-sidebar-backdrop');
  const sidebar = document.getElementById('mathlvl-main-sidebar');
  const section = document.getElementById('mathlvl-mobile-section');
  if(!btn || !backdrop || !sidebar) return;

  const titles = {home:'Bosh sahifa',books:'Kitoblar',teacher:'Ustoz AI',mocktest:'Mock Test',profile:'Profil'};
  function openMenu(){
    if(window.innerWidth >= 900 || body.classList.contains('reader-mode')) return;
    body.classList.add('mobile-sidebar-open');
    btn.setAttribute('aria-expanded','true');
  }
  function closeMenu(){
    body.classList.remove('mobile-sidebar-open');
    btn.setAttribute('aria-expanded','false');
    const profileMenu = document.getElementById('sidebar-profile-menu');
    const profileWrap = document.getElementById('sidebar-profile-wrap');
    if(profileMenu) profileMenu.hidden = true;
    if(profileWrap) profileWrap.classList.remove('open');
    document.getElementById('sidebar-footer')?.setAttribute('aria-expanded','false');
  }
  function syncSectionTitle(){
    let tab = 'home';
    const active = sidebar.querySelector('.sidebar-nav-item.active[data-sidebar-tab]');
    if(active?.dataset.sidebarTab) tab = active.dataset.sidebarTab;
    else if(document.getElementById('panel-profile')?.classList.contains('active')) tab = 'profile';
    if(section) section.textContent = titles[tab] || 'MATHLVL';
  }

  btn.addEventListener('click', ()=> body.classList.contains('mobile-sidebar-open') ? closeMenu() : openMenu());
  backdrop.addEventListener('click', closeMenu);
  sidebar.querySelectorAll('.sidebar-nav-item[data-sidebar-tab]').forEach(nav=>{
    nav.addEventListener('click', ()=>{
      if(section) section.textContent = titles[nav.dataset.sidebarTab] || 'MATHLVL';
      closeMenu();
    });
  });
  document.getElementById('sidebar-logo-btn')?.addEventListener('click', ()=>{
    if(section) section.textContent = titles.home;
    closeMenu();
  });
  sidebar.querySelectorAll('.sidebar-profile-action').forEach(action=>{
    action.addEventListener('click', ()=>{
      if(action.id === 'sidebar-profile-open' && section) section.textContent = titles.profile;
      setTimeout(closeMenu, 0);
    });
  });

  document.addEventListener('keydown', e=>{ if(e.key === 'Escape') closeMenu(); });
  window.addEventListener('resize', ()=>{ if(window.innerWidth >= 900) closeMenu(); });

  const observer = new MutationObserver(syncSectionTitle);
  document.querySelectorAll('.panel').forEach(p=>observer.observe(p,{attributes:true,attributeFilter:['class']}));
  observer.observe(body,{attributes:true,attributeFilter:['class']});
  syncSectionTitle();
})();
