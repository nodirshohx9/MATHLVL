
(function(){
  const footerName = document.getElementById('sidebar-footer-name');
  const footerPlan = document.getElementById('sidebar-footer-plan');

  function setAccountMenuState(signedIn, userName, isPlus){
    document.querySelectorAll('[data-auth-only="true"]').forEach(el => el.hidden = !signedIn);
    document.querySelectorAll('[data-signed-out-only="true"]').forEach(el => el.hidden = signedIn);

    if(footerName) footerName.textContent = signedIn ? (userName || 'Profil') : 'Hisobga kiring';
    if(footerPlan) footerPlan.textContent = signedIn ? (isPlus ? 'MATHLVL Plus' : 'Bepul plan') : 'Akkauntga kiring';
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

  // Default to signed out before app auth logic finishes.
  setAccountMenuState(false, '', false);
  setTimeout(syncFromExistingUI, 300);

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
