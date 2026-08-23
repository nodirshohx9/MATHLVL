from pathlib import Path
import re

p = Path('index.html')
s = p.read_text(encoding='utf-8')

# 1) Faqat Milliy sertifikat filtri qolsin.
filter_pattern = r'<div class="mocktest-filter-row" id="mocktest-filter-row">.*?</div>'
filter_html = '''<div class="mocktest-filter-row" id="mocktest-filter-row">
      <button class="mt-filter-btn active" data-mt-subject="Milliy sertifikat">Milliy sertifikat</button>
    </div>'''
s, n = re.subn(filter_pattern, filter_html, s, count=1, flags=re.S)
if n != 1:
    raise SystemExit('Mock Test filter bloki topilmadi')

# 2) Eski Mock Test JS blokini BUTUNLAY almashtiramiz.
start_marker = "// ================= MOCK TEST (namunaviy ma'lumotlar, backend hali yo'q) ================="
start = s.find(start_marker)
if start < 0:
    # Patch qayta ishga tushsa, yangi marker bo'yicha yangilaymiz.
    start_marker = "// ================= MILLIY SERTIFIKAT MOCK TEST ================="
    start = s.find(start_marker)
if start < 0:
    raise SystemExit('Mock Test JS boshlanishi topilmadi')

script_end = s.find('</script>', start)
if script_end < 0:
    raise SystemExit('Mock Test script oxiri topilmadi')

