from pathlib import Path
import re

p = Path('index.html')
s = p.read_text(encoding='utf-8')

MARKER = 'MATHLVL_GIFT_QR_CLEANUP_V1'
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
            <p>Sovg'ani QR orqali skaner qiling yoki kodni qo'lda kiriting.</p>
          </div>
        </div>
        <div class="mathlvl-gift-actions">
          <button class="ghost-btn mathlvl-gift-action" id="profile-gift-qr-btn" type="button">
            <span class="mathlvl-gift-action-ic" aria-hidden="true">▦</span>
            <span><b>QR skaner</b><small>Kameradan o'qish</small></span>
          </button>
          <button class="ghost-btn mathlvl-gift-action" id="open-redeem-btn" type="button">
            <span class="mathlvl-gift-action-ic" aria-hidden="true">⌨</span>
            <span><b>Kodni kiritish</b><small>Qo'lda yozish</small></span>
          </button>
        </div>
      </div>'''

if old not in s:
    raise SystemExit('profile gift card not found')
s = s.replace(old, new, 1)

addon = r'''
<style id="mathlvl-gift-qr-cleanup-style">
/* MATHLVL_GIFT_QR_CLEANUP_V1 */
.mathlvl-gift-card-head{display:flex;align-items:flex-start;gap:12px}
.mathlvl-gift-card-icon{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;flex:none;background:rgba(255,201,60,.10);border:1px solid rgba(255,201,60,.20);font-size:18px}
.mathlvl-gift-card-head p{font-size:12.5px;color:var(--text-dim);line-height:1.55;margin:5px 0 0}
.mathlvl-gift-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:15px}
.mathlvl-gift-action{min-height:58px!important;border-radius:12px!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:10px!important;padding:10px 12px!important;text-align:left!important}
.mathlvl-gift-action-ic{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;flex:none;background:rgba(111,124,255,.10);font-size:16px}
.mathlvl-gift-action span:last-child{min-width:0;display:flex;flex-direction:column;gap:2px}
.mathlvl-gift-action b{font-size:12.5px;color:var(--text);font-family:var(--font-body)}
.mathlvl-gift-action small{font-size:10.5px;color:var(--text-dim);font-family:var(--font-body);font-weight:500}
@media (max-width:420px){.mathlvl-gift-actions{grid-template-columns:1fr}.mathlvl-gift-action{min-height:54px!important}}
</style>
<script id="mathlvl-gift-qr-cleanup-runtime">
(function(){
  const qrQuick = document.getElementById('profile-gift-qr-btn');
  if(!qrQuick) return;
  qrQuick.addEventListener('click', ()=>{
    const overlay = document.getElementById('redeem-screen-overlay');
    if(typeof openRedeemScreen === 'function') openRedeemScreen();
    else overlay?.classList.add('open');
    window.setTimeout(()=> document.getElementById('qr-scan-btn')?.click(), 120);
  });
})();
</script>
'''

if '</body>' not in s:
    raise SystemExit('closing body not found')
s = s.replace('</body>', addon + '\n</body>', 1)

for token in [MARKER, 'id="profile-gift-qr-btn"', 'id="open-redeem-btn"', 'mathlvl-gift-qr-cleanup-runtime']:
    if token not in s:
        raise SystemExit(f'missing token: {token}')

p.write_text(s, encoding='utf-8')
print('Removed profile Help card and added direct Plus gift QR/code actions.')
