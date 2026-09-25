
(function(){
  const root = document.getElementById('mocktest-list');
  if(!root) return;

  root.addEventListener('click', e=>{
    const toggle = e.target.closest('.mathlvl-math-keyboard-toggle');
    if(!toggle || !root.contains(toggle)) return;

    root.querySelectorAll('.mathlvl-math-keyboard').forEach(keyboard=>{
      if(keyboard.contains(toggle)) return;
      const otherPanel = keyboard.querySelector('.mathlvl-math-keyboard-panel');
      const otherToggle = keyboard.querySelector('.mathlvl-math-keyboard-toggle');
      if(otherPanel) otherPanel.hidden = true;
      if(otherToggle) otherToggle.setAttribute('aria-expanded','false');
    });
  }, true);
})();
