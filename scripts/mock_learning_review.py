from pathlib import Path
import re

p = Path('index.html')
s = p.read_text(encoding='utf-8')

MARKER = 'MATHLVL_MOCK_LEARNING_REVIEW_V1'
if MARKER in s:
    print('Mock learning review already applied.')
    raise SystemExit(0)

# 1) Send every scored response element to Ustoz AI, not only mistakes.
pattern = re.compile(
    r"  const feedbackWrong = \[\];\n.*?  const mockFeedbackPayload = \{ title:activeMock\.title, correct, total:totalElements, wrong:feedbackWrong \};",
    re.S
)
replacement = r"""  const feedbackItems = [];
  const feedbackLetters = ['A','B','C','D'];
  activeMock.closed.forEach((q,i) => {
    const givenIndex = mockClosedAnswers[i];
    feedbackItems.push({
      label:String(i + 1),
      section:'Yopiq',
      question:q.q,
      given:givenIndex === null ? '' : (q.o[givenIndex] || ''),
      expected:q.o[q.a] || '',
      isCorrect:givenIndex === q.a
    });
  });
  activeMock.open.forEach((q,qi) => q.parts.forEach((part,pi) => {
    const given = mockOpenAnswers[qi][pi] || '';
    feedbackItems.push({
      label:`${activeMock.closed.length + qi + 1}${part.label || ''}`,
      section:'Ochiq A/B',
      question:`${q.q} ${part.label}) ${part.ask}`,
      given,
      expected:part.ans,
      isCorrect:isMockAnswerCorrect(given, part.ans)
    });
  }));
  const mockFeedbackPayload = {
    title:activeMock.title,
    correct,
    total:totalElements,
    answered,
    items:feedbackItems
  };"""
s, count = pattern.subn(lambda _m: replacement, s, count=1)
if count != 1:
    raise SystemExit(f'mock feedback payload anchor not found/replaced: {count}')

# 2) Remove visible attempts/history metrics. Keep only status on each mock card.
s = s.replace(
    "150 daqiqalik to‘liq format, saqlanadigan progress va natijalar tarixi. Har urinishdan keyin o‘sishingizni ko‘ring.",
    "150 daqiqalik to‘liq format, saqlanadigan progress va har mock uchun aniq ishlangan holati."
)

