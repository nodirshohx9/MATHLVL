from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

MARKER = 'MATHLVL_MOCK_SELECTION_VISIBILITY_V1'
if MARKER in s:
    print('Mock selection visibility already applied.')
    raise SystemExit(0)

addon = r'''
<style id="mathlvl-mock-selection-visibility">
/* MATHLVL_MOCK_SELECTION_VISIBILITY_V1 */
#panel-mocktest #mock-answer-area .ghost-btn.mathlvl-answer-selected{
  position:relative;
  background:linear-gradient(135deg,rgba(103,121,255,.24),rgba(124,98,239,.18))!important;
  border-color:rgba(130,145,255,.78)!important;
  color:#fff!important;
  box-shadow:0 0 0 2px rgba(111,128,255,.12),0 10px 26px rgba(48,64,170,.18)!important;
}
#panel-mocktest #mock-answer-area .ghost-btn.mathlvl-answer-selected::after{
  content:'✓';
  position:absolute;
  right:13px;
  top:50%;
  transform:translateY(-50%);
  width:22px;
  height:22px;
  display:grid;
  place-items:center;
  border-radius:50%;
  background:#7685ff;
  color:white;
  font-size:12px;
  font-weight:900;
  box-shadow:0 4px 12px rgba(77,92,210,.28);
}
#panel-mocktest #mock-answer-area .ghost-btn.mathlvl-answer-selected .katex{
  color:#fff!important;
}
#panel-mocktest #mock-nav-grid .ghost-btn.mathlvl-nav-answered{
  position:relative;
  background:rgba(105,123,255,.13)!important;
  border-color:rgba(111,132,255,.42)!important;
  color:#dfe4ff!important;
}
#panel-mocktest #mock-nav-grid .ghost-btn.mathlvl-nav-answered::after{
  content:'';
  position:absolute;
  right:4px;
  top:4px;
  width:5px;
  height:5px;
  border-radius:50%;
  background:#7e8dff;
  box-shadow:0 0 8px rgba(126,141,255,.72);
}
#panel-mocktest #mock-nav-grid .ghost-btn.mathlvl-nav-partial{
  border-color:rgba(244,178,65,.38)!important;
  color:#ffd071!important;
}
#panel-mocktest #mock-nav-grid .ghost-btn.mathlvl-nav-current{
  box-shadow:0 0 0 2px rgba(111,128,255,.28)!important;
}
#panel-mocktest .mock-open-input.mathlvl-open-filled{
  border-color:rgba(112,132,255,.58)!important;
  background:rgba(92,110,255,.055)!important;
  box-shadow:0 0 0 2px rgba(111,128,255,.08)!important;
}
html[data-theme="light"] #panel-mocktest #mock-answer-area .ghost-btn.mathlvl-answer-selected{
  background:linear-gradient(135deg,rgba(91,110,230,.14),rgba(116,92,214,.10))!important;
  border-color:rgba(84,101,219,.58)!important;
  color:#253257!important;
  box-shadow:0 0 0 2px rgba(84,101,219,.08),0 9px 22px rgba(54,72,130,.10)!important;
}
html[data-theme="light"] #panel-mocktest #mock-answer-area .ghost-btn.mathlvl-answer-selected .katex{
  color:#253257!important;
}
html[data-theme="light"] #panel-mocktest #mock-nav-grid .ghost-btn.mathlvl-nav-answered{
  background:rgba(91,110,230,.08)!important;
  border-color:rgba(84,101,219,.28)!important;
  color:#33446d!important;
}
@media(max-width:600px){
  #panel-mocktest #mock-answer-area .ghost-btn.mathlvl-answer-selected{
    padding-right:46px!important;
  }
}
</style>

<script id="mathlvl-mock-selection-visibility-runtime">
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
</script>
'''

if '</body>' not in s:
    raise SystemExit('Closing body tag not found')

s = s.replace('</body>', addon + '\n</body>', 1)
p.write_text(s, encoding='utf-8')
print('Mock selected answers are now clearly visible.')
