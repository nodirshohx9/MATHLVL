from pathlib import Path

INDEX = Path('index.html')
ADMIN = Path('admin.html')

s = INDEX.read_text(encoding='utf-8')
a = ADMIN.read_text(encoding='utf-8')

# -------------------------
# Public app cleanup
# -------------------------
s = s.replace('const MODEL = "claude-sonnet-4-6";\n', '')
s = s.replace('callClaude', 'callMathlvlAI')
s = s.replace(
    'const body = { model: MODEL, max_tokens: max_tokens || 1000, system, messages };',
    'const body = { max_tokens: max_tokens || 1000, system, messages };'
)
s = s.replace(
    "// ---- O'qish jarayonini saqlash (qurilma darajasida, haqiqiy hisob tizimi bo'lmagani uchun) ----",
    "// ---- O'qish jarayoni: lokal tezkor nusxa + login qilingan hisob bilan server sync ----"
)
s = s.replace(
    'Tariflar: 1 oylik • 6 oylik • 1 yillik. Aniq narx profil → “Tarifni almashtirish” oynasida ko‘rsatiladi.',
    'Tariflar: 1 oylik va 1 yillik. Aniq narx profil → “Tarifni almashtirish” oynasida ko‘rsatiladi.'
)
s = s.replace('              <li>Kengaytirilgan progress va premium funksiyalar</li>\n', '')
s = s.replace(
    '          <li>Yozish rejimida qalam, o‘chirg‘ich, undo/redo vositalaridan foydalanasiz.</li>',
    '          <li>Yozish rejimida qalam, o‘chirg‘ich, undo/redo vositalaridan foydalanasiz.</li>\n          <li>Hisobga kirganingizda oxirgi o‘qilgan sahifa hisobingiz bilan saqlanadi.</li>'
)

old_report = '''  document.getElementById('help-report-btn')?.addEventListener('click', ()=>{
    alert("Muammo haqida xabar berish formasi keyingi bosqichda Telegram/email yoki support API bilan ulanadi.");
  });'''
new_report = '''  document.getElementById('help-report-btn')?.addEventListener('click', ()=>{
    if(typeof window.openMathlvlSupport === 'function') window.openMathlvlSupport();
  });'''
if old_report not in s:
    raise SystemExit('help report placeholder anchor not found')
s = s.replace(old_report, new_report, 1)

