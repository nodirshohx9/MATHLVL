
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
        <p class="mock-modern-sub">${accountSession() ? '150 daqiqalik to‘liq format, akkauntda saqlanadigan progress va ishlangan holati.' : 'Test tarixi va davom ettirish uchun hisobingizga kiring.'}</p>
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
