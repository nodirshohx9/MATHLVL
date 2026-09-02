from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

MARKER = 'MATHLVL_MOBILE_SIDEBAR_POLISH_V3'
if MARKER in s:
    raise SystemExit(0)

addon = r'''
<style id="mathlvl-mobile-sidebar-polish-v3">
/* MATHLVL_MOBILE_SIDEBAR_POLISH_V3 */
@media (max-width:899px){
  /* The desktop sidebar becomes a compact OpenAI-style mobile drawer. */
  .app-sidebar{
    display:flex!important;
    flex-direction:column!important;
    flex-wrap:nowrap!important;
    align-items:stretch!important;
    flex:0 0 auto!important;
    width:min(78vw,280px)!important;
    max-width:280px!important;
    box-sizing:border-box!important;
  }

  .app-sidebar .sidebar-logo{flex:0 0 auto!important}
  .app-sidebar .sidebar-nav-item{
    display:flex!important;
    flex:0 0 auto!important;
    align-items:center!important;
    gap:10px!important;
    width:100%!important;
    min-width:0!important;
    border:0!important;
    background:transparent!important;
    font-family:var(--font-body)!important;
    font-size:13.5px!important;
    font-weight:650!important;
    text-align:left!important;
    cursor:pointer!important;
    appearance:none;
    -webkit-appearance:none;
  }
  .app-sidebar .sidebar-nav-item:hover{background:rgba(255,255,255,.04)!important;color:#eef2ff!important}
  .app-sidebar .sidebar-nav-item.active{background:linear-gradient(90deg,rgba(57,91,220,.34),rgba(69,77,181,.12))!important}
  .app-sidebar .sidebar-nav-item .ic{display:grid!important;place-items:center!important;width:20px!important;flex:none!important}
  .app-sidebar .sidebar-nav-item .ic svg{width:18px!important;height:18px!important}

  .sidebar-profile-wrap{width:100%!important;min-width:0!important}
  .sidebar-profile-trigger{cursor:pointer!important;font-family:var(--font-body)!important;box-sizing:border-box!important}
  .sidebar-footer-avatar{
    width:34px!important;height:34px!important;border-radius:50%!important;flex:none!important;
    display:flex!important;align-items:center!important;justify-content:center!important;
    overflow:hidden!important;background:linear-gradient(135deg,var(--blue),var(--gold))!important;
    color:var(--space-1)!important;font-size:13px!important;font-weight:800!important
  }
  .sidebar-footer-avatar img{width:100%!important;height:100%!important;object-fit:cover!important}
  .sidebar-footer-text{min-width:0!important;flex:1 1 auto!important}
  .sidebar-footer-text .sft-name{font-size:12.5px!important;font-weight:750!important;color:#eef2ff!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .sidebar-footer-text .sft-plan{font-size:10.5px!important;color:#7f8ba8!important;margin-top:2px}

  /* Keep the closed drawer completely outside the viewport. */
  body:not(.mobile-sidebar-open) .app-sidebar{transform:translate3d(-105%,0,0)!important}
  body.mobile-sidebar-open .app-sidebar{transform:translate3d(0,0,0)!important}

  html[data-theme="light"] .app-sidebar .sidebar-nav-item:hover{background:rgba(66,103,232,.06)!important;color:#21365e!important}
  html[data-theme="light"] .sidebar-footer-text .sft-name{color:#14203a!important}
  html[data-theme="light"] .sidebar-footer-text .sft-plan{color:#68758f!important}
}

@media (max-width:420px){
  .app-sidebar{width:min(80vw,276px)!important;max-width:276px!important}
}
</style>
<script id="mathlvl-mobile-sidebar-polish-runtime-v3">
(function(){
  const gate = document.getElementById('mathlvl-auth-gate');
  const menuBtn = document.getElementById('mathlvl-mobile-menu-btn');
  if(!gate) return;
  const closeDrawer = ()=>{
    document.body.classList.remove('mobile-sidebar-open');
    menuBtn?.setAttribute('aria-expanded','false');
  };
  const obs = new MutationObserver(()=>{
    if(!gate.hidden) closeDrawer();
  });
  obs.observe(gate,{attributes:true,attributeFilter:['hidden']});
})();
</script>
'''

if '</body>' not in s:
    raise SystemExit('closing body not found')
s = s.replace('</body>', addon + '\n</body>', 1)

for token in [MARKER, 'flex-direction:column!important', 'width:min(78vw,280px)!important', 'mathlvl-mobile-sidebar-polish-runtime-v3']:
    if token not in s:
        raise SystemExit(f'mobile drawer polish missing: {token}')

p.write_text(s, encoding='utf-8')
print('Mobile hamburger drawer fixed: compact vertical sidebar.')
