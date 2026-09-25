
(function(){
  const root = document.getElementById('mocktest-list');
  if(!root) return;

  function getClosedCount(){
    try{ return Array.isArray(activeMock?.closed) ? activeMock.closed.length : 0; }
    catch(_e){ return 0; }
  }

  function syncAnswerButtons(){
    let currentIndex;
    try{ currentIndex = Number(mockIndex); }catch(_e){ return; }
    const closedCount = getClosedCount();
    const area = root.querySelector('#mock-answer-area');
    if(!area) return;

    const buttons = [...area.querySelectorAll('button.ghost-btn')]
      .filter(btn=>!btn.closest('.mathlvl-math-keyboard'));

    buttons.forEach(btn=>{
      btn.classList.remove('mathlvl-answer-selected');
      btn.setAttribute('aria-pressed','false');
    });

    if(currentIndex < closedCount){
      let selected = null;
      try{ selected = mockClosedAnswers[currentIndex]; }catch(_e){}
      if(Number.isInteger(selected) && buttons[selected]){
        buttons[selected].classList.add('mathlvl-answer-selected');
        buttons[selected].setAttribute('aria-pressed','true');
      }
    }

    area.querySelectorAll('.mock-open-input').forEach(input=>{
      input.classList.toggle('mathlvl-open-filled', Boolean(String(input.value || '').trim()));
    });
  }

  function syncNavGrid(){
    const nav = root.querySelector('#mock-nav-grid');
    if(!nav) return;
    const buttons = [...nav.querySelectorAll('button.ghost-btn')];
    let closedCount = getClosedCount();
    let current = -1;
    try{ current = Number(mockIndex); }catch(_e){}

    buttons.forEach((btn,index)=>{
      btn.classList.remove('mathlvl-nav-answered','mathlvl-nav-partial','mathlvl-nav-current');
      if(index === current) btn.classList.add('mathlvl-nav-current');

      if(index < closedCount){
        let answered = false;
        try{ answered = mockClosedAnswers[index] !== null && mockClosedAnswers[index] !== undefined; }catch(_e){}
        if(answered) btn.classList.add('mathlvl-nav-answered');
        return;
      }

      const openIndex = index - closedCount;
      let row = [];
      try{ row = Array.isArray(mockOpenAnswers?.[openIndex]) ? mockOpenAnswers[openIndex] : []; }catch(_e){}
      if(!row.length) return;
      const filled = row.filter(v=>String(v ?? '').trim()).length;
      if(filled === row.length) btn.classList.add('mathlvl-nav-answered');
      else if(filled > 0) btn.classList.add('mathlvl-nav-partial');
    });
  }

  function syncMockSelectionUI(){
    syncAnswerButtons();
    syncNavGrid();
  }

  let queued = false;
  function schedule(){
    if(queued) return;
    queued = true;
    requestAnimationFrame(()=>{
      queued = false;
      syncMockSelectionUI();
    });
  }

  root.addEventListener('click',e=>{
    if(e.target.closest('#mock-answer-area button.ghost-btn') || e.target.closest('#mock-nav-grid button.ghost-btn')){
      setTimeout(syncMockSelectionUI,0);
      setTimeout(syncMockSelectionUI,40);
    }
  },true);

  root.addEventListener('input',e=>{
    if(e.target.matches('.mock-open-input')) schedule();
  },true);

  new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
  schedule();
})();
