from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

MARKER = 'MATHLVL_MOBILE_SIDEBAR_NAV_V1'
if MARKER in s:
    raise SystemExit(0)

shell = '<div class="app-shell">'
if shell not in s:
    raise SystemExit('app-shell not found')

mobile_bar = r'''
<div class="mathlvl-mobile-topbar" id="mathlvl-mobile-topbar">
  <button class="mathlvl-mobile-menu-btn" id="mathlvl-mobile-menu-btn" type="button" aria-label="Menyuni ochish" aria-expanded="false" aria-controls="mathlvl-main-sidebar">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
  </button>
  <div class="mathlvl-mobile-brand" aria-label="MATHLVL">
    <img src="/mathlvl-logo.png" alt="">
    <span>MATHLVL</span>
  </div>
  <div class="mathlvl-mobile-section" id="mathlvl-mobile-section">Bosh sahifa</div>
</div>
<div class="mathlvl-mobile-sidebar-backdrop" id="mathlvl-mobile-sidebar-backdrop" aria-hidden="true"></div>
'''
s = s.replace(shell, shell + '\n' + mobile_bar, 1)

# Give the existing desktop sidebar a stable mobile drawer target without duplicating navigation.
s = s.replace('<aside class="app-sidebar">', '<aside class="app-sidebar" id="mathlvl-main-sidebar">', 1)

