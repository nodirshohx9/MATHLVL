from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

MARKER = 'MATHLVL_MOCK_MODERN_UI_V1'
if MARKER in s:
    print('Modern mock UI already applied.')
    raise SystemExit(0)

payload = r'''

<style id="mathlvl-mock-modern-ui">
/* MATHLVL_MOCK_MODERN_UI_V1 */
#panel-mocktest{max-width:1180px}
#panel-mocktest .mocktest-header-row{display:none!important}
#panel-mocktest .mocktest-filter-row{margin:16px 0 18px}
#panel-mocktest .mt-filter-btn{background:rgba(255,255,255,.035);border-color:rgba(130,151,255,.15);color:#aab5d2;padding:8px 13px;font-size:11.5px}
#panel-mocktest .mt-filter-btn.active{background:rgba(87,111,255,.14);border-color:rgba(105,128,255,.34);color:#dfe6ff;box-shadow:inset 0 0 0 1px rgba(119,137,255,.07)}

.mock-modern-hero{position:relative;overflow:hidden;display:grid;grid-template-columns:minmax(0,1.2fr) minmax(300px,.8fr);gap:24px;align-items:stretch;padding:28px;border:1px solid rgba(108,132,255,.18);border-radius:22px;background:linear-gradient(135deg,rgba(13,24,52,.98),rgba(8,15,34,.96));box-shadow:0 28px 80px rgba(0,0,0,.22);isolation:isolate}
.mock-modern-hero:before{content:"";position:absolute;inset:-40% auto auto 46%;width:480px;height:480px;border-radius:50%;background:radial-gradient(circle,rgba(77,114,255,.20),rgba(86,75,222,.06) 42%,transparent 70%);z-index:-1;pointer-events:none}
.mock-modern-hero:after{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.022) 1px,transparent 1px);background-size:34px 34px;mask-image:linear-gradient(90deg,rgba(0,0,0,.7),transparent 78%);z-index:-1;pointer-events:none}
.mock-modern-eyebrow{display:inline-flex;align-items:center;gap:7px;color:#91a5ff;font-size:10.5px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;margin-bottom:11px}
.mock-modern-eyebrow:before{content:"";width:7px;height:7px;border-radius:50%;background:#7d91ff;box-shadow:0 0 18px rgba(125,145,255,.8)}
.mock-modern-title{font-family:var(--font-display);font-size:clamp(26px,3.4vw,40px);line-height:1.06;letter-spacing:-.045em;margin:0 0 12px;color:#f7f9ff}
.mock-modern-sub{max-width:650px;color:#9ba8c8;font-size:13.5px;line-height:1.65;margin:0 0 18px}
.mock-modern-pills{display:flex;flex-wrap:wrap;gap:8px}
.mock-modern-pill{display:inline-flex;align-items:center;gap:6px;padding:7px 10px;border-radius:999px;border:1px solid rgba(123,145,255,.12);background:rgba(255,255,255,.035);color:#aeb9d6;font-size:11px;font-weight:700}
.mock-modern-pill b{color:#edf2ff;font-weight:800}
.mock-modern-actions{margin-top:18px;display:flex;gap:10px;flex-wrap:wrap}
#panel-mocktest #mocktest-results-btn{width:auto!important;margin:0!important;border-radius:11px!important;padding:10px 15px!important;background:rgba(255,255,255,.045)!important;border:1px solid rgba(128,150,255,.17)!important;color:#d8e0f7!important;box-shadow:none!important}
#panel-mocktest #mocktest-results-btn:hover{background:rgba(87,111,255,.10)!important;border-color:rgba(122,143,255,.35)!important}

.mock-modern-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;align-content:center}
.mock-modern-stat{min-height:94px;padding:15px 16px;border:1px solid rgba(118,140,255,.12);border-radius:16px;background:linear-gradient(145deg,rgba(255,255,255,.048),rgba(255,255,255,.018));backdrop-filter:blur(12px)}
.mock-modern-stat.primary{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:16px;background:linear-gradient(135deg,rgba(78,105,255,.14),rgba(95,71,205,.07));border-color:rgba(105,128,255,.20)}
.mock-modern-stat-label{display:block;color:#8d99b7;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:7px}
.mock-modern-stat-value{font-family:var(--font-display);font-size:24px;font-weight:800;letter-spacing:-.04em;color:#f7f9ff}
.mock-modern-stat-sub{font-size:10.5px;color:#7f8aa7;margin-top:4px}
.mock-modern-ring{--pct:0;width:58px;height:58px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(#7085ff calc(var(--pct)*1%),rgba(255,255,255,.08) 0);position:relative;flex:none}
.mock-modern-ring:after{content:"";position:absolute;inset:6px;border-radius:50%;background:#101932}
.mock-modern-ring span{position:relative;z-index:2;color:#f4f7ff;font-family:var(--font-mono);font-size:11px;font-weight:800}

#panel-mocktest .mocktest-list{gap:12px}
#panel-mocktest .mt-card{position:relative;overflow:hidden;align-items:stretch;gap:16px;padding:18px;border-radius:17px;background:linear-gradient(145deg,rgba(13,24,50,.90),rgba(8,16,35,.88));border-color:rgba(111,134,255,.14);box-shadow:0 14px 40px rgba(0,0,0,.13);transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}
#panel-mocktest .mt-card:before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(180deg,#6d83ff,#8068ee);opacity:.78}
#panel-mocktest .mt-card:hover{transform:translateY(-2px);border-color:rgba(112,137,255,.34);box-shadow:0 20px 54px rgba(0,0,0,.22)}
#panel-mocktest .mt-card.is-complete:before{background:linear-gradient(180deg,#47c98a,#62d9a2)}
#panel-mocktest .mt-card.is-progress:before{background:linear-gradient(180deg,#f3b64b,#ffcf6e)}
#panel-mocktest .mt-card-icon{width:50px;height:50px;border-radius:14px;background:linear-gradient(145deg,rgba(89,117,255,.18),rgba(101,84,230,.10))!important;border:1px solid rgba(112,135,255,.16);color:#aab8ff!important;font-family:Georgia,serif;font-size:23px}
#panel-mocktest .mt-card-body{padding:1px 0}
#panel-mocktest .mt-card-title{font-size:15.5px;letter-spacing:-.02em;margin-bottom:5px;color:#f7f9ff}
#panel-mocktest .mt-card-meta{font-family:var(--font-body);font-size:11.5px;color:#8793b1;margin-bottom:6px}
#panel-mocktest .mt-card-result{font-size:11.5px;line-height:1.5;color:#8d99b7!important}
.mock-status-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 8px}
.mock-status-badge{display:inline-flex;align-items:center;gap:5px;padding:5px 8px;border-radius:999px;font-size:9.5px;font-weight:850;letter-spacing:.07em;text-transform:uppercase;border:1px solid rgba(120,145,255,.14);background:rgba(255,255,255,.035);color:#aab5d2}
.mock-status-badge.new{color:#9cafef;background:rgba(86,116,255,.09);border-color:rgba(105,132,255,.16)}
.mock-status-badge.progress{color:#ffd071;background:rgba(244,178,65,.09);border-color:rgba(244,178,65,.18)}
.mock-status-badge.done{color:#7ce0ad;background:rgba(68,199,137,.09);border-color:rgba(68,199,137,.18)}
.mock-best-score{font-size:10.5px;color:#8692af}
.mock-modern-progress{margin-top:10px;max-width:420px}
.mock-modern-progress-head{display:flex;justify-content:space-between;gap:10px;font-size:10px;color:#7f8aa7;margin-bottom:5px}
.mock-modern-progress-track{height:5px;border-radius:999px;background:rgba(255,255,255,.06);overflow:hidden}
.mock-modern-progress-fill{height:100%;border-radius:inherit;background:linear-gradient(90deg,#6e84ff,#9a78ff)}
#panel-mocktest .mt-card-start{align-self:center;min-width:132px;border-radius:11px!important;padding:11px 16px!important;background:linear-gradient(135deg,#5e78ff,#7968ef)!important;color:white!important;box-shadow:0 9px 24px rgba(80,103,255,.16)!important;white-space:nowrap}
#panel-mocktest .mt-card.is-complete .mt-card-start{background:rgba(255,255,255,.05)!important;border:1px solid rgba(117,142,255,.18)!important;box-shadow:none!important;color:#dce4fa!important}

#panel-mocktest .mock-modern-run{border-radius:20px!important;border-color:rgba(114,137,255,.17)!important;background:linear-gradient(145deg,rgba(12,23,49,.96),rgba(7,14,31,.96))!important;box-shadow:0 24px 70px rgba(0,0,0,.22)}
.mock-run-topline{height:5px;border-radius:999px;background:rgba(255,255,255,.055);overflow:hidden;margin:-4px 0 19px}
.mock-run-topline>span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#637cff,#9c72f3)}
#panel-mocktest #mock-clock{padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.045);border:1px solid rgba(119,140,255,.13);color:#f5c96b!important;font-size:12px}
#panel-mocktest #mock-question-text{font-family:var(--font-body);font-size:17px!important;color:#f4f7ff;padding:14px 0 6px;margin:10px 0!important}
#panel-mocktest #mock-answer-area .ghost-btn{border-radius:12px!important;background:rgba(255,255,255,.028);border-color:rgba(121,140,210,.12);padding:12px 14px!important;color:#dfe5f5}
#panel-mocktest #mock-answer-area .ghost-btn:hover{background:rgba(92,116,255,.08);border-color:rgba(105,131,255,.28)}
#panel-mocktest #mock-nav-grid{padding:12px;border-radius:14px;background:rgba(255,255,255,.018);border:1px solid rgba(255,255,255,.045)}
#panel-mocktest #mock-nav-grid .ghost-btn{width:34px!important;min-width:34px!important;height:34px;padding:0!important;border-radius:9px!important;font-size:11px}

#panel-mocktest .mock-modern-result{text-align:left!important;border-radius:22px!important;background:radial-gradient(circle at 80% 12%,rgba(91,112,255,.13),transparent 30%),linear-gradient(145deg,rgba(12,23,49,.97),rgba(7,14,31,.97))!important;border-color:rgba(113,136,255,.18)!important;box-shadow:0 26px 80px rgba(0,0,0,.24)}
#panel-mocktest .mock-modern-result>div:first-child{font-size:36px!important}
#panel-mocktest .mock-modern-result h3{font-family:var(--font-display);font-size:22px;margin:8px 0 4px}
#panel-mocktest .mock-modern-result #mock-ai-feedback{background:linear-gradient(135deg,#6178ff,#8067ef)!important;color:#fff!important;border-radius:11px!important;box-shadow:none!important}
#panel-mocktest .mock-modern-result #mock-back-list{border-radius:11px!important}

#panel-mocktest .mock-history-modern{border-radius:20px!important;background:linear-gradient(145deg,rgba(12,23,49,.96),rgba(7,14,31,.96))!important;border-color:rgba(112,135,255,.16)!important}
#panel-mocktest .mock-history-modern h3{font-family:var(--font-display);font-size:20px;margin-bottom:15px!important}
#panel-mocktest .mock-history-entry{padding:13px 14px!important;margin:8px 0;border:1px solid rgba(115,138,255,.11)!important;border-radius:12px;background:rgba(255,255,255,.025)}
#panel-mocktest .mock-history-entry b{color:#eff3ff;font-size:13px}

html[data-theme="light"] .mock-modern-hero{background:linear-gradient(135deg,#fff,#f4f7ff);border-color:rgba(54,83,170,.12);box-shadow:0 22px 60px rgba(48,72,118,.10)}
html[data-theme="light"] .mock-modern-title,html[data-theme="light"] .mock-modern-stat-value{color:#14203a}
html[data-theme="light"] .mock-modern-sub,html[data-theme="light"] .mock-modern-pill{color:#68758f}
html[data-theme="light"] .mock-modern-stat{background:rgba(255,255,255,.75);border-color:rgba(43,70,130,.09)}
html[data-theme="light"] .mock-modern-ring:after{background:#f8faff}
html[data-theme="light"] #panel-mocktest .mt-card,html[data-theme="light"] #panel-mocktest .mock-modern-run,html[data-theme="light"] #panel-mocktest .mock-modern-result,html[data-theme="light"] #panel-mocktest .mock-history-modern{background:#fff!important;border-color:rgba(42,68,126,.10)!important;box-shadow:0 14px 40px rgba(50,75,120,.08)!important}
html[data-theme="light"] #panel-mocktest .mt-card-title,html[data-theme="light"] #panel-mocktest #mock-question-text,html[data-theme="light"] #panel-mocktest .mock-modern-result h3{color:#14203a!important}
html[data-theme="light"] #panel-mocktest .mt-card-meta,html[data-theme="light"] #panel-mocktest .mt-card-result{color:#68758f!important}

@media(max-width:820px){
  .mock-modern-hero{grid-template-columns:1fr;padding:21px;border-radius:18px;gap:18px}
  .mock-modern-stats{grid-template-columns:repeat(3,1fr)}
  .mock-modern-stat.primary{grid-column:auto;display:block}
  .mock-modern-ring{display:none}
  .mock-modern-stat{min-height:82px;padding:13px}
  .mock-modern-stat-value{font-size:20px}
}
@media(max-width:600px){
  #panel-mocktest{margin-top:4px!important}
  .mock-modern-hero{padding:18px 16px;border-radius:17px}
  .mock-modern-title{font-size:27px}
  .mock-modern-sub{font-size:12.5px;line-height:1.55}
  .mock-modern-pills{gap:6px}.mock-modern-pill{font-size:10px;padding:6px 8px}
  .mock-modern-stats{grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
  .mock-modern-stat{min-height:76px;padding:11px 9px;border-radius:13px}
  .mock-modern-stat-label{font-size:8.5px;letter-spacing:.05em;margin-bottom:5px}
  .mock-modern-stat-value{font-size:18px}
  .mock-modern-stat-sub{font-size:8.5px}
  #panel-mocktest .mocktest-filter-row{margin:12px 0 14px;overflow-x:auto;flex-wrap:nowrap;padding-bottom:2px}
  #panel-mocktest .mt-card{display:grid;grid-template-columns:48px 1fr;gap:12px;padding:15px;border-radius:15px}
  #panel-mocktest .mt-card-icon{width:46px;height:46px}
  #panel-mocktest .mt-card-start{grid-column:1/-1;width:100%!important;min-width:0;align-self:auto}
  .mock-status-row{margin-top:1px}
  #panel-mocktest .mock-modern-run{padding:16px!important}
  #panel-mocktest #mock-question-text{font-size:15.5px!important;line-height:1.55!important}
  #panel-mocktest #mock-nav-grid{gap:5px!important;padding:9px}
  #panel-mocktest #mock-nav-grid .ghost-btn{width:31px!important;min-width:31px!important;height:31px}
}
</style>

<script id="mathlvl-mock-modern-runtime">
(function(){
  const panel = document.getElementById('panel-mocktest');
  const list = document.getElementById('mocktest-list');
  if(!panel || !list) return;

  function readHistory(){
    try{ const v = JSON.parse(localStorage.getItem('mathlvl_mock_results') || '[]'); return Array.isArray(v) ? v : []; }
    catch(_e){ return []; }
  }
  function readDraft(){
    try{
      const d = JSON.parse(localStorage.getItem('mathlvl_mock_draft_v1') || 'null');
      if(!d || !d.testId) return null;
      if(Date.now() - Number(d.updatedAt || 0) > 7 * 86400000) return null;
      return d;
    }catch(_e){ return null; }
  }
  function esc(v){
    return String(v ?? '').replace(/[&<>"']/g, ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
  }
  function aggregate(){
    const h = readHistory();
    const best = h.length ? Math.max(...h.map(x=>Number(x.percent)||0)) : 0;
    const avg = h.length ? Math.round(h.reduce((a,x)=>a+(Number(x.percent)||0),0)/h.length) : 0;
    return {history:h, attempts:h.length, best, avg};
  }

  function ensureHero(){
    let hero = document.getElementById('mock-modern-hero');
    if(!hero){
      hero = document.createElement('div');
      hero.id = 'mock-modern-hero';
      hero.className = 'mock-modern-hero';
      const filter = panel.querySelector('.mocktest-filter-row');
      if(filter) panel.insertBefore(hero, filter); else panel.insertBefore(hero, list);
    }
    const a = aggregate();
    const draft = readDraft();
    const draftPct = draft ? Math.max(0,Math.min(100,Math.round(((Number(draft.mockIndex)||0)+1)/45*100))) : 0;
    const primaryValue = draft ? 'Davom eting' : (a.attempts ? `${a.best}%` : 'Boshlang');
    const primarySub = draft ? `${(Number(draft.mockIndex)||0)+1}/45-topshiriqdan` : (a.attempts ? 'eng yaxshi natija' : 'birinchi mock tayyor');
    hero.innerHTML = `
      <div class="mock-modern-copy">
        <div class="mock-modern-eyebrow">MATHLVL MOCK LAB</div>
        <h2 class="mock-modern-title">Milliy sertifikatga<br>imtihondek tayyorlaning.</h2>
        <p class="mock-modern-sub">150 daqiqalik to‘liq format, saqlanadigan progress va natijalar tarixi. Har urinishdan keyin o‘sishingizni ko‘ring.</p>
        <div class="mock-modern-pills">
          <span class="mock-modern-pill"><b>45</b> topshiriq</span>
          <span class="mock-modern-pill"><b>55</b> javob elementi</span>
          <span class="mock-modern-pill"><b>150</b> daqiqa</span>
        </div>
        <div class="mock-modern-actions" id="mock-modern-actions"></div>
      </div>
      <div class="mock-modern-stats">
        <div class="mock-modern-stat primary">
          <div><span class="mock-modern-stat-label">${draft?'Faol mock':'Eng yaxshi'}</span><div class="mock-modern-stat-value">${primaryValue}</div><div class="mock-modern-stat-sub">${primarySub}</div></div>
          <div class="mock-modern-ring" style="--pct:${draft?draftPct:a.best}"><span>${draft?draftPct:a.best}%</span></div>
        </div>
        <div class="mock-modern-stat"><span class="mock-modern-stat-label">Ishlangan</span><div class="mock-modern-stat-value">${a.attempts}</div><div class="mock-modern-stat-sub">urinish</div></div>
        <div class="mock-modern-stat"><span class="mock-modern-stat-label">O‘rtacha</span><div class="mock-modern-stat-value">${a.attempts?a.avg+'%':'—'}</div><div class="mock-modern-stat-sub">barcha urinishlar</div></div>
      </div>`;
    const resultsBtn = document.getElementById('mocktest-results-btn');
    const actions = document.getElementById('mock-modern-actions');
    if(resultsBtn && actions && resultsBtn.parentElement !== actions){
      resultsBtn.textContent = 'Natijalar tarixi';
      actions.appendChild(resultsBtn);
    }
  }

  function enhanceCards(){
    const history = readHistory();
    const draft = readDraft();
    list.querySelectorAll('.mt-card').forEach(card=>{
      const btn = card.querySelector('[data-mt-start]');
      const titleEl = card.querySelector('.mt-card-title');
      const body = card.querySelector('.mt-card-body');
      if(!btn || !titleEl || !body) return;
      const id = btn.dataset.mtStart;
      const title = (titleEl.textContent || '').trim();
      const attempts = history.filter(x => String(x.title||'').trim() === title);
      const best = attempts.length ? Math.max(...attempts.map(x=>Number(x.percent)||0)) : 0;
      const inProgress = !!(draft && draft.testId === id);
      card.classList.toggle('is-progress', inProgress);
      card.classList.toggle('is-complete', !inProgress && attempts.length>0);

      let row = body.querySelector('.mock-status-row');
      if(!row){ row = document.createElement('div'); row.className = 'mock-status-row'; body.insertBefore(row, body.firstChild); }
      let badgeClass='new', badgeText='Yangi', extra='';
      if(inProgress){
        badgeClass='progress'; badgeText='Davom etmoqda';
        const idx = Math.max(0,Math.min(44,Number(draft.mockIndex)||0));
        const pct = Math.round((idx+1)/45*100);
        extra = `<span class="mock-best-score">${idx+1}/45 · ${pct}%</span>`;
        btn.textContent = 'Davom ettirish';
        let pr = body.querySelector('.mock-modern-progress');
        if(!pr){ pr=document.createElement('div'); pr.className='mock-modern-progress'; body.appendChild(pr); }
        pr.innerHTML=`<div class="mock-modern-progress-head"><span>Progress</span><span>${idx+1}/45</span></div><div class="mock-modern-progress-track"><div class="mock-modern-progress-fill" style="width:${pct}%"></div></div>`;
      }else{
        body.querySelector('.mock-modern-progress')?.remove();
        if(attempts.length){
          badgeClass='done'; badgeText='✓ Ishlangan'; extra=`<span class="mock-best-score">Eng yaxshi: ${best}% · ${attempts.length} urinish</span>`;
          btn.textContent = 'Qayta ishlash';
        }else btn.textContent = 'Boshlash';
      }
      const html = `<span class="mock-status-badge ${badgeClass}">${badgeText}</span>${extra}`;
      if(row.innerHTML !== html) row.innerHTML = html;
    });
  }

  function enhanceRun(){
    const clock = list.querySelector('#mock-clock');
    if(!clock) return;
    const card = clock.closest('.glass-card');
    if(!card) return;
    card.classList.add('mock-modern-run');
    if(!card.querySelector('.mock-run-topline')){
      const txt = card.textContent || '';
      const m = txt.match(/(\d+)\/45-topshiriq/);
      const idx = m ? Number(m[1]) : 1;
      const bar = document.createElement('div');
      bar.className='mock-run-topline';
      bar.innerHTML=`<span style="width:${Math.max(2,Math.min(100,idx/45*100))}%"></span>`;
      card.insertBefore(bar, card.firstChild);
    }
  }

  function enhanceResult(){
    const ai = list.querySelector('#mock-ai-feedback');
    if(!ai) return;
    const card = ai.closest('.glass-card');
    if(card) card.classList.add('mock-modern-result');
  }

  function enhanceHistory(){
    const h3 = Array.from(list.querySelectorAll('h3')).find(el => /Oxirgi natijalar/i.test(el.textContent||''));
    if(!h3) return;
    const card = h3.closest('.glass-card');
    if(!card) return;
    card.classList.add('mock-history-modern');
    Array.from(card.children).forEach(ch=>{
      if(ch.tagName==='DIV' && ch !== h3 && !ch.classList.contains('empty-note')) ch.classList.add('mock-history-entry');
    });
  }

  function enhance(){
    ensureHero();
    enhanceCards();
    enhanceRun();
    enhanceResult();
    enhanceHistory();
  }

  let queued=false;
  function schedule(){
    if(queued) return;
    queued=true;
    requestAnimationFrame(()=>{ queued=false; enhance(); });
  }
  const observer = new MutationObserver(schedule);
  observer.observe(list,{childList:true,subtree:true});
  window.addEventListener('storage',schedule);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible') schedule();});
  schedule();
})();
</script>
'''

if '</body>' not in s:
    raise SystemExit('Closing body tag not found')

s = s.replace('</body>', payload + '\n</body>', 1)

required = [
    MARKER,
    'mock-modern-hero',
    'Davom ettirish',
    '✓ Ishlangan',
    'mock-modern-result',
]
for token in required:
    if token not in s:
        raise SystemExit(f'Modern mock UI missing: {token}')

p.write_text(s, encoding='utf-8')
print('Modern mock hub UI applied.')