new_js = r'''// ================= MILLIY SERTIFIKAT MOCK TEST =================
const mockTestData = [
  {
    id:'ms1', title:'Matematika — Milliy sertifikat Mock #1', minutes:90,
    questions:[
      {q:'Agar $3x-7=20$ bo‘lsa, $x$ ni toping.',o:['7','8','9','10'],a:2},
      {q:'$x^2-9x+20=0$ tenglama ildizlari yig‘indisi?',o:['5','9','20','-9'],a:1},
      {q:'$2^x=32$ tenglamaning yechimi?',o:['4','5','6','8'],a:1},
      {q:'Arifmetik progressiyada $a_1=4$, $d=3$. $a_{12}$?',o:['34','36','37','40'],a:2},
      {q:'$\\log_2 64$ ning qiymati?',o:['4','5','6','8'],a:2},
      {q:'Tomonlari 9 va 12 bo‘lgan to‘g‘ri to‘rtburchak diagonali?',o:['13','14','15','16'],a:2},
      {q:'Radiusi 5 bo‘lgan doiraning yuzi?',o:['$10\\pi$','$20\\pi$','$25\\pi$','$50\\pi$'],a:2},
      {q:'$|2x-3|=7$ tenglama yechimlari yig‘indisi?',o:['1','3','5','7'],a:1},
      {q:'$2x+y=11$, $x-y=1$ sistemada $x$?',o:['3','4','5','6'],a:1},
      {q:'$\\sqrt{72}$ ni soddalashtiring.',o:['$3\\sqrt8$','$6\\sqrt2$','$8\\sqrt2$','$12\\sqrt2$'],a:1}
    ]
  },
  {
    id:'ms2', title:'Matematika — Milliy sertifikat Mock #2', minutes:90,
    questions:[
      {q:'$5x+4=29$ tenglamaning yechimi?',o:['4','5','6','7'],a:1},
      {q:'$x^2-5x+6=0$ ildizlari ko‘paytmasi?',o:['5','6','-5','-6'],a:1},
      {q:'$3^{x+1}=81$ bo‘lsa, $x$?',o:['2','3','4','5'],a:1},
      {q:'Geometrik progressiyada $b_1=2$, $q=3$. $b_5$?',o:['54','108','162','243'],a:2},
      {q:'$\\log_3 81$ ning qiymati?',o:['3','4','5','6'],a:1},
      {q:'Katetlari 5 va 12 bo‘lgan to‘g‘ri burchakli uchburchak gipotenuzasi?',o:['11','12','13','14'],a:2},
      {q:'Tomoni 8 bo‘lgan kvadratning diagonali?',o:['$4\\sqrt2$','$8\\sqrt2$','$16$','$16\\sqrt2$'],a:1},
      {q:'$|3x+1|=10$ yechimlari yig‘indisi?',o:['$-2/3$','$2/3$','2','-2'],a:0},
      {q:'$x+y=9$, $x-y=3$ sistemada $y$?',o:['2','3','4','6'],a:1},
      {q:'$\\sqrt{98}$ ni soddalashtiring.',o:['$7\\sqrt2$','$14\\sqrt2$','$49\\sqrt2$','$2\\sqrt7$'],a:0}
    ]
  },
  {
    id:'ms3', title:'Matematika — Milliy sertifikat Mock #3', minutes:90,
    questions:[
      {q:'$7x-5=30$ bo‘lsa, $x$?',o:['4','5','6','7'],a:1},
      {q:'$x^2-11x+24=0$ ildizlari yig‘indisi?',o:['8','11','24','-11'],a:1},
      {q:'$4^x=64$ bo‘lsa, $x$?',o:['2','3','4','6'],a:1},
      {q:'Arifmetik progressiyada $a_1=10$, $d=-2$. $a_8$?',o:['-4','-2','0','2'],a:0},
      {q:'$\\log_5 125$ ning qiymati?',o:['2','3','4','5'],a:1},
      {q:'Tomonlari 7, 24, 25 bo‘lgan uchburchak qanday?',o:['O‘tkir','To‘g‘ri burchakli','O‘tmas','Teng yonli'],a:1},
      {q:'Radiusi 4 bo‘lgan aylana uzunligi?',o:['$4\\pi$','$8\\pi$','$16\\pi$','$32\\pi$'],a:1},
      {q:'$|x-4|=6$ yechimlari yig‘indisi?',o:['4','6','8','10'],a:2},
      {q:'$3x+2y=16$, $x-y=2$ sistemada $x$?',o:['2','3','4','5'],a:2},
      {q:'$\\sqrt{200}$ ni soddalashtiring.',o:['$5\\sqrt2$','$10\\sqrt2$','$20\\sqrt2$','$100\\sqrt2$'],a:1}
    ]
  }
];

let activeMock = null;
let mockIndex = 0;
let mockAnswers = [];
let mockSecondsLeft = 0;
let mockTimerId = null;

function renderMockMath(el){
  if(!el || typeof renderMathInElement !== 'function') return;
  try{ renderMathInElement(el,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}]}); }catch(e){}
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
        <div class="mt-card-meta">${t.questions.length} ta savol • ${t.minutes} daqiqa</div>
        <div class="mt-card-result">Milliy sertifikat uslubidagi MATHLVL mock</div>
      </div>
      <button class="glow-btn mt-card-start" type="button" data-mt-start="${t.id}">Boshlash</button>
    </div>`).join('');
  list.querySelectorAll('[data-mt-start]').forEach(btn => btn.addEventListener('click', () => startMockTest(btn.dataset.mtStart)));
}

function startMockTest(id){
  activeMock = mockTestData.find(t => t.id === id);
  if(!activeMock) return;
  mockIndex = 0;
  mockAnswers = Array(activeMock.questions.length).fill(null);
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
  const m = Math.floor(mockSecondsLeft / 60);
  const sec = mockSecondsLeft % 60;
  el.textContent = `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

function renderMockQuestion(){
  if(!activeMock) return;
  const list = document.getElementById('mocktest-list');
  const q = activeMock.questions[mockIndex];
  list.innerHTML = `
    <div class="glass-card" style="padding:20px;">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
        <div><b>${activeMock.title}</b><div style="font-size:12px;color:var(--text-dim);margin-top:4px;">Savol ${mockIndex+1}/${activeMock.questions.length}</div></div>
        <div id="mock-clock" style="color:var(--gold);font-family:var(--font-mono);font-weight:800;"></div>
      </div>
      <div id="mock-question-text" style="font-size:17px;line-height:1.6;font-weight:600;margin:20px 0;"></div>
      <div id="mock-options" style="display:grid;gap:10px;"></div>
      <div id="mock-nav-grid" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:18px;"></div>
      <div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap;">
        <button class="ghost-btn" id="mock-prev" type="button" ${mockIndex===0?'disabled':''}>← Oldingi</button>
        <button class="glow-btn" id="mock-next" type="button">${mockIndex===activeMock.questions.length-1?'Yakunlash':'Keyingi →'}</button>
        <button class="ghost-btn" id="mock-exit" type="button" style="margin-left:auto;">Testdan chiqish</button>
      </div>
    </div>`;

  const questionEl = document.getElementById('mock-question-text');
  questionEl.textContent = q.q;
  renderMockMath(questionEl);

  const letters = ['A','B','C','D'];
  const optionsEl = document.getElementById('mock-options');
  q.o.forEach((text, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ghost-btn';
    btn.style.width = '100%';
    btn.style.textAlign = 'left';
    if(mockAnswers[mockIndex] === i){
      btn.style.borderColor = 'var(--blue)';
      btn.style.background = 'var(--blue-soft)';
    }
    const span = document.createElement('span');
    span.textContent = `${letters[i]}) ${text}`;
    btn.appendChild(span);
    renderMockMath(span);
    btn.addEventListener('click', () => { mockAnswers[mockIndex] = i; renderMockQuestion(); });
    optionsEl.appendChild(btn);
  });

  const nav = document.getElementById('mock-nav-grid');
  activeMock.questions.forEach((_, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ghost-btn';
    btn.textContent = i + 1;
    btn.style.padding = '7px 10px';
    if(i === mockIndex) btn.style.borderColor = 'var(--gold)';
    else if(mockAnswers[i] !== null) btn.style.borderColor = 'var(--blue)';
    btn.addEventListener('click', () => { mockIndex = i; renderMockQuestion(); });
    nav.appendChild(btn);
  });

  document.getElementById('mock-prev').addEventListener('click', () => {
    if(mockIndex > 0){ mockIndex--; renderMockQuestion(); }
  });
  document.getElementById('mock-next').addEventListener('click', () => {
    if(mockIndex < activeMock.questions.length - 1){ mockIndex++; renderMockQuestion(); }
    else finishMockTest(false);
  });
  document.getElementById('mock-exit').addEventListener('click', () => {
    if(confirm('Testdan chiqilsinmi?')) renderMockTestList();
  });
  updateMockClock();
}

function finishMockTest(autoFinish){
  if(!activeMock) return;
  if(mockTimerId) clearInterval(mockTimerId);
  mockTimerId = null;
  let correct = 0;
  activeMock.questions.forEach((q,i) => { if(mockAnswers[i] === q.a) correct++; });
  const total = activeMock.questions.length;
  const answered = mockAnswers.filter(v => v !== null).length;
  const percent = Math.round(correct / total * 100);
  const result = {title:activeMock.title,correct,total,answered,percent,at:new Date().toISOString()};
  try{
    const history = JSON.parse(localStorage.getItem('mathlvl_mock_results') || '[]');
    history.unshift(result);
    localStorage.setItem('mathlvl_mock_results', JSON.stringify(history.slice(0,20)));
  }catch(e){}
  const list = document.getElementById('mocktest-list');
  list.innerHTML = `
    <div class="glass-card" style="text-align:center;padding:28px;">
      <div style="font-size:42px;">${percent>=70?'🏆':percent>=50?'📈':'📚'}</div>
      <h3>Natija: ${correct}/${total}</h3>
      <div style="font-size:30px;font-weight:800;color:var(--blue);">${percent}%</div>
      <div style="color:var(--text-dim);margin:8px 0 20px;">Javob berilgan: ${answered}/${total}${autoFinish?' • Vaqt tugadi':''}</div>
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
        ${history.length ? history.map(r => `<div style="padding:10px 0;border-bottom:1px solid var(--border-soft);"><b>${r.title}</b><div style="font-size:12px;color:var(--text-dim);">${r.correct}/${r.total} • ${r.percent}%</div></div>`).join('') : '<div class="empty-note">Hali natija yo‘q.</div>'}
        <button class="ghost-btn" id="mock-results-back" type="button" style="margin-top:16px;">Orqaga</button>
      </div>`;
    document.getElementById('mock-results-back').addEventListener('click', renderMockTestList);
  });
}

renderMockTestList();
'''

# Butun eski mock JS qismini yopuvchi </script>gacha almashtiramiz. Shu sabab eski handlerlar qolmaydi.
s = s[:start] + new_js + '\n' + s[script_end:]
p.write_text(s, encoding='utf-8')