addon = r'''
<style id="mathlvl-mock-learning-review-style">
/* MATHLVL_MOCK_LEARNING_REVIEW_V1 */
#panel-mocktest #mocktest-results-btn,
#panel-mocktest .mock-modern-stats,
#panel-mocktest .mock-best-score{
  display:none!important;
}
#panel-mocktest .mock-modern-hero{
  grid-template-columns:minmax(0,1fr)!important;
}
#panel-mocktest .mock-modern-copy{max-width:760px}

.mathlvl-mock-finish-now{
  border-color:rgba(255,201,60,.28)!important;
  color:#ffd56d!important;
  background:rgba(255,201,60,.055)!important;
}
.mathlvl-mock-finish-now:hover{
  background:rgba(255,201,60,.10)!important;
  border-color:rgba(255,201,60,.42)!important;
}

.mathlvl-math-keyboard{
  margin-top:10px;
  border-top:1px solid var(--border-soft);
  padding-top:10px;
}
.mathlvl-math-keyboard-toggle{
  width:100%;
  display:flex;
  align-items:center;
  justify-content:center;
  gap:7px;
  min-height:38px;
  border:1px solid rgba(112,135,255,.15);
  border-radius:10px;
  background:rgba(255,255,255,.025);
  color:var(--text-dim);
  font:650 11.5px var(--font-body);
  cursor:pointer;
}
.mathlvl-math-keyboard-toggle:hover{color:var(--text);border-color:rgba(112,135,255,.3)}
.mathlvl-math-keyboard-panel{
  display:grid;
  grid-template-columns:repeat(8,minmax(0,1fr));
  gap:6px;
  margin-top:8px;
}
.mathlvl-math-key{
  min-width:0;
  height:34px;
  padding:0 5px;
  border:1px solid rgba(115,138,255,.13);
  border-radius:8px;
  background:rgba(255,255,255,.03);
  color:#e6ebfb;
  font:650 12px var(--font-mono);
  cursor:pointer;
}
.mathlvl-math-key:hover{background:rgba(92,116,255,.10);border-color:rgba(105,131,255,.28)}
.mathlvl-math-keyboard-note{
  margin-top:7px;
  color:var(--text-dim);
  font-size:9.5px;
  line-height:1.45;
}
#mock-ai-feedback-box h3{
  margin:20px 0 8px;
  padding-top:14px;
  border-top:1px solid var(--border-soft);
  font-family:var(--font-display);
  font-size:15px;
}
#mock-ai-feedback-box h3:first-child{border-top:0;padding-top:0}
#mock-ai-feedback-box h2{
  margin:24px 0 10px;
  font-family:var(--font-display);
  font-size:18px;
}
#mock-ai-feedback-box p{margin:7px 0}
#mock-ai-feedback-box strong{color:#eef2ff}

html[data-theme="light"] .mathlvl-math-key{background:#fff;color:#263653;border-color:rgba(43,70,130,.12)}
html[data-theme="light"] .mathlvl-math-keyboard-toggle{background:#fff;color:#68758f;border-color:rgba(43,70,130,.12)}
html[data-theme="light"] #mock-ai-feedback-box strong{color:#17233e}

/* ---------- In-app mock confirmation ---------- */
.mathlvl-mock-confirm-backdrop{
  position:fixed;
  inset:0;
  z-index:10050;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:20px;
  background:rgba(4,7,11,.72);
  backdrop-filter:blur(12px);
  -webkit-backdrop-filter:blur(12px);
  animation:mathlvlMockFade .16s ease;
}
.mathlvl-mock-confirm{
  width:min(430px,100%);
  padding:22px;
  border:1px solid rgba(255,255,255,.08);
  border-radius:18px;
  background:
    radial-gradient(260px 140px at 100% 0,rgba(115,128,255,.10),transparent 72%),
    #10151c;
  box-shadow:0 30px 90px rgba(0,0,0,.46);
  animation:mathlvlMockPop .18s cubic-bezier(.2,.8,.2,1);
}
.mathlvl-mock-confirm-icon{
  width:42px;
  height:42px;
  display:grid;
  place-items:center;
  margin-bottom:16px;
  border:1px solid rgba(115,128,255,.16);
  border-radius:12px;
  background:rgba(115,128,255,.09);
  color:#aeb6ff;
}
.mathlvl-mock-confirm-icon svg{
  width:19px;
  height:19px;
  fill:none;
  stroke:currentColor;
  stroke-width:1.8;
  stroke-linecap:round;
  stroke-linejoin:round;
}
.mathlvl-mock-confirm-kicker{
  margin-bottom:7px;
  color:#7e8afa;
  font-size:8.5px;
  font-weight:850;
  letter-spacing:.16em;
}
.mathlvl-mock-confirm h3{
  margin:0 0 9px;
  color:#f1f4f8;
  font-family:var(--font-display);
  font-size:21px;
  line-height:1.15;
  letter-spacing:-.035em;
}
.mathlvl-mock-confirm p{
  margin:0;
  color:#7e899a;
  font-size:12px;
  line-height:1.65;
}
.mathlvl-mock-confirm-actions{
  display:flex;
  justify-content:flex-end;
  gap:8px;
  margin-top:22px;
}
.mathlvl-mock-confirm-actions button{
  min-height:40px;
  padding:9px 14px!important;
  border-radius:10px!important;
  font-size:11px!important;
  font-weight:750!important;
}
.mathlvl-mock-confirm-ok{
  border:1px solid transparent!important;
  background:#737ff5!important;
  color:#fff!important;
  box-shadow:0 9px 24px rgba(91,107,240,.18)!important;
}
.mathlvl-mock-confirm-ok:hover{
  transform:translateY(-1px);
  filter:brightness(1.05);
}
@keyframes mathlvlMockFade{from{opacity:0}to{opacity:1}}
@keyframes mathlvlMockPop{
  from{opacity:0;transform:translateY(8px) scale(.98)}
  to{opacity:1;transform:translateY(0) scale(1)}
}

html[data-theme="light"] .mathlvl-mock-confirm-backdrop{
  background:rgba(32,42,60,.32);
}
html[data-theme="light"] .mathlvl-mock-confirm{
  border-color:rgba(31,45,67,.09);
  background:#fff;
  box-shadow:0 28px 76px rgba(42,54,76,.18);
}
html[data-theme="light"] .mathlvl-mock-confirm h3{color:#1b2536}
html[data-theme="light"] .mathlvl-mock-confirm p{color:#6f7c8f}
html[data-theme="light"] .mathlvl-mock-confirm-icon{
  border-color:rgba(93,110,230,.14);
  background:rgba(93,110,230,.07);
  color:#6170dc;
}

@media(max-width:600px){
  .mathlvl-math-keyboard-panel{grid-template-columns:repeat(6,minmax(0,1fr));gap:5px}
  .mathlvl-math-key{height:36px;font-size:12px}
  .mathlvl-mock-finish-now{width:100%}
}
@media(max-width:390px){
  .mathlvl-math-keyboard-panel{grid-template-columns:repeat(5,minmax(0,1fr))}
}
</style>

<script id="mathlvl-mock-learning-review-runtime">
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
</script>
'''

if '</body>' not in s:
    raise SystemExit('closing body not found')
s = s.replace('</body>', addon + '\n</body>', 1)

required = [
    MARKER,
    'feedbackItems',
    'mathlvl-mock-finish-now',
    'Matematik belgilar',
    '#panel-mocktest #mocktest-results-btn',
]
for token in required:
    if token not in s:
        raise SystemExit(f'mock learning review missing: {token}')

p.write_text(s, encoding='utf-8')
print('Mock learning review, early finish and math keyboard applied.')
