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

  // Keep this reader path deliberately simple: render the first few pages
  // immediately and render the next nearby page on scroll. This avoids runtime
  // dependencies on IntersectionObserver callbacks/helpers that were being
  // rewritten by other build patches.
  const items = Array.from(scrollEl.querySelectorAll('.reader-page-item'));
  const renderNearby = ()=>{
    if(!items.length) return;
    const first = items[0];
    const stride = first.offsetHeight + (parseFloat(getComputedStyle(first).marginBottom) || 0);
    const idx = stride ? Math.max(0, Math.min(items.length - 1, Math.round(scrollEl.scrollTop / stride))) : 0;
    const start = Math.max(0, idx - 1);
    const end = Math.min(items.length - 1, idx + 2);

    for(let i=start; i<=end; i++){
      const num = parseInt(items[i].dataset.page, 10);
      if(Number.isFinite(num) && typeof window.renderPageInto === 'function') window.renderPageInto(items[i], num);
    }

    const num = parseInt(items[idx]?.dataset.page, 10);
    if(Number.isFinite(num)){
      currentVisiblePage = num;
      readerPageNum = num;
      updatePageIndicator();
    }
  };

  renderNearby();

  if(!scrollEl.dataset.readerSimpleV3Bound){
    scrollEl.dataset.readerSimpleV3Bound = '1';
    let raf = 0;
    scrollEl.addEventListener('scroll', ()=>{
      if(raf) return;
      raf = requestAnimationFrame(()=>{
        raf = 0;
        renderNearby();
      });
    }, { passive:true });
  }
}

// MATHLVL_READER_OBSERVER_RUNTIME_FIX_V3
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
if "const renderNearby =" not in block or "window.renderPageInto(items[i], num)" not in block:
    raise SystemExit('simple reader fix verification failed')
if "IntersectionObserver(" in block or "renderPageInto(entry.target, num)" in block:
    raise SystemExit('old observer runtime still present')



# The renderer is declared later in the same reader script. Expose it explicitly on
# window so build-time script splitting/reordering cannot hide it from setupPageObserver.
renderer_anchor = "// ---- Ekrandan uzoq sahifalarni bo'shatish (xotira uchun) ----"
if "window.renderPageInto = renderPageInto;" not in s2:
    if renderer_anchor not in s2:
        raise SystemExit('renderer export anchor not found')
    s2 = s2.replace(renderer_anchor, "window.renderPageInto = renderPageInto;\n\n" + renderer_anchor, 1)

p.write_text(s2, encoding='utf-8')
print('Book reader IntersectionObserver fixed.')
