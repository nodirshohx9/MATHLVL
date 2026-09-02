from pathlib import Path
import re

path = Path('index.html')
text = path.read_text(encoding='utf-8')

start = '// ================= MILLIY SERTIFIKAT MOCK TEST ================='
end = 'renderMockTestList();'

if start not in text or end not in text:
    raise SystemExit('Mock test markers not found')

replacement = r'''// ================= MILLIY SERTIFIKAT MOCK TEST =================
// Format is based on BBA/UZBMB's published mathematics national-certificate structure:
// 35 closed questions + 10 open questions, each open question has A/B parts = 55 scored response elements.
// Time: 150 minutes. Questions below are original MATHLVL practice questions, not copied official items.
let mockTestData = [
  {
    id:'ms-full-1',
    title:'Matematika — Milliy sertifikat Mock #1',
    minutes:150,
    closedCount:35,
    openCount:10,
    closed:[
      {q:'$2x+5=17$ tenglamaning yechimini toping.',o:['4','5','6','7'],a:2},
      {q:'$x^2-7x+10=0$ tenglama ildizlari ko‘paytmasini toping.',o:['7','10','12','17'],a:1},
      {q:'$3^x=27$ bo‘lsa, $x$ ni toping.',o:['2','3','4','9'],a:1},
      {q:'$\\log_2 32$ ning qiymatini toping.',o:['4','5','6','8'],a:1},
      {q:'Arifmetik progressiyada $a_1=5$, $d=4$. $a_{10}$ ni toping.',o:['37','39','41','45'],a:2},
      {q:'Geometrik progressiyada $b_1=3$, $q=2$. $b_6$ ni toping.',o:['48','64','96','192'],a:2},
      {q:'$\\sqrt{50}$ ifodani soddalashtiring.',o:['$2\\sqrt5$','$5\\sqrt2$','$10\\sqrt5$','$25\\sqrt2$'],a:1},
      {q:'$\\frac{1}{x-1}=\\frac13$ tenglamaning yechimini toping.',o:['2','3','4','5'],a:2},
      {q:'$|2x-5|=7$ tenglama yechimlari yig‘indisini toping.',o:['3','4','5','7'],a:2},
      {q:'$x+y=11$, $x-y=3$ sistemada $x$ ni toping.',o:['4','6','7','8'],a:2},
      {q:'$f(x)=2x^2-3$ bo‘lsa, $f(2)$ ni toping.',o:['1','5','8','13'],a:1},
      {q:'$y=\\sqrt{5-x}$ funksiyaning aniqlanish sohasini toping.',o:['$x<5$','$x\\le5$','$x\\ge5$','$x>5$'],a:1},
      {q:'$y=x^2-6x+11$ parabola uchining abssissasini toping.',o:['2','3','4','6'],a:1},
      {q:'$3x-4>8$ tengsizlikni yeching.',o:['$x>3$','$x>4$','$x<4$','$x\\ge4$'],a:1},
      {q:'$\\sin30^\\circ$ ning qiymatini toping.',o:['$0$','$\\frac12$','$\\frac{\\sqrt2}{2}$','$1$'],a:1},
      {q:'$\\cos60^\\circ$ ning qiymatini toping.',o:['$0$','$\\frac12$','$\\frac{\\sqrt3}{2}$','$1$'],a:1},
      {q:'$\\tan45^\\circ$ ning qiymatini toping.',o:['$0$','$\\frac12$','$1$','$\\sqrt3$'],a:2},
      {q:'$\\sin^2\\alpha+\\cos^2\\alpha$ nimaga teng?',o:['0','1','$\\sin2\\alpha$','$\\cos2\\alpha$'],a:1},
      {q:'Uchburchakning ikki burchagi $35^\\circ$ va $65^\\circ$. Uchinchi burchakni toping.',o:['$70^\\circ$','$75^\\circ$','$80^\\circ$','$90^\\circ$'],a:2},
      {q:'Katetlari 8 va 15 bo‘lgan to‘g‘ri burchakli uchburchak gipotenuzasini toping.',o:['16','17','18','23'],a:1},
      {q:'Radiusi 6 bo‘lgan doiraning yuzini toping.',o:['$12\\pi$','$18\\pi$','$36\\pi$','$72\\pi$'],a:2},
      {q:'Radiusi 5 bo‘lgan aylananing uzunligini toping.',o:['$5\\pi$','$10\\pi$','$20\\pi$','$25\\pi$'],a:1},
      {q:'Tomonlari 7 va 11 bo‘lgan to‘g‘ri to‘rtburchak yuzini toping.',o:['18','36','72','77'],a:3},
      {q:'Asoslari 6 va 10, balandligi 4 bo‘lgan trapetsiya yuzini toping.',o:['24','28','32','64'],a:2},
      {q:'Muntazam oltiburchakning bitta ichki burchagini toping.',o:['$108^\\circ$','$120^\\circ$','$135^\\circ$','$144^\\circ$'],a:1},
      {q:'$C_6^2$ ning qiymatini toping.',o:['12','15','20','30'],a:1},
      {q:'Oddiy kubik tashlanganda 4 dan katta son tushish ehtimolini toping.',o:['$\\frac16$','$\\frac13$','$\\frac12$','$\\frac23$'],a:1},
      {q:'4, 6, 8, 10 sonlarining o‘rta arifmetigini toping.',o:['6','7','8','9'],a:1},
      {q:'84 va 126 sonlarining EKUBini toping.',o:['21','28','42','63'],a:2},
      {q:'12 va 18 sonlarining EKUKini toping.',o:['24','30','36','72'],a:2},
      {q:'$2^5$ sonini 5 ga bo‘lgandagi qoldiqni toping.',o:['0','1','2','3'],a:2},
      {q:'$f(x)=x^3-2x$ bo‘lsa, $f\'(1)$ ni toping.',o:['-1','0','1','3'],a:2},
      {q:'$\\int_0^2 x\\,dx$ ni hisoblang.',o:['1','2','3','4'],a:1},
      {q:'$1+2+3+\\dots+20$ yig‘indini toping.',o:['190','200','210','220'],a:2},
      {q:'$x^2+4x+5=0$ tenglama nechta haqiqiy ildizga ega?',o:['0','1','2','4'],a:0}
    ],
    open:[
      {q:'$x^2-5x+6=0$ tenglamaning ildizlarini toping.',parts:[{label:'A',ask:'Kichik ildiz',ans:'2'},{label:'B',ask:'Katta ildiz',ans:'3'}]},
      {q:'Arifmetik progressiyada $a_1=7$, $d=5$.',parts:[{label:'A',ask:'$a_{15}$ ni toping',ans:'77'},{label:'B',ask:'$S_{15}$ ni toping',ans:'630'}]},
      {q:'Koordinata tekisligida $A(0,0)$ va $B(6,8)$ nuqtalar berilgan. Shuningdek $C(2,4)$ va $D(8,10)$ nuqtalar berilgan.',parts:[{label:'A',ask:'$AB$ masofani toping',ans:'10'},{label:'B',ask:'$CD$ kesmaning o‘rta nuqtasi ordinatasini toping',ans:'7'}]},
      {q:'Radiusi 4 bo‘lgan aylana va doira uchun javoblarda $\\pi$ oldidagi koeffitsientni yozing.',parts:[{label:'A',ask:'Aylana uzunligidagi koeffitsient',ans:'8'},{label:'B',ask:'Doira yuzidagi koeffitsient',ans:'16'}]},
      {q:'$\\alpha$ o‘tkir burchak va $\\sin\\alpha=\\frac35$.',parts:[{label:'A',ask:'$\\cos\\alpha$ ni toping',ans:'4/5'},{label:'B',ask:'$\\tan\\alpha$ ni toping',ans:'3/4'}]},
      {q:'Darajali va logarifmik tenglamalarni yeching.',parts:[{label:'A',ask:'$2^{x+1}=16$ tenglamada $x$',ans:'3'},{label:'B',ask:'$\\log_3\\frac1{27}$ ning qiymati',ans:'-3'}]},
      {q:'$f(x)=x^2+1$, $g(x)=2x-3$.',parts:[{label:'A',ask:'$f(3)$ ni toping',ans:'10'},{label:'B',ask:'$g(f(2))$ ni toping',ans:'7'}]},
      {q:'Qutida 3 ta qizil va 2 ta ko‘k shar bor. Sharlar teng ehtimol bilan olinadi.',parts:[{label:'A',ask:'Bitta shar qizil chiqish ehtimoli',ans:'3/5'},{label:'B',ask:'Ketma-ket 2 ta shar qaytarmasdan olinganda ikkalasi ham qizil bo‘lish ehtimoli',ans:'3/10'}]},
      {q:'Hosila va integralni hisoblang.',parts:[{label:'A',ask:'$f(x)=x^3-3x^2+2x$ uchun $f\'(2)$',ans:'2'},{label:'B',ask:'$\\int_0^1(2x+1)\\,dx$',ans:'2'}]},
      {q:'Katetlari 9 va 12 bo‘lgan to‘g‘ri burchakli uchburchak berilgan.',parts:[{label:'A',ask:'Gipotenuzani toping',ans:'15'},{label:'B',ask:'Uchburchak yuzini toping',ans:'54'}]}
    ]
  }
];

let activeMock = null;
let mockIndex = 0; // 0..44
let mockClosedAnswers = [];
let mockOpenAnswers = [];
let mockSecondsLeft = 0;
let mockTimerId = null;

function renderMockMath(el){
  if(!el || typeof renderMathInElement !== 'function') return;
  try{ renderMathInElement(el,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}]}); }catch(e){}
}

function normalizeMockAnswer(v){
  return String(v ?? '').trim().toLowerCase().replace(/\s+/g,'').replace(/,/g,'.');
}
function isMockAnswerCorrect(given, expected){
  const g = normalizeMockAnswer(given);
  const e = normalizeMockAnswer(expected);
  if(!g) return false;
  if(g === e) return true;
  const frac = s => {
    if(/^[-+]?\d+(\.\d+)?\/[-+]?\d+(\.\d+)?$/.test(s)){
      const [a,b] = s.split('/').map(Number);
      return b !== 0 ? a/b : NaN;
    }
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  };
  const gn = frac(g), en = frac(e);
  return Number.isFinite(gn) && Number.isFinite(en) && Math.abs(gn-en) < 1e-9;
}

function mockTotalQuestions(t){ return t.closed.length + t.open.length; }
function mockTotalElements(t){
  return t.closed.length + t.open.reduce((total, question) => total + question.parts.length, 0);
}
function normalizeStoredMock(test){
  if(Array.isArray(test.closed) && Array.isArray(test.open)) return test;
  const closed = Array.isArray(test.questions) ? test.questions : [];
  return { ...test, closed, open:[], closedCount:closed.length, openCount:0 };
}
async function loadMockTests(){
  try{
    const res = await fetch('/api/mocks');
    const data = await res.json();
    if(res.ok && Array.isArray(data.mocks)){
      const byId = new Map(mockTestData.map(test => [test.id, test]));
      data.mocks.map(normalizeStoredMock).forEach(test => {
        if(test && test.id && test.closed.length) byId.set(test.id, test);
      });
      mockTestData = Array.from(byId.values());
    }
  }catch(e){}
  renderMockTestList();
}
function mockAnsweredElements(){
  if(!activeMock) return 0;
  const closed = mockClosedAnswers.filter(v => v !== null).length;
  let open = 0;
  mockOpenAnswers.forEach(row => row.forEach(v => { if(String(v ?? '').trim()) open++; }));
  return closed + open;
}

function renderMockTestList(){
  if(mockTimerId) clearInterval(mockTimerId);
  mockTimerId = null;
  activeMock = null;
  const list = document.getElementById('mocktest-list');
  if(!list) return;
  list.innerHTML = mockTestData.map(t => `
    <div class="mt-card">
      <div class="mt-card-icon" style="background:rgba(61,169,252,.14);color:var(--blue);">π</div>
      <div class="mt-card-body">
        <div class="mt-card-title">${t.title}</div>
        <div class="mt-card-meta">${mockTotalQuestions(t)} ta topshiriq • ${mockTotalElements(t)} ta javob elementi • ${t.minutes} daqiqa</div>
        <div class="mt-card-result">${t.open.length ? `${t.closed.length} ta yopiq + ${t.open.length} ta ochiq (A/B qismlar). BBA formatiga mos mashq varianti.` : `${t.closed.length} ta yopiq savoldan iborat MATHLVL mock testi.`}</div>
      </div>
      <button class="glow-btn mt-card-start" type="button" data-mt-start="${t.id}">Boshlash</button>
    </div>`).join('');
  list.querySelectorAll('[data-mt-start]').forEach(btn => btn.addEventListener('click', () => startMockTest(btn.dataset.mtStart)));
}

function startMockTest(id){
  activeMock = mockTestData.find(t => t.id === id);
  if(!activeMock) return;
  mockIndex = 0;
  mockClosedAnswers = Array(activeMock.closed.length).fill(null);
  mockOpenAnswers = activeMock.open.map(q => q.parts.map(() => ''));
  mockSecondsLeft = activeMock.minutes * 60;
  if(mockTimerId) clearInterval(mockTimerId);
  mockTimerId = setInterval(() => {
    mockSecondsLeft = Math.max(0, mockSecondsLeft - 1);
    updateMockClock();
    if(mockSecondsLeft === 0) finishMockTest(true);
  }, 1000);
  renderMockQuestion();
}

function updateMockClock(){
  const el = document.getElementById('mock-clock');
  if(!el) return;
  const h = Math.floor(mockSecondsLeft / 3600);
  const m = Math.floor((mockSecondsLeft % 3600) / 60);
  const s = mockSecondsLeft % 60;
  el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function renderMockQuestion(){
  if(!activeMock) return;
  const list = document.getElementById('mocktest-list');
  const totalQ = mockTotalQuestions(activeMock);
  const isClosed = mockIndex < activeMock.closed.length;
  const localIndex = isClosed ? mockIndex : mockIndex - activeMock.closed.length;
  const q = isClosed ? activeMock.closed[localIndex] : activeMock.open[localIndex];
  const sectionLabel = isClosed ? 'Yopiq test' : 'Ochiq test — A/B qismlar';

  list.innerHTML = `
    <div class="glass-card" style="padding:20px;">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap;">
        <div><b>${activeMock.title}</b><div style="font-size:12px;color:var(--text-dim);margin-top:4px;">${sectionLabel} • ${mockIndex+1}/${totalQ}-topshiriq</div></div>
        <div id="mock-clock" style="color:var(--gold);font-family:var(--font-mono);font-weight:800;"></div>
      </div>
      <div id="mock-question-text" style="font-size:17px;line-height:1.65;font-weight:600;margin:20px 0;"></div>
      <div id="mock-answer-area"></div>
      <div style="font-size:11.5px;color:var(--text-dim);margin-top:18px;">Javob berilgan: ${mockAnsweredElements()}/${mockTotalElements(activeMock)} element</div>
      <div id="mock-nav-grid" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:14px;"></div>
      <div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap;">
        <button class="ghost-btn" id="mock-prev" type="button" ${mockIndex===0?'disabled':''}>← Oldingi</button>
        <button class="glow-btn" id="mock-next" type="button">${mockIndex===totalQ-1?'Yakunlash':'Keyingi →'}</button>
        <button class="ghost-btn" id="mock-exit" type="button" style="margin-left:auto;">Testdan chiqish</button>
      </div>
    </div>`;

  const questionEl = document.getElementById('mock-question-text');
  questionEl.textContent = q.q;
  renderMockMath(questionEl);

  const answerArea = document.getElementById('mock-answer-area');
  if(isClosed){
    answerArea.style.display = 'grid';
    answerArea.style.gap = '10px';
    const letters = ['A','B','C','D'];
    q.o.forEach((text, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ghost-btn';
      btn.style.width = '100%';
      btn.style.textAlign = 'left';
      if(mockClosedAnswers[localIndex] === i){
        btn.style.borderColor = 'var(--blue)';
        btn.style.background = 'var(--blue-soft)';
      }
      const span = document.createElement('span');
      span.textContent = `${letters[i]}) ${text}`;
      btn.appendChild(span);
      renderMockMath(span);
      btn.addEventListener('click', () => { mockClosedAnswers[localIndex] = i; renderMockQuestion(); });
      answerArea.appendChild(btn);
    });
  }else{
    answerArea.innerHTML = q.parts.map((p,pi)=>`
      <div style="margin:12px 0;padding:14px;border:1px solid var(--border-soft);border-radius:12px;">
        <div class="mock-open-label" style="font-weight:700;margin-bottom:8px;">${p.label}) ${p.ask}</div>
        <input type="text" inputmode="decimal" class="mock-open-input" data-open-part="${pi}" placeholder="Qisqa javobni kiriting" value="${escapeHtml(mockOpenAnswers[localIndex][pi] || '')}">
      </div>`).join('');
    answerArea.querySelectorAll('.mock-open-label').forEach(renderMockMath);
    answerArea.querySelectorAll('.mock-open-input').forEach(inp=>{
      inp.addEventListener('input', ()=>{ mockOpenAnswers[localIndex][Number(inp.dataset.openPart)] = inp.value; });
    });
  }

  const nav = document.getElementById('mock-nav-grid');
  for(let i=0;i<totalQ;i++){
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ghost-btn';
    btn.textContent = i + 1;
    btn.style.padding = '7px 10px';
    const answered = i < activeMock.closed.length
      ? mockClosedAnswers[i] !== null
      : mockOpenAnswers[i-activeMock.closed.length].some(v => String(v||'').trim());
    if(i === mockIndex) btn.style.borderColor = 'var(--gold)';
    else if(answered) btn.style.borderColor = 'var(--blue)';
    btn.addEventListener('click', () => { mockIndex = i; renderMockQuestion(); });
    nav.appendChild(btn);
  }

  document.getElementById('mock-prev').addEventListener('click', () => {
    if(mockIndex > 0){ mockIndex--; renderMockQuestion(); }
  });
  document.getElementById('mock-next').addEventListener('click', () => {
    if(mockIndex < totalQ - 1){ mockIndex++; renderMockQuestion(); }
    else if(confirm('Test yakunlansinmi?')) finishMockTest(false);
  });
  document.getElementById('mock-exit').addEventListener('click', () => {
    if(confirm('Testdan chiqilsinmi? Kiritilgan javoblar saqlanmaydi.')) renderMockTestList();
  });
  updateMockClock();
}

function finishMockTest(autoFinish){
  if(!activeMock) return;
  if(mockTimerId) clearInterval(mockTimerId);
  mockTimerId = null;

  let correctClosed = 0;
  activeMock.closed.forEach((q,i) => { if(mockClosedAnswers[i] === q.a) correctClosed++; });
  let correctOpen = 0;
  activeMock.open.forEach((q,qi) => q.parts.forEach((p,pi) => {
    if(isMockAnswerCorrect(mockOpenAnswers[qi][pi], p.ans)) correctOpen++;
  }));
  const correct = correctClosed + correctOpen;
  const totalElements = mockTotalElements(activeMock);
  const answered = mockAnsweredElements();
  const percent = Math.round(correct / totalElements * 100);
  const result = {title:activeMock.title,correct,total:totalElements,answered,percent,at:new Date().toISOString()};
  try{
    const history = JSON.parse(localStorage.getItem('mathlvl_mock_results') || '[]');
    history.unshift(result);
    localStorage.setItem('mathlvl_mock_results', JSON.stringify(history.slice(0,20)));
  }catch(e){}

  const list = document.getElementById('mocktest-list');
  list.innerHTML = `
    <div class="glass-card" style="text-align:center;padding:28px;">
      <div style="font-size:42px;">${percent>=70?'🏆':percent>=50?'📈':'📚'}</div>
      <h3>Mashq natijasi: ${correct}/${totalElements}</h3>
      <div style="font-size:30px;font-weight:800;color:var(--blue);">${percent}%</div>
      <div style="color:var(--text-dim);margin:8px 0 8px;">Yopiq: ${correctClosed}/${activeMock.closed.length} • Ochiq A/B: ${correctOpen}/${totalElements-activeMock.closed.length} • Javob berilgan: ${answered}/${totalElements}${autoFinish?' • Vaqt tugadi':''}</div>
      <div style="max-width:650px;margin:0 auto 20px;font-size:12px;line-height:1.55;color:var(--text-dim);">Bu MATHLVL mashq ko‘rsatkichi. Rasmiy Milliy sertifikat natijasi oddiy foiz bilan emas, BBAning statistik baholash usuli (Rash modeli) asosida hisoblanadi.</div>
      <button class="glow-btn" id="mock-back-list" type="button">Mock testlarga qaytish</button>
    </div>`;
  document.getElementById('mock-back-list').addEventListener('click', renderMockTestList);
  activeMock = null;
}

const mockResultsBtn = document.getElementById('mocktest-results-btn');
if(mockResultsBtn){
  mockResultsBtn.addEventListener('click', () => {
    let history = [];
    try{ history = JSON.parse(localStorage.getItem('mathlvl_mock_results') || '[]'); }catch(e){}
    const list = document.getElementById('mocktest-list');
    list.innerHTML = `
      <div class="glass-card" style="padding:20px;">
        <h3 style="margin-top:0;">Oxirgi natijalar</h3>
        ${history.length ? history.map(r => `<div style="padding:10px 0;border-bottom:1px solid var(--border-soft);"><b>${r.title}</b><div style="font-size:12px;color:var(--text-dim);">${r.correct}/${r.total} element • ${r.percent}%</div></div>`).join('') : '<div class="empty-note">Hali natija yo‘q.</div>'}
        <button class="ghost-btn" id="mock-results-back" type="button" style="margin-top:16px;">Orqaga</button>
      </div>`;
    document.getElementById('mock-results-back').addEventListener('click', renderMockTestList);
  });
}

loadMockTests();
renderMockTestList();'''

pattern = re.compile(re.escape(start) + r'.*?' + re.escape(end), re.S)
new_text, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit(f'Expected one mock block, replaced {count}')

# Make the visible Mock Test subtitle describe the real practice format.
new_text = new_text.replace(
    "Bilimingizni sinab ko'ring va natijangizni yaxshilang.",
    "Matematika Milliy sertifikat formatida: 35 ta yopiq + 10 ta ochiq topshiriq, 150 daqiqa."
)

path.write_text(new_text, encoding='utf-8')
print('Updated index.html with 45-question / 55-element Milliy sertifikat mock format')
