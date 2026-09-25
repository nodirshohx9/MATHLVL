
(() => {
  const authState = { ready:false, loggedIn:false, user:null };
  const pendingKey = 'mathlvl_pending_auth_tab';
  let pendingTab = 'home';

  const gate = document.getElementById('mathlvl-auth-gate');
  const guestLogin = document.getElementById('mathlvl-guest-login');
  const title = document.getElementById('mathlvl-auth-title');
  const copy = document.getElementById('mathlvl-auth-copy');

  const messages = {
    generic: ['Kirish yoki ro‘yxatdan o‘tish', 'Progressingiz va hisob ma’lumotlaringiz saqlanishi uchun Google orqali davom eting.'],
    teacher: ['Ustoz AI’dan foydalanish uchun kiring', 'Ustoz AI suhbatlari va progress saqlanishi uchun kiring yoki ro‘yxatdan o‘ting.'],
    mock: ['Mock testni boshlash uchun kiring', 'Natijangiz va test tarixingiz saqlanishi uchun kiring yoki ro‘yxatdan o‘ting.'],
    book: ['O‘qishni boshlash uchun kiring', 'Oxirgi o‘qilgan sahifa va kitob progressi saqlanishi uchun kiring yoki ro‘yxatdan o‘ting.'],
    solve: ['Masalani yechish uchun kiring', 'Yechimni olish va progressni saqlash uchun Google orqali kiring yoki ro‘yxatdan o‘ting.'],
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

    const solveAction = target.id === 'solve-btn' || !!target.closest('#solve-btn');
    if(solveAction){
      event.preventDefault(); event.stopImmediatePropagation();
      openGate('solve','home');
      return;
    }

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
document.getElementById('mathlvl-auth-later').addEventListener('click', closeGate);
  document.getElementById('mathlvl-auth-close').addEventListener('click', closeGate);
  gate.addEventListener('click', (e) => { if(e.target === gate) closeGate(); });
  document.addEventListener('keydown', (e) => { if(e.key === 'Escape' && !gate.hidden) closeGate(); });

  wrapFeatureFunctions();
  setTimeout(wrapFeatureFunctions, 150);
  setTimeout(wrapFeatureFunctions, 700);
  refreshAuth();
})();
