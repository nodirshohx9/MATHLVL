(() => {
  const authState={ready:false,loggedIn:false,isGuest:false,user:null};
  const pendingKey='mathlvl_pending_auth_tab';
  let pendingTab='home';
  const gate=document.getElementById('mathlvl-auth-gate');
  const guestLogin=document.getElementById('mathlvl-guest-login');
  const guestButton=document.getElementById('mathlvl-auth-guest');
  const guestStatus=document.getElementById('mathlvl-auth-status');
  const title=document.getElementById('mathlvl-auth-title');
  const copy=document.getElementById('mathlvl-auth-copy');
  const messages={
    generic:['Kirish yoki ro‘yxatdan o‘tish','Progressingiz va hisob ma’lumotlaringiz saqlanishi uchun Google orqali davom eting.'],
    teacher:['Ustoz AI’dan foydalanish uchun kiring','Ustoz AI suhbatlari va progress saqlanishi uchun Google orqali kiring. Mehmon rejimida ham sinab ko‘rishingiz mumkin.'],
    mock:['Mock testni boshlash uchun kiring','Natijangiz va test tarixini saqlash uchun Google orqali kiring yoki vaqtinchalik mehmon rejimida sinab ko‘ring.'],
    book:['O‘qishni boshlash uchun kiring','Oxirgi o‘qilgan sahifa va kitob progressini saqlash uchun Google orqali kiring yoki mehmon sifatida sinab ko‘ring.'],
    solve:['Masalani yechish uchun kiring','Yechimni olish uchun Google orqali kiring yoki vaqtinchalik mehmon rejimida sinab ko‘ring.'],
    plus:['MATHLVL Plus uchun hisob kerak','Obuna, xarid va sovg‘alarni hisobingizga bog‘lash uchun Google orqali kiring.']
  };
  function openGate(feature='generic',tab='home'){
    const msg=messages[feature]||messages.generic;
    pendingTab=tab||'home';
    title.textContent=msg[0];copy.textContent=msg[1];
    if(guestStatus)guestStatus.textContent='';
    gate.hidden=false;document.documentElement.style.overflow='hidden';
    setTimeout(()=>document.getElementById('mathlvl-auth-google')?.focus(),20);
  }
  function closeGate(){gate.hidden=true;document.documentElement.style.overflow=''}
  function rememberPendingTab(){try{localStorage.setItem(pendingKey,pendingTab||'home')}catch{}}
  function goGoogle(){rememberPendingTab();window.location.assign('/api/auth-google-start')}
  async function goGuest(){
    if(!guestButton||guestButton.disabled)return;
    guestButton.disabled=true;guestButton.textContent='Mehmon sessiyasi ochilmoqda…';
    if(guestStatus)guestStatus.textContent='';
    try{
      const response=await fetch('/api/guest-session',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:'{}'});
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!data.ok)throw new Error(data.error||'Mehmon rejimini yoqib bo‘lmadi.');
      rememberPendingTab();window.location.reload();
    }catch(error){
      if(guestStatus)guestStatus.textContent=error.message||'Mehmon rejimini yoqib bo‘lmadi.';
      guestButton.disabled=false;guestButton.textContent='Mehmon sifatida sinab ko‘rish';
    }
  }
  function updateGuestButton(){
    if(!authState.ready||authState.loggedIn){guestLogin?.classList.remove('ready');if(guestLogin)guestLogin.hidden=authState.loggedIn;return}
    if(guestLogin){guestLogin.hidden=false;guestLogin.classList.add('ready')}
  }
  async function refreshAuth(){
    try{
      const res=await fetch('/api/auth',{credentials:'include',cache:'no-store'});
      const data=await res.json();
      authState.loggedIn=!!data.loggedIn;authState.isGuest=!!data.isGuest;
      authState.user=authState.loggedIn?data:null;
    }catch{authState.loggedIn=false;authState.isGuest=false;authState.user=null}
    finally{authState.ready=true;updateGuestButton()}
    if(authState.loggedIn){
      let tab=null;
      try{tab=localStorage.getItem(pendingKey);localStorage.removeItem(pendingKey)}catch{}
      if(tab&&typeof window.activateTab==='function')setTimeout(()=>window.activateTab(tab),80);
    }
  }
  window.MATHLVL_AUTH_STATE=authState;
  window.requireMathlvlAuth=function(feature='generic',tab='home',onAllowed){
    if(authState.loggedIn){if(typeof onAllowed==='function')onAllowed();return true}
    openGate(feature,tab);return false;
  };
  document.addEventListener('click',event=>{
    if(!authState.ready||authState.loggedIn)return;
    const target=event.target.closest('button,a,[role="button"],.dash-quick-card,.sidebar-nav-item,.bottom-nav-item');
    if(!target)return;
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
  guestLogin?.addEventListener('click',()=>openGate('generic','home'));
  guestButton?.addEventListener('click',goGuest);
  document.getElementById('mathlvl-auth-google')?.addEventListener('click',goGoogle);
  document.getElementById('mathlvl-auth-later')?.addEventListener('click',closeGate);
  document.getElementById('mathlvl-auth-close')?.addEventListener('click',closeGate);
  gate.addEventListener('click',e=>{if(e.target===gate)closeGate()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!gate.hidden)closeGate()});
  wrapFeatureFunctions();setTimeout(wrapFeatureFunctions,150);setTimeout(wrapFeatureFunctions,700);refreshAuth();
})();