support_ui = r'''
<style>
#mathlvl-support-overlay[hidden]{display:none!important}
#mathlvl-support-overlay{position:fixed;inset:0;z-index:6500;display:grid;place-items:center;padding:18px;background:rgba(2,6,15,.72);backdrop-filter:blur(10px)}
.mathlvl-support-card{width:min(470px,100%);background:linear-gradient(180deg,#0b142b,#080e20);border:1px solid rgba(111,132,255,.22);border-radius:18px;padding:22px;box-shadow:0 28px 80px rgba(0,0,0,.48)}
.mathlvl-support-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:16px}.mathlvl-support-head h3{font-family:var(--font-display);font-size:20px;margin:0 0 4px}.mathlvl-support-head p{font-size:12.5px;color:var(--text-dim);margin:0}.mathlvl-support-close{width:34px;height:34px;border-radius:10px;border:1px solid var(--border);background:transparent;color:var(--text);cursor:pointer;font-size:18px}.mathlvl-support-card label{margin-top:12px}.mathlvl-support-card textarea{min-height:130px;max-height:260px}.mathlvl-support-actions{display:flex;gap:9px;margin-top:16px}.mathlvl-support-actions button{flex:1}.mathlvl-support-status{min-height:18px;margin-top:10px;font:500 12px var(--font-mono);color:var(--blue)}.mathlvl-support-status.err{color:#ff8a8a}
html[data-theme="light"] .mathlvl-support-card{background:#fff;color:#14203a;border-color:rgba(31,57,104,.13);box-shadow:0 28px 70px rgba(45,72,117,.2)}
@media(max-width:600px){#mathlvl-support-overlay{align-items:end;padding:0}.mathlvl-support-card{border-radius:20px 20px 0 0;padding:20px 16px calc(20px + env(safe-area-inset-bottom,0px));width:100%}}
</style>
<div id="mathlvl-support-overlay" hidden role="dialog" aria-modal="true" aria-labelledby="mathlvl-support-title">
  <div class="mathlvl-support-card">
    <div class="mathlvl-support-head">
      <div><h3 id="mathlvl-support-title">Muammo haqida xabar bering</h3><p>Xabar administrator paneliga tushadi.</p></div>
      <button class="mathlvl-support-close" id="mathlvl-support-close" type="button" aria-label="Yopish">×</button>
    </div>
    <label for="mathlvl-support-category">Bo‘lim</label>
    <select id="mathlvl-support-category">
      <option>Saytdagi xatolik</option><option>To‘lov</option><option>Kitob</option><option>Ustoz AI</option><option>Mock Test</option><option>Boshqa</option>
    </select>
    <label for="mathlvl-support-message">Xabar</label>
    <textarea id="mathlvl-support-message" maxlength="2000" placeholder="Nima ishlamayapti yoki nimani yaxshilash kerakligini yozing..."></textarea>
    <div class="mathlvl-support-actions">
      <button class="ghost-btn" id="mathlvl-support-cancel" type="button">Bekor qilish</button>
      <button class="glow-btn" id="mathlvl-support-send" type="button">Yuborish</button>
    </div>
    <div class="mathlvl-support-status" id="mathlvl-support-status"></div>
  </div>
</div>
<script>
(function(){
  const overlay = document.getElementById('mathlvl-support-overlay');
  const message = document.getElementById('mathlvl-support-message');
  const category = document.getElementById('mathlvl-support-category');
  const status = document.getElementById('mathlvl-support-status');
  const send = document.getElementById('mathlvl-support-send');
  function close(){ overlay.hidden=true; document.body.style.overflow=''; }
  function open(){
    overlay.hidden=false; document.body.style.overflow='hidden';
    status.textContent=''; status.classList.remove('err');
    setTimeout(()=>message.focus(),30);
  }
  window.openMathlvlSupport = open;
  document.getElementById('mathlvl-support-close').addEventListener('click', close);
  document.getElementById('mathlvl-support-cancel').addEventListener('click', close);
  overlay.addEventListener('click', e=>{ if(e.target===overlay) close(); });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !overlay.hidden) close(); });
  send.addEventListener('click', async ()=>{
    const text = message.value.trim();
    if(text.length < 5){ status.textContent='Xabarni biroz batafsilroq yozing.'; status.classList.add('err'); return; }
    send.disabled=true; status.classList.remove('err'); status.textContent='Yuborilmoqda...';
    try{
      const res = await fetch('/api/support', {
        method:'POST', credentials:'include', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({category:category.value,message:text,page:location.pathname})
      });
      const data = await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(data.error || 'Xabar yuborilmadi');
      status.textContent='Xabaringiz yuborildi ✓';
      message.value='';
      setTimeout(close,900);
    }catch(err){ status.textContent=err.message || 'Xabar yuborilmadi.'; status.classList.add('err'); }
    finally{ send.disabled=false; }
  });
})();
</script>
'''
if 'id="mathlvl-support-overlay"' not in s:
    if '</body>' not in s:
        raise SystemExit('index body close not found')
    s = s.replace('</body>', support_ui + '\n</body>', 1)

for forbidden in ('claude-sonnet-4-6', 'callClaude', 'keyingi bosqichda Telegram/email'):
    if forbidden in s:
        raise SystemExit(f'public stale token remains: {forbidden}')

INDEX.write_text(s, encoding='utf-8')

# -------------------------
# Admin support inbox
# -------------------------
nav_anchor = '      <button class="nav-item" data-page="settings"><span class="ic">⚙</span>Sozlamalar</button>'
if 'data-page="support"' not in a:
    if nav_anchor not in a:
        raise SystemExit('admin settings nav anchor not found')
    a = a.replace(nav_anchor, '      <button class="nav-item" data-page="support"><span class="ic">💬</span>Xabarlar</button>\n' + nav_anchor, 1)

settings_anchor = '''      <!-- ============ SOZLAMALAR ============ -->
      <section class="page" id="page-settings">'''
