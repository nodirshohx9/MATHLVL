from pathlib import Path
import re

p = Path('index.html')
s = p.read_text(encoding='utf-8')

MARK = 'MATHLVL_READER_OBSERVER_RUNTIME_FIX_V1'

replacement = r'''function setupPageObserver(){
  const scrollEl = document.getElementById('reader-scroll');
  if(!scrollEl) return;

  if(pageObserver){
    pageObserver.disconnect();
    pageObserver = null;
  }

  if(typeof clearMobileRenderQueue === 'function') clearMobileRenderQueue();

  const isMobileReader = window.matchMedia('(max-width:899px)').matches;
  const rootMargin = isMobileReader ? '120px 0px' : '700px 0px';

  pageObserver = new IntersectionObserver((entries)=>{
    for(const entry of entries){
      const num = parseInt(entry.target.dataset.page, 10);
      if(!Number.isFinite(num) || !entry.isIntersecting) continue;

      if(isMobileReader && typeof scheduleMobileReaderPageRender === 'function'){
        scheduleMobileReaderPageRender(entry.target, num);
      }else{
        renderPageInto(entry.target, num);
      }
    }

    if(typeof scheduleReaderVisibleUpdate === 'function'){
      scheduleReaderVisibleUpdate();
    }else{
      updateCurrentVisiblePage();
    }
  }, {
    root: scrollEl,
    rootMargin,
    threshold: 0.01
  });

  document.querySelectorAll('.reader-page-item').forEach(el=>{
    pageObserver.observe(el);
  });

  if(!scrollEl.dataset.readerObserverV1Bound){
    scrollEl.dataset.readerObserverV1Bound = '1';

    scrollEl.addEventListener('scroll', ()=>{
      if(typeof scheduleReaderVisibleUpdate === 'function'){
        scheduleReaderVisibleUpdate();
      }else{
        updateCurrentVisiblePage();
      }
    }, { passive:true });
  }

  if(typeof scheduleReaderVisibleUpdate === 'function'){
    scheduleReaderVisibleUpdate();
  }else{
    updateCurrentVisiblePage();
  }

  if(typeof pumpMobileRenderQueue === 'function'){
    pumpMobileRenderQueue();
  }
}

// MATHLVL_READER_OBSERVER_RUNTIME_FIX_V1
'''

pattern = re.compile(r"function setupPageObserver\(\)\{.*?\n\}\n\n// ---- Ekrandan uzoq sahifalarni", re.S)
s2, n = pattern.subn(replacement + "\n// ---- Ekrandan uzoq sahifalarni", s, count=1)
if n != 1:
    raise SystemExit(f'setupPageObserver replacement failed: {n}')

idx = s2.find('function setupPageObserver(){')
end = s2.find('// ---- Ekrandan uzoq sahifalarni', idx)
block = s2[idx:end]
if "const rootMargin =" not in block or "root: scrollEl" not in block:
    raise SystemExit('observer fix verification failed')
if "rootMargin: renderMargin" in block:
    raise SystemExit('old renderMargin bug still present')

p.write_text(s2, encoding='utf-8')
print('Book reader IntersectionObserver fixed.')
