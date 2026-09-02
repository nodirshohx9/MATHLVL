from pathlib import Path
import re

p = Path('admin.html')
s = p.read_text(encoding='utf-8')

MARKER = 'MATHLVL_MOCK_PDF_ADMIN_V1'
if MARKER in s:
    raise SystemExit(0)

css = r'''
<style id="mathlvl-mock-pdf-admin-style">
/* MATHLVL_MOCK_PDF_ADMIN_V1 */
.mock-import-grid{display:grid;grid-template-columns:minmax(0,1fr) 150px;gap:14px;align-items:end}
.mock-upload-box{border:1.5px dashed rgba(120,150,255,.28);border-radius:14px;padding:18px;background:rgba(5,7,18,.34)}
.mock-upload-title{font-family:var(--font-display);font-size:15px;font-weight:750;margin-bottom:5px}
.mock-upload-sub{font-size:11.5px;color:var(--text-dim);line-height:1.55;margin-bottom:13px}
.mock-review-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.mock-review-stats{display:flex;gap:8px;flex-wrap:wrap}
.mock-stat-pill{border:1px solid var(--border);border-radius:999px;padding:7px 11px;font-size:11.5px;font-family:var(--font-mono);color:var(--text-dim);background:rgba(255,255,255,.025)}
.mock-stat-pill.ok{border-color:rgba(74,222,128,.38);color:var(--green);background:var(--green-soft)}
.mock-stat-pill.warn{border-color:rgba(255,201,60,.38);color:var(--gold);background:var(--gold-soft)}
.mock-warning-box{border:1px solid rgba(255,201,60,.24);background:rgba(255,201,60,.06);border-radius:12px;padding:12px 14px;margin-bottom:14px;font-size:11.5px;color:#e7d89a;line-height:1.55}
.mock-warning-box ul{margin:7px 0 0;padding-left:18px;max-height:150px;overflow:auto}
.mock-review-layout{display:grid;grid-template-columns:210px minmax(0,1fr);gap:14px;align-items:start}
.mock-q-nav{position:sticky;top:18px;border:1px solid var(--border);border-radius:14px;background:rgba(8,12,27,.72);padding:12px}
.mock-q-nav-title{font-family:var(--font-display);font-weight:700;font-size:12px;margin:0 0 10px}
.mock-q-nav-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;max-height:520px;overflow:auto;padding-right:2px}
.mock-q-nav-btn{height:32px;border:1px solid var(--border);border-radius:8px;background:rgba(255,255,255,.025);color:var(--text-dim);font-family:var(--font-mono);font-size:10.5px;cursor:pointer}
.mock-q-nav-btn.good{border-color:rgba(74,222,128,.38);color:var(--green);background:rgba(74,222,128,.07)}
.mock-q-nav-btn.bad{border-color:rgba(255,201,60,.36);color:var(--gold);background:rgba(255,201,60,.06)}
.mock-q-nav-btn.selected{outline:2px solid var(--blue);outline-offset:1px;color:var(--text);background:var(--blue-soft)}
.mock-editor-card{border:1px solid var(--border);border-radius:14px;padding:18px;background:rgba(255,255,255,.022)}
.mock-editor-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:15px}
.mock-editor-title{font-family:var(--font-display);font-size:16px;font-weight:750}
.mock-editor-meta{font-size:10.5px;color:var(--text-dim);font-family:var(--font-mono);margin-top:4px}
.mock-editor-badge{font-size:10.5px;font-weight:800;border-radius:999px;padding:5px 9px;background:var(--blue-soft);color:var(--blue)}
.mock-option-row{display:grid;grid-template-columns:32px minmax(0,1fr);gap:8px;align-items:center;margin-bottom:8px}
.mock-option-letter{width:32px;height:32px;border-radius:9px;display:grid;place-items:center;background:rgba(61,169,252,.10);color:var(--blue);font-weight:800;font-size:12px}
.mock-part-box{border:1px solid var(--border-soft);border-radius:12px;padding:12px;margin-top:10px}
.mock-part-title{font-size:11px;font-weight:800;color:var(--gold);margin-bottom:9px}
.mock-review-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:16px;padding-top:16px;border-top:1px solid var(--border-soft)}
.mock-review-actions .spacer{flex:1}
.mock-danger{border-color:rgba(255,138,138,.35)!important;color:var(--red)!important}
.mock-admin-item .mock-status-chip{font-size:10px;font-weight:800;padding:4px 8px;border-radius:999px;white-space:nowrap}
.mock-status-chip.live{color:var(--green);background:var(--green-soft)}
.mock-status-chip.draft{color:var(--gold);background:var(--gold-soft)}
@media(max-width:760px){
  .mock-import-grid{grid-template-columns:1fr}
  .mock-review-layout{grid-template-columns:1fr}
  .mock-q-nav{position:static}
  .mock-q-nav-grid{display:flex;overflow-x:auto;max-height:none;padding-bottom:5px}
  .mock-q-nav-btn{min-width:34px;flex:none}
}
</style>
'''
if '</head>' not in s:
    raise SystemExit('admin head not found')
