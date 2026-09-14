from pathlib import Path
import re

p = Path('index.html')
s = p.read_text(encoding='utf-8')

MARKER = 'MATHLVL_GIFT_QR_CLEANUP_V2'
if MARKER in s:
    raise SystemExit(0)

# Remove the redundant profile Help card shown under Plus gift.
s, removed = re.subn(
    r'\n\s*<div class="glass-card profile-section-card" id="profile-help-card"[^>]*>.*?</div>\s*\n',
    '\n',
    s,
    count=1,
    flags=re.S,
)
if removed != 1:
    raise SystemExit('profile help card not found')

old = '''      <div class="glass-card profile-section-card" style="margin-top:16px;">
        <h3>🎁 Sovg'a Plus</h3>
        <p style="font-size:13px; color:var(--text-dim); margin:6px 0 14px;">Sovg'a kodingiz yoki QR kodingiz bormi?</p>
        <button class="ghost-btn" id="open-redeem-btn">Sovg'ani faollashtirish</button>
      </div>'''

new = '''      <div class="glass-card profile-section-card" id="profile-gift-card" style="margin-top:16px;">
        <div class="mathlvl-gift-card-head">
          <div class="mathlvl-gift-card-icon" aria-hidden="true">🎁</div>
          <div>
            <h3 style="margin:0;">Plus sovg'asi</h3>
            <p>QR kodni kamerada skaner qiling yoki sovg'a kodini qo'lda kiriting.</p>
          </div>
        </div>
        <div class="mathlvl-gift-actions">
          <button class="ghost-btn mathlvl-gift-action" id="profile-gift-qr-btn" type="button">
            <span class="mathlvl-gift-action-ic" aria-hidden="true">▦</span>
            <span><b>QR skaner</b><small>Kamera orqali</small></span>
          </button>
          <button class="ghost-btn mathlvl-gift-action" id="open-redeem-btn" type="button">
            <span class="mathlvl-gift-action-ic" aria-hidden="true">⌨</span>
            <span><b>Kodni terish</b><small>Qo'lda kiritish</small></span>
          </button>
        </div>
      </div>'''

if old not in s:
    raise SystemExit('profile gift card not found')
s = s.replace(old, new, 1)

# Improve copy/placeholder in the existing redeem screen without changing backend behavior.
s = s.replace(
    '<p style="font-size:13px; color:var(--text-dim); margin-bottom:20px;">QR kodni skaner qiling yoki kodni kiriting.</p>',
    '<p style="font-size:13px; color:var(--text-dim); margin-bottom:18px;">Usulni tanlang: QR skaner yoki sovg\'a kodini qo\'lda kiriting.</p>',
    1,
)
s = s.replace(
    'placeholder="XXXX-XXXX-XXXX"',
    'placeholder="MATHLVL-XXXX-XXXX-XXXX" autocomplete="off" autocapitalize="characters" spellcheck="false"',
    1,
)

addon = r'''
<style id="mathlvl-gift-qr-cleanup-style">
/* MATHLVL_GIFT_QR_CLEANUP_V2 */
.mathlvl-gift-card-head{display:flex;align-items:flex-start;gap:12px}
.mathlvl-gift-card-icon{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;flex:none;background:rgba(255,201,60,.10);border:1px solid rgba(255,201,60,.20);font-size:19px}
.mathlvl-gift-card-head p{font-size:12.5px;color:var(--text-dim);line-height:1.55;margin:5px 0 0}
.mathlvl-gift-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:15px}
.mathlvl-gift-action{min-height:60px!important;border-radius:13px!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:10px!important;padding:10px 12px!important;text-align:left!important}
.mathlvl-gift-action-ic{width:32px;height:32px;border-radius:9px;display:grid;place-items:center;flex:none;background:rgba(111,124,255,.10);font-size:16px}
.mathlvl-gift-action span:last-child{min-width:0;display:flex;flex-direction:column;gap:2px}
.mathlvl-gift-action b{font-size:12.5px;color:var(--text);font-family:var(--font-body)}
.mathlvl-gift-action small{font-size:10.5px;color:var(--text-dim);font-family:var(--font-body);font-weight:500}
#qr-scan-btn{min-height:46px;border-radius:12px!important}
#qr-scanner-wrap{padding:10px;border:1px solid var(--border);border-radius:14px;background:rgba(5,7,18,.26)}
#qr-scanner-view{min-height:220px;background:#050711}
#qr-scanner-view video{border-radius:10px!important;object-fit:cover!important}
#manual-redeem-input{text-transform:uppercase}
html[data-theme="light"] #qr-scanner-wrap{background:rgba(245,248,255,.85)}
@media (max-width:420px){
  .mathlvl-gift-actions{grid-template-columns:1fr}
  .mathlvl-gift-action{min-height:56px!important}
}
</style>
<script id="mathlvl-gift-qr-cleanup-runtime">
(function(){
  const qrQuick = document.getElementById('profile-gift-qr-btn');
  const manualQuick = document.getElementById('open-redeem-btn');
  const input = document.getElementById('manual-redeem-input');
  const scanBtn = document.getElementById('qr-scan-btn');
  const overlay = document.getElementById('redeem-screen-overlay');
  const oldHelp = document.getElementById('sidebar-help-open');

  function openGift(){
    if(typeof openRedeemScreen === 'function') openRedeemScreen();
    else overlay?.classList.add('open');
  }

  qrQuick?.addEventListener('click', ()=>{
    openGift();
    // Keep scanner start in the same user gesture for stricter mobile browsers.
    scanBtn?.click();
  });

  manualQuick?.addEventListener('click', ()=>{
    window.setTimeout(()=> input?.focus({preventScroll:false}), 80);
  });

  input?.addEventListener('input', ()=>{
    const pos = input.selectionStart;
    input.value = input.value.toUpperCase().replace(/\s+/g,'');
    try{ input.setSelectionRange(pos,pos); }catch(e){}
  });

  // If the redeem overlay is closed by any future UI action, make sure camera is released.
  const obs = overlay ? new MutationObserver(()=>{
    if(!overlay.classList.contains('open') && typeof stopQrScanner === 'function') stopQrScanner();
  }) : null;
  if(obs) obs.observe(overlay,{attributes:true,attributeFilter:['class']});

  // The profile Help card is gone; keep the sidebar support action useful and route it to Telegram.
  if(oldHelp){
    const help = oldHelp.cloneNode(true);
    oldHelp.replaceWith(help);
    help.addEventListener('click', ()=>{
      document.body.classList.remove('mobile-sidebar-open');
      document.getElementById('mathlvl-mobile-menu-btn')?.setAttribute('aria-expanded','false');
      window.open('https://t.me/mathlvl_admin','_blank','noopener,noreferrer');
    });
  }
})();
</script>
'''

if '</body>' not in s:
    raise SystemExit('closing body not found')
s = s.replace('</body>', addon + '\n</body>', 1)

for token in [
    MARKER,
    'id="profile-gift-qr-btn"',
    'id="open-redeem-btn"',
    'MATHLVL-XXXX-XXXX-XXXX',
    'mathlvl-gift-qr-cleanup-runtime',
]:
    if token not in s:
        raise SystemExit(f'missing token: {token}')

p.write_text(s, encoding='utf-8')
print('Removed profile Help card and hardened Plus gift QR/manual redeem UX.')
