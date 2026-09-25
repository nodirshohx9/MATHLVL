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

  const isMobileReader = window.matchMedia('(max-width:899px)').matches;
  const rootMargin = isMobileReader ? '120px 0px' : '700px 0px';

  pageObserver = new IntersectionObserver((entries)=>{
    for(const entry of entries){
      const num = parseInt(entry.target.dataset.page, 10);
      if(!Number.isFinite(num) || !entry.isIntersecting) continue;
      renderPageInto(entry.target, num);
    }
  }, { root: scrollEl, rootMargin, threshold: 0.01 });

  document.querySelectorAll('.reader-page-item').forEach(el=> pageObserver.observe(el));

  if(!scrollEl.dataset.readerSimpleV2Bound){
    scrollEl.dataset.readerSimpleV2Bound = '1';
    scrollEl.addEventListener('scroll', ()=>{
      const first = scrollEl.querySelector('.reader-page-item');
      if(!first) return;
      const stride = first.offsetHeight + (parseFloat(getComputedStyle(first).marginBottom) || 0);
      if(!stride) return;
      const items = scrollEl.querySelectorAll('.reader-page-item');
      const idx = Math.max(0, Math.min(items.length - 1, Math.round(scrollEl.scrollTop / stride)));
      const num = parseInt(items[idx]?.dataset.page, 10);
      if(Number.isFinite(num)){
        currentVisiblePage = num;
        readerPageNum = num;
        updatePageIndicator();
      }
    }, { passive:true });
  }
}

// MATHLVL_READER_OBSERVER_RUNTIME_FIX_V2
'''

pattern = re.compile(r"function setupPageObserver\(\)\{.*?\n\}\n\n// ---- Ekrandan uzoq sahifalarni", re.S)
s2, n = pattern.subn(replacement + "\n// ---- Ekrandan uzoq sahifalarni", s, count=1)
if n == 0:
    # Some later build steps may already have replaced setupPageObserver. In that
    # case, repair the runtime directly before verification.
    setup_pattern = re.compile(r"function setupPageObserver\(\)\{.*?\n\}\n\nfunction updateCurrentVisiblePage\(\)", re.S)
    s2, n = setup_pattern.subn(replacement + "\nfunction updateCurrentVisiblePage()", s, count=1)
if n != 1:
    raise SystemExit(f'setupPageObserver replacement failed: {n}')

idx = s2.find('function setupPageObserver(){')
end = s2.find('// ---- Ekrandan uzoq sahifalarni', idx)
block = s2[idx:end]
if "const rootMargin =" not in block or "root: scrollEl" not in block or "renderPageInto(entry.target, num)" not in block:
    raise SystemExit('observer fix verification failed')
if "rootMargin: renderMargin" in block:
    raise SystemExit('old renderMargin bug still present')

p.write_text(s2, encoding='utf-8')
print('Book reader IntersectionObserver fixed.')