s = s.replace('</head>', css + '\n</head>', 1)

mock_html = r'''<!-- ============ MOCK TESTLAR ============ -->
      <section class="page" id="page-mocks">
        <div class="page-header page-header-row">
          <div>
            <h1>Mock testlar</h1>
            <p>PDF yuklang → 45 topshiriq elektron testga aylanadi → tekshiring → saytga joylang.</p>
          </div>
          <button class="glow-btn" id="show-mock-form-btn">+ Yangi mock</button>
        </div>

        <div class="card" id="mock-form-section" style="display:none;margin-bottom:16px;">
          <div class="mock-review-toolbar">
            <div>
              <h2 id="mock-form-title" style="font-family:var(--font-display);font-size:17px;margin:0 0 4px;">Yangi mock test</h2>
              <div style="font-size:11.5px;color:var(--text-dim);">35 yopiq + 10 ochiq (A/B) · 55 javob elementi · tavsiya etilgan vaqt 150 daqiqa</div>
            </div>
            <button class="ghost-btn" id="cancel-mock-form-btn" type="button">Yopish</button>
          </div>

          <div class="mock-import-grid">
            <div class="field">
              <label class="req" for="mock-title">Test nomi</label>
              <input id="mock-title" type="text" maxlength="140" placeholder="Masalan: Milliy sertifikat Mock #4">
            </div>
            <div class="field">
              <label class="req" for="mock-minutes">Vaqt</label>
              <input id="mock-minutes" type="number" min="1" max="300" value="150">
            </div>
          </div>

          <div class="mock-upload-box" id="mock-upload-box">
            <div class="mock-upload-title">PDFdan avtomatik elektron mock</div>
            <div class="mock-upload-sub">45 talik tayyor PDFni tanlang. AI savollar, variantlar, A/B qismlar, mavzu va PDFdagi javoblar kalitini ajratadi. Javob topilmasa o‘zidan to‘qimaydi — tekshirishga belgilaydi.</div>
            <div class="field" style="margin-bottom:10px;">
              <input id="mock-pdf-file" type="file" accept="application/pdf,.pdf">
              <div class="field-hint">PDF 18 MB gacha. Faqat o‘zingiz yaratgan yoki foydalanishga ruxsatli materialni yuklang.</div>
            </div>
            <div style="display:flex;gap:9px;flex-wrap:wrap;">
              <button class="glow-btn" id="mock-analyze-pdf-btn" type="button">✨ PDFni elektron mockka aylantirish</button>
              <button class="ghost-btn" id="mock-empty-official-btn" type="button">Bo‘sh 45 talik yaratish</button>
            </div>
            <div class="status" id="mock-import-status"></div>
          </div>
        </div>

        <div id="mock-review-section" class="card" style="display:none;margin-bottom:16px;">
          <div class="mock-review-toolbar">
            <div>
              <div style="font-family:var(--font-display);font-size:16px;font-weight:750;">Tekshirish va publish</div>
              <div style="font-size:11.5px;color:var(--text-dim);margin-top:3px;">Sariq raqamlar tekshirilishi kerak. Yashil raqamlar tayyor.</div>
            </div>
            <div class="mock-review-stats" id="mock-review-stats"></div>
          </div>
          <div id="mock-warning-box"></div>
          <div class="mock-review-layout">
            <div class="mock-q-nav">
              <div class="mock-q-nav-title">45 topshiriq</div>
              <div class="mock-q-nav-grid" id="mock-q-nav-grid"></div>
              <div style="display:flex;gap:6px;margin-top:10px;">
                <button class="ghost-btn" id="mock-add-closed-btn" type="button" style="font-size:10.5px;padding:7px 9px;">+ Yopiq</button>
                <button class="ghost-btn" id="mock-add-open-btn" type="button" style="font-size:10.5px;padding:7px 9px;">+ Ochiq</button>
              </div>
            </div>
            <div id="mock-question-editor"></div>
          </div>
          <div class="mock-review-actions">
            <button class="ghost-btn" id="save-mock-draft-btn" type="button">Qoralama saqlash</button>
            <button class="glow-btn" id="publish-mock-btn" type="button">Saytga joylash</button>
            <div class="spacer"></div>
            <button class="ghost-btn mock-danger" id="discard-mock-btn" type="button">Bekor qilish</button>
          </div>
          <div class="status" id="mock-status"></div>
        </div>

        <div class="card">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;">
            <div>
              <h2 style="font-family:var(--font-display);font-size:15px;margin:0 0 3px;">Joylangan mocklar</h2>
              <div style="font-size:11.5px;color:var(--text-dim);">Ishlangan mocklar shu yerda tahrirlanadi yoki o‘chiriladi.</div>
            </div>
          </div>
          <div id="mock-admin-list" class="mock-admin-list"></div>
        </div>
      </section>

      '''
