
(function(){
  const qrQuick = document.getElementById('profile-gift-qr-btn');
  const manualQuick = document.getElementById('open-redeem-btn');
  const input = document.getElementById('manual-redeem-input');
  const scanBtn = document.getElementById('qr-scan-btn');
  const overlay = document.getElementById('redeem-screen-overlay');

  function openGift(){
    if(typeof openRedeemScreen === 'function') openRedeemScreen();
    else overlay?.classList.add('open');
  }

  qrQuick?.addEventListener('click', ()=>{
    openGift();
    scanBtn?.click();
  });

  manualQuick?.addEventListener('click', ()=>{
    window.setTimeout(()=> input?.focus({preventScroll:false}), 80);
  });

  input?.addEventListener('input', ()=>{
    const pos = input.selectionStart;
    input.value = input.value.toUpperCase().replace(/\s+/g,'');
    try{ input.setSelectionRange(pos,pos); }catch(e){}
  });

  const obs = overlay ? new MutationObserver(()=>{
    if(!overlay.classList.contains('open') && typeof stopQrScanner === 'function') stopQrScanner();
  }) : null;
  if(obs) obs.observe(overlay,{attributes:true,attributeFilter:['class']});

  // Help behavior is owned by the main Help Center. Do not replace its click handler here.
})();
