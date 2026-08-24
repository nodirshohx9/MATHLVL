from pathlib import Path

index = Path('index.html')
s = index.read_text(encoding='utf-8')

start_marker = '<!-- MATHLVL_AUTH_GATE_START -->'
end_marker = '<!-- MATHLVL_AUTH_GATE_END -->'

# Idempotent: remove an older injected block before adding the fresh one.
if start_marker in s and end_marker in s:
    a = s.index(start_marker)
    b = s.index(end_marker, a) + len(end_marker)
    s = s[:a] + s[b:]

# The base page already contains Google + Apple buttons in the Profile screen.
# Wire the existing Apple button to the real OAuth route instead of the old placeholder alert.
old_apple_handler = '''document.getElementById('apple-btn').addEventListener('click', ()=>{
  alert("Apple orqali kirish hozircha mavjud emas.");
});'''
new_apple_handler = '''document.getElementById('apple-btn').addEventListener('click', ()=>{
  window.location.href = '/api/auth-apple-start';
});'''
if old_apple_handler in s:
    s = s.replace(old_apple_handler, new_apple_handler, 1)

s = s.replace(
    "Google hisobingiz orqali kiring — o'qish jarayoningiz saqlanadi.",
    "Google yoki Apple orqali kiring — o'qish jarayoningiz saqlanadi.",
    1
)