html_pattern = re.compile(r'<!-- ============ MOCK TESTLAR ============ -->.*?(?=<!-- ============ PLUS SOVG\'A ============ -->)', re.S)
s, html_count = html_pattern.subn(lambda _m: mock_html, s, count=1)
if html_count != 1:
    raise SystemExit(f'mock HTML block replace failed: {html_count}')

mock_js = r'''// ================= MOCK TEST ADMIN =================
let adminMocks = [];
let editingMockId = null;
let mockDraft = null;
let mockSelectedIndex = 0;
let mockImportWarnings = [];

function normalizeAdminMock(mock){
  if(!mock) return null;
  if(Array.isArray(mock.closed) || Array.isArray(mock.open)){
    return {
      ...mock,
      closed:Array.isArray(mock.closed) ? mock.closed : [],
      open:Array.isArray(mock.open) ? mock.open : [],
      format:mock.format || 'national_certificate'
    };
  }
  return {
    ...mock,
    closed:Array.isArray(mock.questions) ? mock.questions.map(q=>({...q,topic:q.topic||'Mavzu aniqlanmagan'})) : [],
    open:[],
    format:'standard'
  };
}

async function loadAdminMocks(){
  const res = await fetch('/api/mocks', { cache:'no-store' });
  const data = await res.json();
  if(!res.ok) throw new Error(data.error || "Mock testlarni yuklab bo'lmadi");
  return (Array.isArray(data.mocks) ? data.mocks : []).map(normalizeAdminMock);
}

function mockElementCount(mock){
  return (mock.closed || []).length + (mock.open || []).reduce((n,q)=> n + (q.parts || []).length, 0);
}

function renderAdminMocks(){
  const wrap = document.getElementById('mock-admin-list');
  if(!wrap) return;
  if(!adminMocks.length){
    wrap.innerHTML = '<div class="empty-state"><div class="e-icon">📝</div><div class="e-text">Hozircha mock test yo‘q. Yuqoridagi “Yangi mock” orqali PDF yuklang.</div></div>';
    return;
  }
  wrap.innerHTML = adminMocks.map(function(mock){
    const live = mock.published !== false;
    const qCount = (mock.closed||[]).length + (mock.open||[]).length;
    return '<div class="mock-admin-item">' +
      '<div class="mock-admin-info">' +
        '<div class="mock-admin-title">' + escapeHtml(mock.title) + '</div>' +
        '<div class="mock-admin-meta">' + qCount + ' topshiriq • ' + mockElementCount(mock) + ' javob elementi • ' + Number(mock.minutes||150) + ' daqiqa</div>' +
      '</div>' +
      '<span class="mock-status-chip ' + (live?'live':'draft') + '">' + (live?'ISHLAYAPTI':'QORALAMA') + '</span>' +
      '<button class="icon-action" type="button" data-mock-edit="' + escapeHtml(mock.id) + '" title="Tahrirlash">✎</button>' +
      '<button class="icon-action danger" type="button" data-mock-delete="' + escapeHtml(mock.id) + '" title="O‘chirish">×</button>' +
    '</div>';
  }).join('');
  wrap.querySelectorAll('[data-mock-edit]').forEach(btn=> btn.addEventListener('click', ()=>{
    const mock = adminMocks.find(m=>m.id===btn.dataset.mockEdit);
    if(mock) openMockEditor(mock);
  }));
  wrap.querySelectorAll('[data-mock-delete]').forEach(btn=> btn.addEventListener('click', ()=> deleteMock(btn.dataset.mockDelete, btn)));
}

async function refreshMockList(){
  const wrap = document.getElementById('mock-admin-list');
  try{
    adminMocks = await loadAdminMocks();
    renderAdminMocks();
    const stat = document.getElementById('stat-total-mocks');
    if(stat) stat.textContent = adminMocks.length;
  }catch(error){
    if(wrap) wrap.innerHTML = '<div class="empty-state"><div class="e-icon">⚠</div><div class="e-text">' + escapeHtml(error.message) + '</div></div>';
    const stat = document.getElementById('stat-total-mocks');
    if(stat) stat.textContent = '—';
  }
}

function blankClosed(){ return {q:'',o:['','','',''],a:null,topic:'',sourcePage:null,confidence:0,needsReview:true}; }
function blankOpen(){ return {q:'',topic:'',sourcePage:null,confidence:0,needsReview:true,parts:[{label:'A',ask:'',ans:'',confidence:0,needsReview:true},{label:'B',ask:'',ans:'',confidence:0,needsReview:true}]}; }

function newOfficialDraft(){
  return {title:'',minutes:150,format:'national_certificate',closed:Array.from({length:35},blankClosed),open:Array.from({length:10},blankOpen),sourcePdfUrl:''};
}

function openNewMockForm(){
  editingMockId = null;
  mockDraft = null;
  mockImportWarnings = [];
  mockSelectedIndex = 0;
  document.getElementById('mock-form-title').textContent = 'Yangi mock test';
  document.getElementById('mock-title').value = '';
  document.getElementById('mock-minutes').value = '150';
  document.getElementById('mock-pdf-file').value = '';
  document.getElementById('mock-import-status').textContent = '';
  document.getElementById('mock-status').textContent = '';
  document.getElementById('mock-form-section').style.display = 'block';
  document.getElementById('mock-review-section').style.display = 'none';
  document.getElementById('mock-form-section').scrollIntoView({behavior:'smooth',block:'start'});
}

function closeMockForm(){
  editingMockId = null;
  mockDraft = null;
  mockImportWarnings = [];
  document.getElementById('mock-form-section').style.display = 'none';
  document.getElementById('mock-review-section').style.display = 'none';
  document.getElementById('mock-import-status').textContent = '';
  document.getElementById('mock-status').textContent = '';
}

function openMockEditor(mock){
  const n = normalizeAdminMock(mock);
  editingMockId = n.id || null;
  mockDraft = JSON.parse(JSON.stringify(n));
  mockImportWarnings = [];
  mockSelectedIndex = 0;
  document.getElementById('mock-form-title').textContent = editingMockId ? 'Mock testni tahrirlash' : 'Yangi mock test';
  document.getElementById('mock-title').value = n.title || '';
  document.getElementById('mock-minutes').value = Number(n.minutes || 150);
  document.getElementById('mock-pdf-file').value = '';
  document.getElementById('mock-form-section').style.display = 'block';
  document.getElementById('mock-review-section').style.display = 'block';
  renderMockReview();
  document.getElementById('mock-review-section').scrollIntoView({behavior:'smooth',block:'start'});
}

function closedReady(q){
  return !!(q && String(q.q||'').trim() && Array.isArray(q.o) && q.o.length===4 && q.o.every(x=>String(x||'').trim()) && Number.isInteger(Number(q.a)) && Number(q.a)>=0 && Number(q.a)<=3);
}
function openReady(q){
  return !!(q && String(q.q||'').trim() && Array.isArray(q.parts) && q.parts.length===2 && q.parts.every(p=>String(p.ask||'').trim() && String(p.ans||'').trim()));
}
function publishReady(){
  return !!(mockDraft && mockDraft.closed.length===35 && mockDraft.open.length===10 && mockDraft.closed.every(closedReady) && mockDraft.open.every(openReady));
}

function renderMockStats(){
  const wrap = document.getElementById('mock-review-stats');
  if(!wrap || !mockDraft) return;
  const closedGood = mockDraft.closed.filter(closedReady).length;
  const openGood = mockDraft.open.filter(openReady).length;
  const totalElements = mockDraft.closed.length + mockDraft.open.reduce((n,q)=>n+(q.parts||[]).length,0);
  wrap.innerHTML =
    '<span class="mock-stat-pill ' + (mockDraft.closed.length===35?'ok':'warn') + '">Yopiq ' + mockDraft.closed.length + '/35</span>' +
    '<span class="mock-stat-pill ' + (mockDraft.open.length===10?'ok':'warn') + '">Ochiq ' + mockDraft.open.length + '/10</span>' +
    '<span class="mock-stat-pill ' + (totalElements===55?'ok':'warn') + '">Element ' + totalElements + '/55</span>' +
    '<span class="mock-stat-pill ' + (publishReady()?'ok':'warn') + '">Tayyor ' + (closedGood+openGood) + '/' + (mockDraft.closed.length+mockDraft.open.length) + '</span>';
  document.getElementById('publish-mock-btn').disabled = !publishReady();
}

function renderMockWarnings(){
  const wrap = document.getElementById('mock-warning-box');
  if(!wrap) return;
  const warnings = [...mockImportWarnings];
  if(mockDraft){
    if(mockDraft.closed.length!==35 || mockDraft.open.length!==10) warnings.unshift('Publish uchun aynan 35 ta yopiq + 10 ta ochiq savol kerak.');
    mockDraft.closed.forEach((q,i)=>{ if(!closedReady(q)) warnings.push((i+1) + '-savolni tekshiring: matn, 4 variant yoki to‘g‘ri javob yetishmayapti.'); });
    mockDraft.open.forEach((q,i)=>{ if(!openReady(q)) warnings.push((i+36) + '-savolni tekshiring: A/B qism yoki javob yetishmayapti.'); });
  }
  const unique = [...new Set(warnings)].slice(0,60);
  wrap.innerHTML = unique.length ? '<div class="mock-warning-box"><b>Tekshirish kerak (' + unique.length + ')</b><ul>' + unique.map(w=>'<li>'+escapeHtml(w)+'</li>').join('') + '</ul></div>' : '';
}

function allMockItems(){
  if(!mockDraft) return [];
  return [
    ...mockDraft.closed.map((q,i)=>({kind:'closed',index:i,number:i+1,data:q})),
    ...mockDraft.open.map((q,i)=>({kind:'open',index:i,number:mockDraft.closed.length+i+1,data:q}))
  ];
}

function renderMockNavigator(){
  const nav = document.getElementById('mock-q-nav-grid');
  if(!nav || !mockDraft) return;
  const items = allMockItems();
  if(mockSelectedIndex >= items.length) mockSelectedIndex = Math.max(0,items.length-1);
  nav.innerHTML = items.map((item,pos)=>{
    const ready = item.kind==='closed' ? closedReady(item.data) : openReady(item.data);
    return '<button class="mock-q-nav-btn ' + (ready?'good':'bad') + (pos===mockSelectedIndex?' selected':'') + '" type="button" data-mock-nav="'+pos+'">'+item.number+'</button>';
  }).join('');
  nav.querySelectorAll('[data-mock-nav]').forEach(btn=>btn.addEventListener('click',()=>{mockSelectedIndex=Number(btn.dataset.mockNav);renderMockReview();}));
}

function setDeep(obj,path,value){
  const parts = path.split('.');
  let cur = obj;
  for(let i=0;i<parts.length-1;i++) cur = cur[parts[i]];
  cur[parts[parts.length-1]] = value;
}

function renderMockEditor(){
  const host = document.getElementById('mock-question-editor');
  if(!host || !mockDraft) return;
  const items = allMockItems();
  if(!items.length){ host.innerHTML='<div class="empty-state">Savol yo‘q.</div>'; return; }
  const item = items[mockSelectedIndex] || items[0];
  const q = item.data;
  if(item.kind==='closed'){
    host.innerHTML = '<div class="mock-editor-card">' +
      '<div class="mock-editor-head"><div><div class="mock-editor-title">'+item.number+'-savol</div><div class="mock-editor-meta">Yopiq savol'+(q.sourcePage?' • PDF '+q.sourcePage+'-sahifa':'')+'</div></div><span class="mock-editor-badge">A/B/C/D</span></div>' +
      '<div class="field"><label>Savol matni</label><textarea data-mock-field="q" style="min-height:105px;">'+escapeHtml(q.q||'')+'</textarea></div>' +
      ['A','B','C','D'].map((letter,i)=>'<div class="mock-option-row"><div class="mock-option-letter">'+letter+'</div><input type="text" data-mock-option="'+i+'" value="'+escapeHtml((q.o||[])[i]||'')+'"></div>').join('') +
      '<div class="row" style="margin-top:12px;"><div class="field"><label>To‘g‘ri javob</label><select data-mock-field="a"><option value="">Tanlang</option>'+['A','B','C','D'].map((l,i)=>'<option value="'+i+'" '+(Number(q.a)===i?'selected':'')+'>'+l+'</option>').join('')+'</select></div>' +
      '<div class="field"><label>Mavzu</label><input type="text" data-mock-field="topic" value="'+escapeHtml(q.topic||'')+'" placeholder="Masalan: Kvadrat tenglama"></div></div>' +
      '</div>';
    host.querySelector('[data-mock-field="q"]').addEventListener('input',e=>{q.q=e.target.value;renderMockStats();});
    host.querySelectorAll('[data-mock-option]').forEach(inp=>inp.addEventListener('input',e=>{q.o[Number(e.target.dataset.mockOption)]=e.target.value;renderMockStats();}));
    host.querySelector('[data-mock-field="a"]').addEventListener('change',e=>{q.a=e.target.value===''?null:Number(e.target.value);q.needsReview=false;renderMockReview();});
    host.querySelector('[data-mock-field="topic"]').addEventListener('input',e=>{q.topic=e.target.value;});
  }else{
    host.innerHTML = '<div class="mock-editor-card">' +
      '<div class="mock-editor-head"><div><div class="mock-editor-title">'+item.number+'-savol</div><div class="mock-editor-meta">Ochiq savol'+(q.sourcePage?' • PDF '+q.sourcePage+'-sahifa':'')+'</div></div><span class="mock-editor-badge">A + B</span></div>' +
      '<div class="field"><label>Umumiy savol matni</label><textarea data-open-field="q" style="min-height:100px;">'+escapeHtml(q.q||'')+'</textarea></div>' +
      '<div class="field"><label>Mavzu</label><input type="text" data-open-field="topic" value="'+escapeHtml(q.topic||'')+'" placeholder="Masalan: Trigonometriya"></div>' +
      (q.parts||[]).map((part,i)=>'<div class="mock-part-box"><div class="mock-part-title">'+(i===0?'A':'B')+' qism</div><div class="field"><label>Topshiriq</label><textarea data-part-ask="'+i+'" style="min-height:72px;">'+escapeHtml(part.ask||'')+'</textarea></div><div class="field" style="margin-bottom:0;"><label>To‘g‘ri javob</label><input type="text" data-part-ans="'+i+'" value="'+escapeHtml(part.ans||'')+'" placeholder="Masalan: 3/4"></div></div>').join('') +
      '</div>';
    host.querySelector('[data-open-field="q"]').addEventListener('input',e=>{q.q=e.target.value;renderMockStats();});
    host.querySelector('[data-open-field="topic"]').addEventListener('input',e=>{q.topic=e.target.value;});
    host.querySelectorAll('[data-part-ask]').forEach(inp=>inp.addEventListener('input',e=>{q.parts[Number(e.target.dataset.partAsk)].ask=e.target.value;renderMockStats();}));
    host.querySelectorAll('[data-part-ans]').forEach(inp=>inp.addEventListener('input',e=>{const p=q.parts[Number(e.target.dataset.partAns)];p.ans=e.target.value;if(e.target.value.trim())p.needsReview=false;renderMockStats();}));
  }
}

function renderMockReview(){
  if(!mockDraft) return;
  renderMockStats();
  renderMockWarnings();
  renderMockNavigator();
  renderMockEditor();
}

async function analyzeMockPdf(){
  const file = document.getElementById('mock-pdf-file').files[0];
  const title = document.getElementById('mock-title').value.trim();
  const btn = document.getElementById('mock-analyze-pdf-btn');
  const status = document.getElementById('mock-import-status');
  status.classList.remove('err','ok');
  try{
    if(!file) throw new Error('PDF faylni tanlang');
    if(file.type && file.type!=='application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) throw new Error('Faqat PDF yuklang');
    if(file.size > 18*1024*1024) throw new Error('PDF 18 MB dan katta bo‘lmasin');
    btn.disabled = true;
    status.textContent = '1/2 PDF yuklanmoqda...';
    const blobResult = await window.__blobUpload(file.name, file, {access:'public',handleUploadUrl:'/api/upload'});
    status.textContent = '2/2 AI 45 ta topshiriqni ajratmoqda... Bu biroz vaqt olishi mumkin.';
    const res = await fetch('/api/mocks',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'import-pdf',pdfUrl:blobResult.url,title})
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || 'PDF tahlili amalga oshmadi');
    mockDraft = normalizeAdminMock(data.draft);
    mockDraft.sourcePdfUrl = blobResult.url;
    mockImportWarnings = Array.isArray(data.draft.warnings) ? data.draft.warnings : [];
    if(!document.getElementById('mock-title').value.trim()) document.getElementById('mock-title').value = mockDraft.title || file.name.replace(/\.pdf$/i,'');
    document.getElementById('mock-minutes').value = Number(mockDraft.minutes || 150);
    mockSelectedIndex = 0;
    document.getElementById('mock-review-section').style.display = 'block';
    status.textContent = 'PDF ajratildi. Sariq savollarni tekshirib chiqing.';
    status.classList.add('ok');
    renderMockReview();
    document.getElementById('mock-review-section').scrollIntoView({behavior:'smooth',block:'start'});
  }catch(error){
    status.textContent = 'Xatolik: ' + error.message;
    status.classList.add('err');
  }finally{ btn.disabled = false; }
}

function buildEmptyOfficialMock(){
  mockDraft = newOfficialDraft();
  mockImportWarnings = ['Bo‘sh 45 talik yaratildi. Barcha savol va javoblarni to‘ldiring.'];
  mockSelectedIndex = 0;
  if(!document.getElementById('mock-title').value.trim()) document.getElementById('mock-title').value = 'Milliy sertifikat Mock';
  document.getElementById('mock-minutes').value = '150';
  document.getElementById('mock-review-section').style.display = 'block';
  renderMockReview();
}

function addClosedMockQuestion(){
  if(!mockDraft) buildEmptyOfficialMock();
  if(mockDraft.closed.length>=35){ alert('Yopiq savollar 35 ta bo‘ldi.'); return; }
  mockDraft.closed.push(blankClosed());
  mockSelectedIndex = mockDraft.closed.length-1;
  renderMockReview();
}
function addOpenMockQuestion(){
  if(!mockDraft) buildEmptyOfficialMock();
  if(mockDraft.open.length>=10){ alert('Ochiq savollar 10 ta bo‘ldi.'); return; }
  mockDraft.open.push(blankOpen());
  mockSelectedIndex = mockDraft.closed.length + mockDraft.open.length-1;
  renderMockReview();
}

async function saveMockFromReview(published){
  const status = document.getElementById('mock-status');
  const pubBtn = document.getElementById('publish-mock-btn');
  const draftBtn = document.getElementById('save-mock-draft-btn');
  status.classList.remove('err','ok');
  try{
    if(!mockDraft) throw new Error('Avval PDFni tahlil qiling yoki bo‘sh 45 talik yarating');
    const title = document.getElementById('mock-title').value.trim();
    const minutes = Number(document.getElementById('mock-minutes').value);
    if(title.length<3) throw new Error('Mock test nomini kiriting');
    if(!minutes || minutes<1 || minutes>300) throw new Error('Vaqt 1–300 daqiqa oralig‘ida bo‘lsin');
    if(published && !publishReady()) throw new Error('Publishdan oldin 35 yopiq + 10 ochiq savol va barcha javoblarni to‘ldiring');
    pubBtn.disabled = true; draftBtn.disabled = true;
    status.textContent = published ? 'Saytga joylanmoqda...' : 'Qoralama saqlanmoqda...';
    const payload = {
      title,minutes,published,format:'national_certificate',
      closed:mockDraft.closed,open:mockDraft.open,sourcePdfUrl:mockDraft.sourcePdfUrl || ''
    };
    if(editingMockId) payload.id = editingMockId;
    const res = await fetch('/api/mocks',{
      method:editingMockId?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || 'Saqlash amalga oshmadi');
    editingMockId = data.mock.id;
    mockDraft = normalizeAdminMock(data.mock);
    status.textContent = published ? 'Mock saytga joylandi.' : 'Qoralama saqlandi.';
    status.classList.add('ok');
    await refreshMockList();
    renderMockReview();
  }catch(error){
    status.textContent = 'Xatolik: ' + error.message;
    status.classList.add('err');
  }finally{
    draftBtn.disabled = false;
    pubBtn.disabled = !publishReady();
  }
}

async function deleteMock(id, button){
  const selected = adminMocks.find(m=>m.id===id);
  if(!selected || !confirm('“'+selected.title+'” mock testi o‘chirilsinmi?')) return;
  button.disabled = true;
  try{
    const res = await fetch('/api/mocks',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || 'O‘chirish amalga oshmadi');
    if(editingMockId===id) closeMockForm();
    await refreshMockList();
  }catch(error){ alert('Xatolik: '+error.message); button.disabled=false; }
}

document.getElementById('show-mock-form-btn').addEventListener('click', openNewMockForm);
document.getElementById('cancel-mock-form-btn').addEventListener('click', closeMockForm);
document.getElementById('discard-mock-btn').addEventListener('click', closeMockForm);
document.getElementById('mock-analyze-pdf-btn').addEventListener('click', analyzeMockPdf);
document.getElementById('mock-empty-official-btn').addEventListener('click', buildEmptyOfficialMock);
document.getElementById('mock-add-closed-btn').addEventListener('click', addClosedMockQuestion);
document.getElementById('mock-add-open-btn').addEventListener('click', addOpenMockQuestion);
document.getElementById('save-mock-draft-btn').addEventListener('click', ()=>saveMockFromReview(false));
document.getElementById('publish-mock-btn').addEventListener('click', ()=>saveMockFromReview(true));

'''
js_pattern = re.compile(r'// ================= MOCK TEST ADMIN =================.*?(?=// ================= GIFT / PLUS =================)', re.S)
s, js_count = js_pattern.subn(lambda _m: mock_js, s, count=1)
if js_count != 1:
    raise SystemExit(f'mock JS block replace failed: {js_count}')

required = [MARKER, 'mock-analyze-pdf-btn', 'PDFni elektron mockka aylantirish', 'publishReady()', "action:'import-pdf'", '35 yopiq + 10 ochiq']
for token in required:
    if token not in s:
        raise SystemExit(f'mock PDF admin token missing: {token}')

p.write_text(s, encoding='utf-8')
print('Admin mock workflow upgraded: PDF -> 45 questions -> review -> publish.')