addon = r'''
<style id="mathlvl-mobile-sidebar-nav-style">
/* MATHLVL_MOBILE_SIDEBAR_NAV_V1 */
.mathlvl-mobile-topbar,
.mathlvl-mobile-sidebar-backdrop{display:none}

@media (max-width:899px){
  /* Mobile uses the SAME navigation as desktop, inside a left drawer. */
  .bottom-nav{display:none!important}
  #mathlvl-guest-login{display:none!important}

  body:not(.reader-mode) .mathlvl-mobile-topbar{
    position:fixed;
    top:0;left:0;right:0;
    z-index:820;
    height:58px;
    display:grid;
    grid-template-columns:42px minmax(0,1fr) auto;
    align-items:center;
    gap:10px;
    padding:calc(7px + env(safe-area-inset-top,0px)) 12px 7px;
    background:rgba(7,14,31,.90);
    border-bottom:1px solid rgba(120,145,255,.14);
    box-shadow:0 10px 35px rgba(0,0,0,.20);
    backdrop-filter:blur(18px);
    -webkit-backdrop-filter:blur(18px);
  }
  .mathlvl-mobile-menu-btn{
    width:40px;height:40px;
    display:grid;place-items:center;
    border:1px solid rgba(120,145,255,.16);
    border-radius:12px;
    background:rgba(255,255,255,.035);
    color:#eaf0ff;
    padding:0;
  }
  .mathlvl-mobile-menu-btn svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round}
  .mathlvl-mobile-brand{display:flex;align-items:center;gap:9px;min-width:0}
  .mathlvl-mobile-brand img{width:27px;height:27px;object-fit:contain;filter:drop-shadow(0 0 9px rgba(78,111,255,.25))}
  .mathlvl-mobile-brand span{font-family:var(--font-display);font-weight:800;font-size:15px;letter-spacing:.035em;color:#f6f8ff}
  .mathlvl-mobile-section{
    max-width:108px;
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
    color:#8f9bb9;
    font-size:10.5px;
    font-weight:700;
    text-align:right;
  }

  .app-shell{display:block!important}
  .app-sidebar{
    display:flex!important;
    position:fixed!important;
    inset:0 auto 0 0!important;
    z-index:900!important;
    width:min(82vw,300px)!important;
    height:100dvh!important;
    min-height:100dvh!important;
    padding:calc(18px + env(safe-area-inset-top,0px)) 14px calc(14px + env(safe-area-inset-bottom,0px))!important;
    background:linear-gradient(180deg,rgba(8,17,38,.995),rgba(5,11,27,.995))!important;
    border-right:1px solid rgba(120,145,255,.16)!important;
    box-shadow:24px 0 70px rgba(0,0,0,.46)!important;
    transform:translateX(-104%);
    transition:transform .24s cubic-bezier(.2,.8,.2,1);
    overflow-y:auto;
    overscroll-behavior:contain;
  }
  body.mobile-sidebar-open .app-sidebar{transform:translateX(0)}

  .mathlvl-mobile-sidebar-backdrop{
    position:fixed;
    inset:0;
    z-index:880;
    display:block;
    background:rgba(1,4,12,.58);
    opacity:0;
    pointer-events:none;
    transition:opacity .22s ease;
    backdrop-filter:blur(3px);
    -webkit-backdrop-filter:blur(3px);
  }
  body.mobile-sidebar-open .mathlvl-mobile-sidebar-backdrop{opacity:1;pointer-events:auto}
  body.mobile-sidebar-open{overflow:hidden!important}

  .app-sidebar .sidebar-logo{
    display:flex!important;
    align-items:center!important;
    gap:10px!important;
    padding:4px 9px 20px!important;
  }
  .app-sidebar .sidebar-logo .mathlvl-logo-image{width:30px!important;height:30px!important}
  .app-sidebar .sidebar-logo span{font-family:var(--font-display);font-size:18px!important;font-weight:800;color:#fff!important}
  .app-sidebar .sidebar-logo:after{
    content:'MENYU';
    margin-left:auto;
    color:#6f7c9c;
    font-size:9px;
    font-weight:800;
    letter-spacing:.12em;
  }
  .app-sidebar .sidebar-nav-item{
    min-height:46px!important;
    padding:11px 12px!important;
    border-radius:10px!important;
    margin-bottom:5px!important;
    color:#aeb8d3!important;
  }
  .app-sidebar .sidebar-nav-item.active{
    background:linear-gradient(90deg,rgba(57,91,220,.34),rgba(69,77,181,.12))!important;
    color:#fff!important;
    box-shadow:inset 3px 0 #7185ff!important;
  }

  /* Desktop profile/account block is reused at the bottom of the drawer. */
  .sidebar-profile-wrap{margin-top:auto;position:relative;padding-top:14px;border-top:1px solid rgba(255,255,255,.055)}
  .sidebar-profile-trigger{
    width:100%;min-height:56px;border:1px solid rgba(120,145,255,.10);border-radius:12px;
    background:rgba(255,255,255,.025);color:var(--text);padding:10px;
    display:flex!important;align-items:center;gap:10px;text-align:left;
  }
  .sidebar-profile-trigger .sidebar-footer-text{flex:1;min-width:0}
  .profile-chevron{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;color:#78839f}
  .sidebar-profile-wrap.open .profile-chevron{transform:rotate(180deg)}
  .sidebar-profile-menu{
    position:absolute;left:0;right:0;bottom:64px;z-index:930;
    padding:8px;background:rgba(8,15,32,.99);
    border:1px solid rgba(111,132,255,.18);border-radius:14px;
    box-shadow:0 20px 55px rgba(0,0,0,.48)
  }
  .sidebar-profile-menu[hidden]{display:none!important}
  .sidebar-profile-action{
    width:100%;border:0;background:transparent;color:#c4cce2;
    display:flex;align-items:center;gap:10px;text-align:left;
    padding:10px;border-radius:9px;cursor:pointer;
    font-family:var(--font-body);font-size:12.5px;font-weight:600
  }
  .sidebar-profile-action:hover{background:rgba(111,124,255,.10);color:#fff}
  .sidebar-profile-action svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:none}
  .sidebar-profile-action .theme-icon-sun{display:none}
  .sidebar-profile-action.danger{color:#ff8585}
  .sidebar-profile-divider{height:1px;background:rgba(255,255,255,.06);margin:5px 4px}

  /* No bottom-nav reservation anymore; content gets a clean desktop-like canvas. */
  body:not(.reader-mode) .app{
    padding-top:calc(76px + env(safe-area-inset-top,0px))!important;
    padding-bottom:34px!important;
    padding-left:14px!important;
    padding-right:14px!important;
  }
  body:not(.reader-mode) .panel{margin-top:0!important}
  body:not(.reader-mode) .glass-card{border-radius:16px}

  body.reader-mode .mathlvl-mobile-topbar,
  body.reader-mode .mathlvl-mobile-sidebar-backdrop{display:none!important}
  body.reader-mode .app-sidebar{display:none!important}
}

@media (max-width:420px){
  body:not(.reader-mode) .app{padding-left:11px!important;padding-right:11px!important}
  .mathlvl-mobile-topbar{grid-template-columns:42px minmax(0,1fr) auto!important;padding-left:10px!important;padding-right:10px!important}
  .mathlvl-mobile-brand span{font-size:14px}
  .mathlvl-mobile-section{max-width:86px;font-size:9.5px}
  .app-sidebar{width:min(88vw,292px)!important}
}

html[data-theme="light"] .mathlvl-mobile-topbar{background:rgba(255,255,255,.94);border-bottom-color:rgba(31,57,104,.10);box-shadow:0 10px 30px rgba(45,72,117,.10)}
html[data-theme="light"] .mathlvl-mobile-menu-btn{background:#f7f9fd;border-color:rgba(31,57,104,.11);color:#20304d}
html[data-theme="light"] .mathlvl-mobile-brand span{color:#14203a}
html[data-theme="light"] .mathlvl-mobile-section{color:#68758f}
@media (max-width:899px){
  html[data-theme="light"] .app-sidebar{background:linear-gradient(180deg,#fff,#f7f9fd)!important;border-right-color:rgba(31,57,104,.10)!important;box-shadow:24px 0 70px rgba(45,72,117,.20)!important}
  html[data-theme="light"] .app-sidebar .sidebar-logo span{color:#14203a!important}
  html[data-theme="light"] .app-sidebar .sidebar-nav-item{color:#59657e!important}
  html[data-theme="light"] .app-sidebar .sidebar-nav-item.active{color:#3155d1!important;background:linear-gradient(90deg,rgba(66,103,232,.14),rgba(66,103,232,.05))!important}
  html[data-theme="light"] .sidebar-profile-trigger{background:#fff;border-color:rgba(31,57,104,.10)}
  html[data-theme="light"] .sidebar-profile-menu{background:#fff;border-color:rgba(31,57,104,.12);box-shadow:0 20px 55px rgba(45,72,117,.18)}
  html[data-theme="light"] .sidebar-profile-action{color:#58657e}
  html[data-theme="light"] .sidebar-profile-action:hover{background:rgba(66,103,232,.08);color:#1d3567}
  html[data-theme="light"] .sidebar-profile-action .theme-icon-moon{display:none}
  html[data-theme="light"] .sidebar-profile-action .theme-icon-sun{display:block}
}
</style>

<script id="mathlvl-mobile-sidebar-nav-runtime">
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
</script>
'''

if '</body>' not in s:
    raise SystemExit('closing body not found')
s = s.replace('</body>', addon + '\n</body>', 1)

required = [
    MARKER,
    'id="mathlvl-mobile-menu-btn"',
    'id="mathlvl-main-sidebar"',
    '.bottom-nav{display:none!important}',
    'body.mobile-sidebar-open .app-sidebar{transform:translateX(0)}',
]
for token in required:
    if token not in s:
        raise SystemExit(f'mobile sidebar token missing: {token}')

p.write_text(s, encoding='utf-8')
print('Mobile bottom nav replaced with desktop-style hamburger sidebar.')
