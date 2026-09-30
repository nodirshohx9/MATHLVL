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
  function syncAccount(data){
    const signedIn = !!data?.loggedIn && !data.isGuest;
    setAccountMenuState(signedIn, data?.name || data?.email || '', signedIn && !!window.MATHLVL_PLUS_ACTIVE);
  }
  // Auth events are authoritative; visible page text cannot establish a session.
  window.addEventListener('mathlvl:authchange', event => syncAccount(event.detail));
  syncAccount(window.MATHLVL_CURRENT_SESSION);
})();
