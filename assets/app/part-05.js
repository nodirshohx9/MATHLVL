(() => {
  const authState={ready:false,loggedIn:false,user:null};
  const pendingKey='mathlvl_pending_auth_tab';
  let pendingTab='home';
  const gate=document.getElementById('mathlvl-auth-gate');
  const loginOpen=document.getElementById('mathlvl-login-open');
  const title=document.getElementById('mathlvl-auth-title');
  const copy=document.getElementById('mathlvl-auth-copy');
  const messages={
    generic:['Kirish yoki ro‘yxatdan o‘tish','Progressingiz va hisob ma’lumotlaringiz saqlanishi uchun Google orqali davom eting.'],
    teacher:['Ustoz AI’dan foydalanish uchun kiring','Ustoz AI suhbatlari va progress saqlanishi uchun Google orqali davom eting.'],
    mock:['Mock testni boshlash uchun kiring','Natijangiz va test tarixini hisobingizda saqlash uchun Google orqali davom eting.'],
    book:['O‘qishni boshlash uchun kiring','Oxirgi o‘qilgan sahifa va kitob progressini saqlash uchun Google orqali davom eting.'],
    solve:['Masalani yechish uchun kiring','Yechimni olish uchun Google orqali davom eting.'],
    plus:['MATHLVL Plus uchun hisob kerak','Obuna, xarid va sovg‘alarni hisobingizga bog‘lash uchun Google orqali kiring.']
  };
  function openGate(feature='generic',tab='home'){
    const msg=messages[feature]||messages.generic;
    pendingTab=tab||'home';
    title.textContent=msg[0];copy.textContent=msg[1];
    gate.hidden=false;document.documentElement.style.overflow='hidden';
    setTimeout(()=>document.getElementById('mathlvl-auth-google')?.focus(),20);
  }
  function closeGate(){gate.hidden=true;document.documentElement.style.overflow=''}
  function rememberPendingTab(){try{localStorage.setItem(pendingKey,pendingTab||'home')}catch{}}
  function goGoogle(){rememberPendingTab();window.location.assign('/api/auth-google-start')}
  function updateLoginButton(){
    if(!authState.ready){loginOpen?.classList.remove('ready');return}
    if(authState.loggedIn){loginOpen?.classList.remove('ready');if(loginOpen)loginOpen.hidden=true;return}
    if(loginOpen){loginOpen.hidden=false;loginOpen.classList.add('ready')}
  }
  function applyAuthState(data={}){
    authState.loggedIn=!!data.loggedIn&&!data.isGuest;
    authState.user=authState.loggedIn?data:null;
    authState.ready=true;updateLoginButton();
    if(!authState.loggedIn){
      try{localStorage.removeItem('mathlvl_mock_results');localStorage.removeItem('mathlvl_mock_draft_v1')}catch{}
    }
    if(authState.loggedIn){
      let tab=null;
      try{tab=localStorage.getItem(pendingKey);localStorage.removeItem(pendingKey)}catch{}
      if(tab&&typeof window.activateTab==='function')setTimeout(()=>window.activateTab(tab),80);
    }
  }
  async function refreshAuth(){
    try{
      const res=await fetch('/api/auth',{credentials:'include',cache:'no-store'});
      applyAuthState(await res.json());
    }catch{applyAuthState({loggedIn:false,isGuest:false})}
  }
  window.addEventListener('mathlvl:authchange',event=>applyAuthState(event.detail||{}));
  window.MATHLVL_AUTH_STATE=authState;
  window.requireMathlvlAuth=function(feature='generic',tab='home',onAllowed){
    if(authState.loggedIn){if(typeof onAllowed==='function')onAllowed();return true}
    openGate(feature,tab);return false;
  };
  document.addEventListener('click',event=>{
    if(authState.loggedIn)return;
    const target=event.target.closest('button,a,[role="button"],.dash-quick-card,.sidebar-nav-item,.bottom-nav-item');
    if(!target)return;
    if(target.id==='sidebar-login-open'){
      event.preventDefault();event.stopImmediatePropagation();
      document.getElementById('sidebar-profile-menu')?.setAttribute('hidden','');
      document.getElementById('sidebar-profile-wrap')?.classList.remove('open');
      document.getElementById('sidebar-footer')?.setAttribute('aria-expanded','false');
      openGate('generic','profile');return
    }
    const solve=target.id==='solve-btn'||!!target.closest('#solve-btn');
    if(solve){event.preventDefault();event.stopImmediatePropagation();openGate('solve','home');return}
    const teacher=target.matches('[data-sidebar-tab="teacher"],[data-tab="teacher"],#dash-quick-teacher')||!!target.closest('#dash-quick-teacher');
    if(teacher){event.preventDefault();event.stopImmediatePropagation();openGate('teacher','teacher');return}
    const mock=target.matches('[data-mt-start]')||!!target.closest('[data-mt-start]');
    if(mock){event.preventDefault();event.stopImmediatePropagation();openGate('mock','mocktest');return}
    if(target.id==='dash-continue-btn'||!!target.closest('#dash-continue-btn')){event.preventDefault();event.stopImmediatePropagation();openGate('book','books')}
  },true);
  function wrapFeatureFunctions(){
    if(typeof window.startMockTest==='function'&&!window.startMockTest.__mathlvlAuthWrapped){
      const original=window.startMockTest;
      const wrapped=function(...args){if(!authState.loggedIn){openGate('mock','mocktest');return}return original.apply(this,args)};
      wrapped.__mathlvlAuthWrapped=true;window.startMockTest=wrapped;
    }
    if(typeof window.openBookInChat==='function'&&!window.openBookInChat.__mathlvlAuthWrapped){
      const original=window.openBookInChat;
      const wrapped=function(...args){if(!authState.loggedIn){openGate('book','books');return}return original.apply(this,args)};
      wrapped.__mathlvlAuthWrapped=true;window.openBookInChat=wrapped;
    }
  }
  loginOpen?.addEventListener('click',()=>openGate('generic','profile'));
  document.getElementById('mathlvl-auth-google')?.addEventListener('click',goGoogle);
  document.getElementById('mathlvl-auth-later')?.addEventListener('click',closeGate);
  document.getElementById('mathlvl-auth-close')?.addEventListener('click',closeGate);
  gate.addEventListener('click',e=>{if(e.target===gate)closeGate()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!gate.hidden)closeGate()});
  wrapFeatureFunctions();setTimeout(wrapFeatureFunctions,150);setTimeout(wrapFeatureFunctions,700);
  if(typeof window.refreshMathlvlAuthState==='function') window.refreshMathlvlAuthState();
  else refreshAuth();
})();
