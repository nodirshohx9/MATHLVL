from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

MARKER = 'MATHLVL_PROFILE_GIFT_QR_V1'
if MARKER in s:
    raise SystemExit(0)

help_block = '''
      <div class="glass-card profile-section-card" id="profile-help-card" style="margin-top:16px;">
        <h3>Yordam</h3>
        <p style="font-size:13px; color:var(--text-dim); margin:6px 0 0; line-height:1.65;">
          MATHLVL bilan ishlash bo'yicha yordam kerak bo'lsa, shu bo'limdan profil, tarif va hisob sozlamalarini boshqaring.
          Ustoz AI bo'yicha savollar uchun Ustoz AI bo'limidan foydalaning.
        </p>
      </div>
'''
if help_block in s:
    s = s.replace(help_block, '\n', 1)

old_gift = '''
      <div class="glass-card profile-section-card" style="margin-top:16px;">
        <h3>🎁 Sovg'a Plus</h3>
        <p style="font-size:13px; color:var(--text-dim); margin:6px 0 14px;">Sovg'a kodingiz yoki QR kodingiz bormi?</p>
        <button class="ghost-btn" id="open-redeem-btn">Sovg'ani faollashtirish</button>
      </div>
'''
new_gift = '''
      <div class="glass-card profile-section-card mathlvl-gift-card" style="margin-top:16px;">
        <h3>🎁 Sovg'a Plus</h3>
        <p style="font-size:13px; color:var(--text-dim); margin:6px 0 14px;">QR kodni kamera bilan skanerlang yoki sovg'a kodini qo'lda kiriting.</p>
        <div class="mathlvl-gift-actions">
          <button class="ghost-btn" id="gift-qr-scan-btn" type="button">📷 QR skaner</button>
          <button class="ghost-btn" id="gift-code-entry-btn" type="button">⌨️ Kodni terish</button>
        </div>
        <button class="ghost-btn" id="open-redeem-btn" type="button" hidden>Sovg'ani faollashtirish</button>
      </div>
'''
if old_gift not in s:
    raise SystemExit('profile gift block not found')
s = s.replace(old_gift, new_gift, 1)

addon = r'''
<style id="mathlvl-profile-gift-qr-style">
/* MATHLVL_PROFILE_GIFT_QR_V1 */
.mathlvl-gift-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.mathlvl-gift-actions .ghost-btn{width:100%;min-height:44px;display:flex;align-items:center;justify-content:center;gap:7px}
@media (max-width:480px){.mathlvl-gift-actions{grid-template-columns:1fr}}
</style>
<script id="mathlvl-profile-gift-qr-runtime">
(function(){
  const hiddenOpen = document.getElementById('open-redeem-btn');
  const qrChoice = document.getElementById('gift-qr-scan-btn');
  const codeChoice = document.getElementById('gift-code-entry-btn');
  function openGift(){ hiddenOpen?.click(); }
  qrChoice?.addEventListener('click', ()=>{
    openGift();
    window.setTimeout(()=> document.getElementById('qr-scan-btn')?.click(), 80);
  });
  codeChoice?.addEventListener('click', ()=>{
    openGift();
    window.setTimeout(()=> document.getElementById('manual-redeem-input')?.focus(), 80);
  });
})();
</script>
'''

if '</body>' not in s:
    raise SystemExit('closing body not found')
s = s.replace('</body>', addon + '\n</body>', 1)

for token in [MARKER, 'gift-qr-scan-btn', 'gift-code-entry-btn', 'manual-redeem-input']:
    if token not in s:
        raise SystemExit(f'missing token: {token}')

p.write_text(s, encoding='utf-8')
print('Profile help card removed; gift QR/manual choices added.')
