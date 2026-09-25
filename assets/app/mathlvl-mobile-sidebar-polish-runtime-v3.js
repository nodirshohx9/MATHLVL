
(function(){
  const gate = document.getElementById('mathlvl-auth-gate');
  const menuBtn = document.getElementById('mathlvl-mobile-menu-btn');
  if(!gate) return;
  const closeDrawer = ()=>{
    document.body.classList.remove('mobile-sidebar-open');
    menuBtn?.setAttribute('aria-expanded','false');
  };
  const obs = new MutationObserver(()=>{
    if(!gate.hidden) closeDrawer();
  });
  obs.observe(gate,{attributes:true,attributeFilter:['hidden']});
})();