block = r'''<!-- MATHLVL_AUTH_GATE_START -->
<style>
  #mathlvl-guest-login{
    position:fixed; top:18px; right:20px; z-index:120;
    display:inline-flex; align-items:center; gap:8px;
    min-height:40px; padding:0 16px; border-radius:12px;
    border:1px solid rgba(120,150,255,.26);
    background:rgba(10,14,31,.84); color:#EDF1FF;
    box-shadow:0 12px 34px rgba(0,0,0,.22);
    backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
    font:700 13px 'Inter',sans-serif; cursor:pointer;
    opacity:0; pointer-events:none; transform:translateY(-4px);
    transition:opacity .18s ease, transform .18s ease, border-color .18s ease, background .18s ease;
  }
  #mathlvl-guest-login.ready{ opacity:1; pointer-events:auto; transform:none; }
  #mathlvl-guest-login:hover{ border-color:#3DA9FC; background:rgba(16,21,43,.95); }
  #mathlvl-guest-login svg{ width:17px; height:17px; fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }

  #mathlvl-auth-gate[hidden]{ display:none !important; }
  #mathlvl-auth-gate{
    position:fixed; inset:0; z-index:1000; display:grid; place-items:center;
    padding:20px; background:rgba(3,5,14,.72);
    backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px);
  }
  .mathlvl-auth-card{
    width:min(430px,100%); position:relative; overflow:hidden;
    border:1px solid rgba(120,150,255,.22); border-radius:22px;
    background:linear-gradient(180deg,rgba(16,21,43,.98),rgba(8,11,26,.98));
    box-shadow:0 28px 80px rgba(0,0,0,.5); padding:28px;
  }
  .mathlvl-auth-card:before{
    content:''; position:absolute; width:220px; height:220px; border-radius:50%;
    right:-110px; top:-120px; background:rgba(61,169,252,.12); filter:blur(4px); pointer-events:none;
  }
  .mathlvl-auth-icon{
    width:48px; height:48px; border-radius:14px; display:grid; place-items:center;
    background:rgba(61,169,252,.12); border:1px solid rgba(61,169,252,.22);
    color:#3DA9FC; margin-bottom:18px;
  }
  .mathlvl-auth-icon svg{ width:23px; height:23px; fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
  .mathlvl-auth-title{ margin:0 0 8px; font:800 21px 'Sora',sans-serif; color:#EDF1FF; letter-spacing:-.02em; }
  .mathlvl-auth-copy{ margin:0 0 22px; color:#9AA2C6; font:500 13.5px/1.65 'Inter',sans-serif; }
  .mathlvl-auth-actions{ display:grid; gap:10px; }
  .mathlvl-auth-provider,.mathlvl-auth-secondary{
    width:100%; min-height:46px; border-radius:12px; padding:0 16px; cursor:pointer;
    font:750 13px 'Inter',sans-serif; display:flex; align-items:center; justify-content:center; gap:9px;
  }
  .mathlvl-auth-provider svg{ width:18px; height:18px; flex:none; }
  .mathlvl-auth-google{
    border:1px solid #3DA9FC; background:#3DA9FC; color:#07101B;
    box-shadow:0 10px 24px rgba(61,169,252,.18);
  }
  .mathlvl-auth-apple{
    border:1px solid rgba(255,255,255,.18); background:#fff; color:#080B13;
  }
  .mathlvl-auth-apple svg{ fill:currentColor; }
  .mathlvl-auth-secondary{ border:1px solid rgba(255,255,255,.1); background:transparent; color:#AAB1CE; min-height:42px; }
  .mathlvl-auth-note{ margin-top:13px; color:#717A9F; font:500 11px/1.5 'Inter',sans-serif; text-align:center; }
  .mathlvl-auth-close{
    position:absolute; top:14px; right:14px; width:34px; height:34px; border-radius:10px;
    border:1px solid rgba(255,255,255,.08); background:rgba(255,255,255,.03); color:#8C93B8;
    display:grid; place-items:center; cursor:pointer; font-size:18px;
  }
  @media(max-width:700px){
    #mathlvl-guest-login{ top:12px; right:12px; min-height:38px; padding:0 13px; border-radius:11px; }
    .mathlvl-auth-card{ padding:24px 20px 20px; border-radius:20px; }
  }
</style>

<button id="mathlvl-guest-login" type="button" aria-label="MATHLVL hisobiga kirish yoki ro‘yxatdan o‘tish">
  <svg viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/></svg>
  <span>Kirish</span>
</button>

<div id="mathlvl-auth-gate" hidden role="dialog" aria-modal="true" aria-labelledby="mathlvl-auth-title">
  <div class="mathlvl-auth-card">
    <button class="mathlvl-auth-close" id="mathlvl-auth-close" type="button" aria-label="Yopish">×</button>
    <div class="mathlvl-auth-icon">
      <svg viewBox="0 0 24 24"><path d="M12 3a5 5 0 0 0-5 5v3l-2 3h14l-2-3V8a5 5 0 0 0-5-5Z"/><path d="M10 18h4"/></svg>
    </div>
    <h2 class="mathlvl-auth-title" id="mathlvl-auth-title">Kirish yoki ro‘yxatdan o‘tish</h2>
    <p class="mathlvl-auth-copy" id="mathlvl-auth-copy">Progressingiz saqlanishi uchun hisob bilan davom eting.</p>
    <div class="mathlvl-auth-actions">
      <button class="mathlvl-auth-provider mathlvl-auth-google" id="mathlvl-auth-google" type="button">
        <svg viewBox="0 0 18 18" aria-hidden="true"><path fill="#4285F4" d="M17.6 9.2c0-.6-.05-1.2-.15-1.8H9v3.4h4.8c-.2 1.1-.85 2-1.8 2.6v2.2h2.9c1.7-1.55 2.7-3.85 2.7-6.4z"/><path fill="#34A853" d="M9 18c2.4 0 4.45-.8 5.9-2.15l-2.9-2.2c-.8.55-1.85.85-3 .85-2.3 0-4.25-1.55-4.95-3.65H1.05v2.3C2.5 15.95 5.5 18 9 18z"/><path fill="#FBBC05" d="M4.05 10.85c-.2-.55-.3-1.15-.3-1.85s.1-1.3.3-1.85V4.85H1.05C.4 6.15 0 7.55 0 9s.4 2.85 1.05 4.15l3-2.3z"/><path fill="#EA4335" d="M9 3.58c1.3 0 2.5.45 3.4 1.35l2.55-2.55C13.45.9 11.4 0 9 0 5.5 0 2.5 2.05 1.05 4.85l3 2.3C4.75 5.05 6.7 3.58 9 3.58z"/></svg>
        <span>Google bilan davom etish</span>
      </button>
      <button class="mathlvl-auth-provider mathlvl-auth-apple" id="mathlvl-auth-apple" type="button">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M11.2 0c.1 1-.3 2-1 2.7-.7.7-1.7 1.2-2.6 1.1-.1-1 .3-2 1-2.7C9.3.4 10.3-.1 11.2 0zM13.9 11.5c-.3.8-.5 1.1-1 1.8-.7 1-1.6 2.2-2.8 2.2-1.1 0-1.4-.7-2.8-.7-1.5 0-1.8.7-2.9.7-1.2 0-2-1.1-2.7-2.1C.1 11.6-.7 8.4.6 6.3c.7-1.1 1.9-1.8 3-1.8 1.2 0 1.9.7 2.9.7 1 0 1.5-.7 2.9-.7 1 0 2 .5 2.7 1.4-2.4 1.3-2 4.6.8 5.6z"/></svg>
        <span>Apple bilan davom etish</span>
      </button>
      <button class="mathlvl-auth-secondary" id="mathlvl-auth-later" type="button">Hozir emas</button>
    </div>
    <div class="mathlvl-auth-note">Alohida ro‘yxatdan o‘tish formasi shart emas — Google yoki Apple orqali birinchi kirishda hisob avtomatik yaratiladi.</div>
  </div>
</div>

<script>
(() => {
  const authState = { ready:false, loggedIn:false, user:null };
  const pendingKey = 'mathlvl_pending_auth_tab';
  let pendingTab = 'home';

  const gate = document.getElementById('mathlvl-auth-gate');
  const guestLogin = document.getElementById('mathlvl-guest-login');
  const title = document.getElementById('mathlvl-auth-title');
  const copy = document.getElementById('mathlvl-auth-copy');

  const messages = {
    generic: ['Kirish yoki ro‘yxatdan o‘tish', 'Progressingiz va hisob ma’lumotlaringiz saqlanishi uchun Google yoki Apple orqali davom eting.'],
    teacher: ['Ustoz AI’dan foydalanish uchun kiring', 'Ustoz AI suhbatlari va progress saqlanishi uchun kiring yoki ro‘yxatdan o‘ting.'],
    mock: ['Mock testni boshlash uchun kiring', 'Natijangiz va test tarixingiz saqlanishi uchun kiring yoki ro‘yxatdan o‘ting.'],
    book: ['O‘qishni boshlash uchun kiring', 'Oxirgi o‘qilgan sahifa va kitob progressi saqlanishi uchun kiring yoki ro‘yxatdan o‘ting.'],
    plus: ['MATHLVL Plus uchun hisob kerak', 'Obuna, xarid va sovg‘alarni hisobingizga bog‘lash uchun kiring yoki ro‘yxatdan o‘ting.']
  };

  function openGate(feature='generic', tab='home'){
    const msg = messages[feature] || messages.generic;
    pendingTab = tab || 'home';
    title.textContent = msg[0];
    copy.textContent = msg[1];
    gate.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    setTimeout(() => document.getElementById('mathlvl-auth-google')?.focus(), 20);
  }

  function closeGate(){
    gate.hidden = true;
    document.documentElement.style.overflow = '';
  }

  function rememberPendingTab(){
    try { localStorage.setItem(pendingKey, pendingTab || 'home'); } catch(_e){}
  }

  function goGoogle(){
    rememberPendingTab();
    window.location.assign('/api/auth-google-start');
  }

  function goApple(){
    rememberPendingTab();
    window.location.assign('/api/auth-apple-start');
  }

  function updateGuestButton(){
    if(!authState.ready || authState.loggedIn){
      guestLogin.classList.remove('ready');
      guestLogin.hidden = authState.loggedIn;
      return;
    }
    guestLogin.hidden = false;
    guestLogin.classList.add('ready');
  }

  async function refreshAuth(){
    try{
      const res = await fetch('/api/auth', { credentials:'include', cache:'no-store' });
      const data = await res.json();
      authState.loggedIn = !!data.loggedIn;
      authState.user = authState.loggedIn ? data : null;
    }catch(_e){
      authState.loggedIn = false;
      authState.user = null;
    }finally{
      authState.ready = true;
      updateGuestButton();
    }

    if(authState.loggedIn){
      let tab = null;
      try{
        tab = localStorage.getItem(pendingKey);
        localStorage.removeItem(pendingKey);
      }catch(_e){}
      if(tab && typeof window.activateTab === 'function'){
        setTimeout(() => window.activateTab(tab), 80);
      }
    }
  }

  window.MATHLVL_AUTH_STATE = authState;
  window.requireMathlvlAuth = function(feature='generic', tab='home', onAllowed){
    if(authState.loggedIn){
      if(typeof onAllowed === 'function') onAllowed();
      return true;
    }
    openGate(feature, tab);
    return false;
  };

  // Guests can browse discovery pages. Actual protected actions ask them to sign in/register.
  document.addEventListener('click', (event) => {
    if(!authState.ready || authState.loggedIn) return;
    const target = event.target.closest('button,a,[role="button"],.dash-quick-card,.sidebar-nav-item,.bottom-nav-item');
    if(!target) return;

    const teacherNav = target.matches('[data-sidebar-tab="teacher"],[data-tab="teacher"],#dash-quick-teacher') || !!target.closest('#dash-quick-teacher');
    if(teacherNav){
      event.preventDefault(); event.stopImmediatePropagation();
      openGate('teacher','teacher');
      return;
    }

    const mockStart = target.matches('[data-mt-start]') || !!target.closest('[data-mt-start]');
    if(mockStart){
      event.preventDefault(); event.stopImmediatePropagation();
      openGate('mock','mocktest');
      return;
    }

    if(target.id === 'dash-continue-btn' || !!target.closest('#dash-continue-btn')){
      event.preventDefault(); event.stopImmediatePropagation();
      openGate('book','books');
      return;
    }
  }, true);

  function wrapFeatureFunctions(){
    if(typeof window.startMockTest === 'function' && !window.startMockTest.__mathlvlAuthWrapped){
      const originalStartMock = window.startMockTest;
      const wrapped = function(...args){
        if(!authState.loggedIn){ openGate('mock','mocktest'); return; }
        return originalStartMock.apply(this,args);
      };
      wrapped.__mathlvlAuthWrapped = true;
      window.startMockTest = wrapped;
    }

    if(typeof window.openBookInChat === 'function' && !window.openBookInChat.__mathlvlAuthWrapped){
      const originalOpenBook = window.openBookInChat;
      const wrapped = function(...args){
        if(!authState.loggedIn){ openGate('book','books'); return; }
        return originalOpenBook.apply(this,args);
      };
      wrapped.__mathlvlAuthWrapped = true;
      window.openBookInChat = wrapped;
    }
  }

  guestLogin.addEventListener('click', () => openGate('generic','home'));
  document.getElementById('mathlvl-auth-google').addEventListener('click', goGoogle);
  document.getElementById('mathlvl-auth-apple').addEventListener('click', goApple);
  document.getElementById('mathlvl-auth-later').addEventListener('click', closeGate);
  document.getElementById('mathlvl-auth-close').addEventListener('click', closeGate);
  gate.addEventListener('click', (e) => { if(e.target === gate) closeGate(); });
  document.addEventListener('keydown', (e) => { if(e.key === 'Escape' && !gate.hidden) closeGate(); });

  wrapFeatureFunctions();
  setTimeout(wrapFeatureFunctions, 150);
  setTimeout(wrapFeatureFunctions, 700);
  refreshAuth();
})();
</script>
<!-- MATHLVL_AUTH_GATE_END -->'''

if '</body>' not in s:
    raise SystemExit('index.html: </body> not found')

s = s.replace('</body>', block + '\n</body>', 1)
index.write_text(s, encoding='utf-8')
print('Injected Google + Apple MATHLVL auth gate')