support_section = r'''      <!-- ============ SUPPORT ============ -->
      <section class="page" id="page-support">
        <div class="page-header page-header-row">
          <div><h1>Xabarlar</h1><p>Foydalanuvchilardan kelgan muammo va takliflar.</p></div>
          <button class="ghost-btn" id="support-refresh-btn" type="button">Yangilash</button>
        </div>
        <div class="card"><div id="support-admin-list"><div class="empty-state"><div class="e-text">Xabarlar yuklanmoqda...</div></div></div></div>
      </section>

'''
if 'id="page-support"' not in a:
    if settings_anchor not in a:
        raise SystemExit('admin settings page anchor not found')
    a = a.replace(settings_anchor, support_section + settings_anchor, 1)

login_anchor = '''      loadPaymentSettingsAdmin();
      refreshPaymentsList();'''
if 'refreshSupportList();' not in a:
    if login_anchor not in a:
        raise SystemExit('admin login refresh anchor not found')
    a = a.replace(login_anchor, login_anchor + '\n      refreshSupportList();', 1)

admin_support_script = r'''
<script>
async function refreshSupportList(){
  const wrap = document.getElementById('support-admin-list');
  if(!wrap) return;
  wrap.innerHTML='<div class="empty-state"><div class="e-text">Xabarlar yuklanmoqda...</div></div>';
  try{
    const res = await fetch('/api/support', {credentials:'same-origin',cache:'no-store'});
    const data = await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.error || 'Xabarlar yuklanmadi');
    const tickets = data.tickets || [];
    if(!tickets.length){ wrap.innerHTML='<div class="empty-state"><div class="e-icon">✓</div><div class="e-text">Hozircha xabar yo‘q.</div></div>'; return; }
    wrap.innerHTML = tickets.map(t=>{
      const when = t.createdAt ? new Date(t.createdAt).toLocaleString('uz-UZ') : '—';
      const who = t.email ? escapeHtml(t.email) : 'Mehmon';
      const msg = escapeHtml(t.message || '').replace(/\n/g,'<br>');
      const resolved = t.status === 'RESOLVED';
      return `<div style="padding:15px 0;border-bottom:1px solid var(--border-soft);">
        <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap;">
          <div><b>${escapeHtml(t.category || 'Boshqa')}</b><div class="field-hint">${who} • ${when}${t.page ? ' • '+escapeHtml(t.page) : ''}</div></div>
          <span class="preview-badge ${resolved?'badge-free':'badge-plus'}">${resolved?'✓ Yopilgan':'● Ochiq'}</span>
        </div>
        <div style="font-size:13px;line-height:1.6;margin:10px 0 12px;color:var(--text);">${msg}</div>
        <button class="ghost-btn support-toggle-btn" data-id="${escapeHtml(t.id)}" data-status="${resolved?'OPEN':'RESOLVED'}" type="button" style="padding:7px 12px;font-size:11.5px;">${resolved?'Qayta ochish':'Hal qilindi'}</button>
      </div>`;
    }).join('');
    wrap.querySelectorAll('.support-toggle-btn').forEach(btn=>btn.addEventListener('click', async ()=>{
      btn.disabled=true;
      try{
        const res = await fetch('/api/support', {method:'PATCH',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:btn.dataset.id,status:btn.dataset.status})});
        const data = await res.json().catch(()=>({}));
        if(!res.ok) throw new Error(data.error || 'Yangilanmadi');
        await refreshSupportList();
      }catch(err){ alert(err.message || 'Xabar holatini yangilab bo‘lmadi.'); btn.disabled=false; }
    }));
  }catch(err){ wrap.innerHTML=`<div class="empty-state"><div class="e-text">${escapeHtml(err.message || 'Xabarlar yuklanmadi.')}</div></div>`; }
}
document.getElementById('support-refresh-btn')?.addEventListener('click', refreshSupportList);
document.querySelector('[data-page="support"]')?.addEventListener('click', refreshSupportList);
</script>
'''
if 'class="support-toggle-btn"' not in a:
    if '</body>' not in a:
        raise SystemExit('admin body close not found')
    a = a.replace('</body>', admin_support_script + '\n</body>', 1)

for required in ('data-page="support"', 'id="page-support"', '/api/support', 'refreshSupportList'):
    if required not in a:
        raise SystemExit(f'admin support missing: {required}')

ADMIN.write_text(a, encoding='utf-8')
