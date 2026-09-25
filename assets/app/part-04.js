
(function(){
  const footerName = document.getElementById('sidebar-footer-name');
  const footerPlan = document.getElementById('sidebar-footer-plan');

  function setAccountMenuState(signedIn, userName, isPlus){
    document.querySelectorAll('[data-auth-only="true"]').forEach(el => el.hidden = !signedIn);
    document.querySelectorAll('[data-guest-only="true"]').forEach(el => el.hidden = signedIn);

    if(footerName) footerName.textContent = signedIn ? (userName || 'Profil') : 'Mehmon';
    if(footerPlan) footerPlan.textContent = signedIn ? (isPlus ? 'MATHLVL Plus' : 'Bepul plan') : 'Kirish qilinmagan';
  }

  window.setAccountMenuState = setAccountMenuState;

  // Try to infer current auth state from existing UI on load.
  function syncFromExistingUI(){
    const signedIn =
      document.body.classList.contains('signed-in') ||
      !!document.querySelector('[data-user-email]:not([data-user-email=""])') ||
      !!document.querySelector('.profile-user-email:not(:empty)');

    let name = '';
    const possible = document.querySelector('.profile-user-name, #profile-name, [data-user-name]');
    if(possible) name = (possible.textContent || possible.getAttribute('data-user-name') || '').trim();

    const plus = document.body.classList.contains('plus-active') ||
      /MATHLVL Plus/i.test(document.body.textContent || '');

    setAccountMenuState(signedIn, name, plus);
  }

  // Default to guest before app auth logic finishes.
  setAccountMenuState(false, '', false);
  setTimeout(syncFromExistingUI, 300);

  // Login action opens the existing profile/login screen.
  document.getElementById('sidebar-login-open')?.addEventListener('click', ()=>{
    document.getElementById('sidebar-profile-menu')?.setAttribute('hidden','');
    document.getElementById('sidebar-profile-wrap')?.classList.remove('open');
    document.getElementById('sidebar-footer')?.setAttribute('aria-expanded','false');
    if(typeof activateTab === 'function') activateTab('profile');
  });

  // Hook existing sign-in/sign-out helpers if present.
  if(typeof window.showSignedOutUI === 'function'){
    const orig = window.showSignedOutUI;
    window.showSignedOutUI = function(...args){
      const out = orig.apply(this,args);
      setAccountMenuState(false,'',false);
      return out;
    };
  }

  if(typeof window.showSignedInUI === 'function'){
    const orig = window.showSignedInUI;
    window.showSignedInUI = function(...args){
      const out = orig.apply(this,args);
      const nameEl = document.querySelector('.profile-user-name, #profile-name, [data-user-name]');
      const nm = nameEl ? (nameEl.textContent || nameEl.getAttribute('data-user-name') || '').trim() : '';
      setAccountMenuState(true,nm,false);
      return out;
    };
  }
})();
