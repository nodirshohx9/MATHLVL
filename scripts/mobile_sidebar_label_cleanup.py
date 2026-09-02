from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

MARKER = 'MATHLVL_MOBILE_SIDEBAR_LABEL_CLEANUP_V1'
if MARKER in s:
    raise SystemExit(0)

addon = r'''
<style id="mathlvl-mobile-sidebar-label-cleanup-v1">
/* MATHLVL_MOBILE_SIDEBAR_LABEL_CLEANUP_V1 */
@media (max-width:899px){
  .mathlvl-mobile-topbar{
    grid-template-columns:42px minmax(0,1fr)!important;
  }
  .mathlvl-mobile-section{
    display:none!important;
  }
  .app-sidebar .sidebar-logo:after{
    content:none!important;
    display:none!important;
  }
}
@media (max-width:420px){
  .mathlvl-mobile-topbar{
    grid-template-columns:42px minmax(0,1fr)!important;
  }
}
</style>
'''

if '</body>' not in s:
    raise SystemExit('closing body not found')
s = s.replace('</body>', addon + '\n</body>', 1)

for token in [MARKER, '.mathlvl-mobile-section', 'content:none!important']:
    if token not in s:
        raise SystemExit(f'label cleanup token missing: {token}')

p.write_text(s, encoding='utf-8')
print('Removed mobile topbar section label and sidebar MENYU label.')
