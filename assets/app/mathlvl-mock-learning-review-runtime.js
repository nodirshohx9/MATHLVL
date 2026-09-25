
(function(){
  const list = document.getElementById('mocktest-list');
  if(!list) return;

  const symbols = [
    {l:'π',v:'π'},{l:'√',v:'√()',b:1},{l:'∛',v:'∛()',b:1},{l:'x²',v:'²'},
    {l:'x³',v:'³'},{l:'xⁿ',v:'^()' ,b:1},{l:'a/b',v:'()/()',b:4},{l:'±',v:'±'},
    {l:'×',v:'×'},{l:'÷',v:'÷'},{l:'≤',v:'≤'},{l:'≥',v:'≥'},
    {l:'≠',v:'≠'},{l:'∞',v:'∞'},{l:'|x|',v:'||',b:1},{l:'°',v:'°'},
    {l:'log',v:'log()',b:1},{l:'ln',v:'ln()',b:1},{l:'sin',v:'sin()',b:1},{l:'cos',v:'cos()',b:1},
    {l:'tan',v:'tan()',b:1},{l:'cot',v:'cot()',b:1},{l:'α',v:'α'},{l:'β',v:'β'},
    {l:'θ',v:'θ'},{l:'φ',v:'φ'},{l:'Σ',v:'Σ'},{l:'∫',v:'∫'},
    {l:'(',v:'('},{l:')',v:')'},{l:'[',v:'['},{l:']',v:']'},
    {l:'{',v:'{'},{l:'}',v:'}'},{l:'e',v:'e'},{l:'%',v:'%'}
  ];

  function insertSymbol(input, item){
    const start = Number.isFinite(input.selectionStart) ? input.selectionStart : input.value.length;
    const end = Number.isFinite(input.selectionEnd) ? input.selectionEnd : start;
    const before = input.value.slice(0,start);
    const after = input.value.slice(end);
    input.value = before + item.v + after;
    const pos = start + item.v.length - Number(item.b || 0);
    input.focus();
    try{ input.setSelectionRange(pos,pos); }catch(_e){}
    input.dispatchEvent(new Event('input',{bubbles:true}));
  }

  function enhanceMathInputs(){
    list.querySelectorAll('.mock-open-input').forEach(input=>{
      input.setAttribute('inputmode','text');
      input.setAttribute('autocomplete','off');
      const holder = input.parentElement;
      if(!holder || holder.querySelector('.mathlvl-math-keyboard')) return;

      const wrap = document.createElement('div');
      wrap.className = 'mathlvl-math-keyboard';

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'mathlvl-math-keyboard-toggle';
      toggle.innerHTML = '<span>⌨</span><span>Matematik belgilar</span>';

      const panel = document.createElement('div');
      panel.className = 'mathlvl-math-keyboard-panel';
      panel.hidden = true;

      symbols.forEach(item=>{
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'mathlvl-math-key';
        btn.textContent = item.l;
        btn.addEventListener('click',()=>insertSymbol(input,item));
        panel.appendChild(btn);
      });

      const note = document.createElement('div');
      note.className = 'mathlvl-math-keyboard-note';
      note.textContent = 'π, ildiz, logarifm, trigonometrik funksiyalar va klaviaturada topish qiyin bo‘lgan belgilar.';

      toggle.addEventListener('click',()=>{
        panel.hidden = !panel.hidden;
        toggle.setAttribute('aria-expanded', panel.hidden ? 'false' : 'true');
      });
      toggle.setAttribute('aria-expanded','false');

      wrap.append(toggle,panel,note);
      holder.appendChild(wrap);
    });
  }

  function showMockConfirm({title, message, confirmText = 'Yakunlash'}){
    return new Promise(resolve=>{
      const previous = document.querySelector('.mathlvl-mock-confirm-backdrop');
      if(previous) previous.remove();

      const backdrop = document.createElement('div');
      backdrop.className = 'mathlvl-mock-confirm-backdrop';
      backdrop.innerHTML = `
        <div class="mathlvl-mock-confirm" role="dialog" aria-modal="true" aria-labelledby="mathlvl-mock-confirm-title">
          <div class="mathlvl-mock-confirm-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M12 3 4.5 6v5.2c0 4.7 3.1 8.1 7.5 9.8 4.4-1.7 7.5-5.1 7.5-9.8V6z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
          </div>
          <div class="mathlvl-mock-confirm-kicker">MOCK TEST</div>
          <h3 id="mathlvl-mock-confirm-title"></h3>
          <p class="mathlvl-mock-confirm-message"></p>
          <div class="mathlvl-mock-confirm-actions">
            <button type="button" class="ghost-btn mathlvl-mock-confirm-cancel">Bekor qilish</button>
            <button type="button" class="mathlvl-mock-confirm-ok"></button>
          </div>
        </div>`;

      const titleEl = backdrop.querySelector('#mathlvl-mock-confirm-title');
      const messageEl = backdrop.querySelector('.mathlvl-mock-confirm-message');
      const cancelBtn = backdrop.querySelector('.mathlvl-mock-confirm-cancel');
      const okBtn = backdrop.querySelector('.mathlvl-mock-confirm-ok');

      titleEl.textContent = title;
      messageEl.textContent = message;
      okBtn.textContent = confirmText;

      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      document.body.appendChild(backdrop);

      let settled = false;
      function close(value){
        if(settled) return;
        settled = true;
        document.removeEventListener('keydown', onKey);
        document.body.style.overflow = previousOverflow;
        backdrop.remove();
        resolve(value);
      }
      function onKey(e){
        if(e.key === 'Escape') close(false);
        if(e.key === 'Enter') close(true);
      }

      cancelBtn.addEventListener('click',()=>close(false));
      okBtn.addEventListener('click',()=>close(true));
      backdrop.addEventListener('click',e=>{ if(e.target === backdrop) close(false); });
      document.addEventListener('keydown',onKey);
      setTimeout(()=>okBtn.focus(),30);
    });
  }

  function enhanceFinishButton(){
    const exit = list.querySelector('#mock-exit');
    if(!exit || list.querySelector('#mathlvl-mock-finish-now')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'mathlvl-mock-finish-now';
    btn.className = 'ghost-btn mathlvl-mock-finish-now';
    btn.textContent = '✓ Testni yakunlash';

    btn.addEventListener('click',async ()=>{
      if(typeof activeMock === 'undefined' || !activeMock) return;
      const total = mockTotalElements(activeMock);
      const answered = mockAnsweredElements();
      const left = Math.max(0,total-answered);

      const approved = await showMockConfirm({
        title: left ? 'Javobsiz savollar bor' : 'Testni yakunlaysizmi?',
        message: left
          ? `${left} ta javob elementi hali javobsiz. Testni hozir yakunlasangiz, ular javobsiz hisoblanadi.`
          : 'Barcha javoblaringiz saqlanadi va natija darhol hisoblanadi.',
        confirmText: 'Testni yakunlash'
      });

      if(approved) finishMockTest(false);
    });

    exit.parentElement.insertBefore(btn,exit);
  }

  function cleanMockCards(){
    list.querySelectorAll('.mock-best-score').forEach(el=>el.remove());
    list.querySelectorAll('.mock-status-badge.done').forEach(el=>{ el.textContent='✓ Ishlangan'; });
  }

  function enhance(){
    enhanceFinishButton();
    enhanceMathInputs();
    cleanMockCards();
  }

  let queued = false;
  function schedule(){
    if(queued) return;
    queued = true;
    requestAnimationFrame(()=>{ queued=false; enhance(); });
  }
  new MutationObserver(schedule).observe(list,{childList:true,subtree:true});
  schedule();
})();
