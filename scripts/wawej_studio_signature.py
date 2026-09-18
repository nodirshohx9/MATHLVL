from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

# The current product keeps a single clickable Wawej footer signature.
# Do not re-inject the legacy sidebar credit or expect the old footer copy.
if 'class="wawej-product-footer"' in s and '<div class="wawej-signature"' not in s and '<div class="wawej-sidebar-credit"' not in s:
    print('Wawej Studio footer signature already applied; build step is compatible.')
    raise SystemExit(0)

MARKER = 'MATHLVL_WAWEJ_SIGNATURE_V1'
if MARKER in s:
    print('Wawej Studio signature already applied.')
    raise SystemExit(0)

sidebar_anchor = '''    <div class="sidebar-profile-wrap" id="sidebar-profile-wrap">'''
sidebar_credit = '''    <div class="wawej-sidebar-credit" aria-label="Designed and developed by Wawej Studio">
      <span class="wawej-credit-mark" aria-hidden="true">
        <svg viewBox="0 0 28 20"><path d="M2 5.2 7.1 3l6.8 10.1L20.8 3 26 5.2"/><path d="M5.4 6.4 13.9 18 22.6 6.4"/></svg>
      </span>
      <span class="wawej-credit-copy">
        <small>DESIGNED &amp; DEVELOPED BY</small>
        <strong>Wawej Studio</strong>
      </span>
    </div>

'''
if sidebar_anchor not in s:
    raise SystemExit('Sidebar profile anchor not found')
s = s.replace(sidebar_anchor, sidebar_credit + sidebar_anchor, 1)

footer_old = '''  <div class="footer-note">
    MATHLVL — matematika uchun yagona o‘quv muhiti.
  </div>'''
footer_new = '''  <div class="footer-note wawej-product-footer">
    <span class="wawej-footer-product">MATHLVL</span>
    <span class="wawej-footer-separator" aria-hidden="true"></span>
    <span class="wawej-footer-credit">Designed &amp; developed by <strong>Wawej Studio</strong></span>
  </div>'''
if footer_old not in s:
    raise SystemExit('Footer anchor not found')
s = s.replace(footer_old, footer_new, 1)

style = r'''
<style id="wawej-studio-signature-style">
/* MATHLVL_WAWEJ_SIGNATURE_V1 */
@media(min-width:900px){
  .wawej-sidebar-credit{
    margin-top:auto;
    min-height:50px;
    display:flex;
    align-items:center;
    gap:10px;
    padding:9px 10px;
    border:1px solid rgba(255,255,255,.055);
    border-radius:12px;
    background:linear-gradient(135deg,rgba(255,255,255,.024),rgba(115,128,255,.025));
    color:#8c96a6;
    user-select:none;
    transition:border-color .18s ease,background .18s ease,transform .18s ease;
  }
  .wawej-sidebar-credit:hover{
    border-color:rgba(125,137,255,.14);
    background:linear-gradient(135deg,rgba(255,255,255,.035),rgba(115,128,255,.045));
    transform:translateY(-1px);
  }
  .wawej-sidebar-credit + .sidebar-profile-wrap{
    margin-top:8px!important;
  }
  .wawej-credit-mark{
    width:31px;
    height:31px;
    flex:none;
    display:grid;
    place-items:center;
    border:1px solid rgba(125,137,255,.14);
    border-radius:9px;
    background:#111720;
    color:#aeb6ff;
  }
  .wawej-credit-mark svg{
    width:20px;
    height:15px;
    fill:none;
    stroke:currentColor;
    stroke-width:2.15;
    stroke-linecap:round;
    stroke-linejoin:round;
  }
  .wawej-credit-copy{
    min-width:0;
    display:flex;
    flex-direction:column;
    gap:2px;
    line-height:1.08;
  }
  .wawej-credit-copy small{
    color:#596576;
    font-size:6.6px;
    font-weight:800;
    letter-spacing:.12em;
    white-space:nowrap;
  }
  .wawej-credit-copy strong{
    color:#cbd1dc;
    font-family:var(--font-display);
    font-size:10.8px;
    font-weight:720;
    letter-spacing:-.01em;
  }
}

.wawej-product-footer{
  min-height:34px;
  display:flex!important;
  align-items:center;
  justify-content:center;
  gap:9px;
  color:#4d596a!important;
  font-family:var(--font-body)!important;
  font-size:9px!important;
  letter-spacing:.015em!important;
}
.wawej-footer-product{
  color:#687487;
  font-weight:760;
  letter-spacing:.08em;
}
.wawej-footer-separator{
  width:3px;
  height:3px;
  border-radius:50%;
  background:#606c7e;
  opacity:.62;
}
.wawej-footer-credit strong{
  color:#818cff;
  font-weight:750;
}

html[data-theme="light"] .wawej-sidebar-credit{
  border-color:rgba(31,45,67,.075);
  background:linear-gradient(135deg,#fafbfd,rgba(93,110,230,.025));
  color:#6c788b;
}
html[data-theme="light"] .wawej-sidebar-credit:hover{
  border-color:rgba(93,110,230,.16);
  background:linear-gradient(135deg,#f8faff,rgba(93,110,230,.045));
}
html[data-theme="light"] .wawej-credit-mark{
  border-color:rgba(93,110,230,.12);
  background:#f2f5fa;
  color:#6572dc;
}
html[data-theme="light"] .wawej-credit-copy small{color:#8994a5}
html[data-theme="light"] .wawej-credit-copy strong{color:#39465a}
html[data-theme="light"] .wawej-product-footer{color:#8994a4!important}
html[data-theme="light"] .wawej-footer-product{color:#687487}
html[data-theme="light"] .wawej-footer-separator{background:#9aa4b2}
html[data-theme="light"] .wawej-footer-credit strong{color:#5f6ed8}

@media(max-width:899px){
  .wawej-sidebar-credit{display:none!important}
  .wawej-product-footer{
    margin-top:36px!important;
    padding:0 8px 8px;
    flex-wrap:wrap;
    gap:6px 8px;
    font-size:8.5px!important;
  }
}
</style>
'''
if '</head>' not in s:
    raise SystemExit('Closing head tag not found')
s = s.replace('</head>', style + '\n</head>', 1)

p.write_text(s, encoding='utf-8')
print('Wawej Studio signature added to MATHLVL.')
