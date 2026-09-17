from pathlib import Path
import re

p = Path('index.html')
s = p.read_text(encoding='utf-8')

MARK = 'MATHLVL_MOBILE_READER_SCROLL_FIX'

css = r'''
/* ===== MATHLVL_MOBILE_READER_SCROLL_FIX ===== */
@media (max-width:899px){
  body.reader-mode{
    overscroll-behavior:none!important;
  }
  body.reader-mode .reader-body{
    height:calc(100dvh - 78px)!important;
    max-height:calc(100dvh - 78px)!important;
    min-height:0!important;
    contain:layout paint style;
  }
  body.reader-mode .reader-canvas-wrap{
    min-height:0!important;
    overflow:hidden!important;
    contain:layout paint style;
  }
  body.reader-mode .reader-scroll{
    overflow-y:auto!important;
    overflow-x:hidden!important;
    -webkit-overflow-scrolling:touch!important;
    overscroll-behavior-y:contain!important;
    touch-action:pan-y!important;
    scroll-behavior:auto!important;
    will-change:scroll-position;
    transform:translateZ(0);
    contain:layout paint style;
    scrollbar-width:none!important;
  }
  body.reader-mode .reader-scroll::-webkit-scrollbar{display:none!important}
  body.reader-mode .reader-page-item{
    contain:layout paint;
    box-shadow:0 10px 28px rgba(0,0,0,.26)!important;
  }
  body.reader-mode .reader-page-item canvas.page-canvas{
    pointer-events:none!important;
  }
  body.reader-mode .reader-page-item canvas.page-annotation-canvas{
    touch-action:pan-y!important;
  }
  body.reader-mode .reader-scroll.draw-lock canvas.page-annotation-canvas{
    touch-action:none!important;
  }
  body.reader-mode .reader-header{
    backdrop-filter:none!important;
    -webkit-backdrop-filter:none!important;
  }
}
'''

if MARK not in s:
    if '</style>' not in s:
        raise SystemExit('style closing tag not found')
    s = s.replace('</style>', css + '\n</style>', 1)

# updateCurrentVisiblePage currently triggers canvas GC immediately while the finger is
# scrolling. That can remove/recreate canvases mid-gesture and is a major source of jank.
s = s.replace('  garbageCollectFarPages();\n}\n\nfunction updatePageIndicator',
              '}\n\nfunction updatePageIndicator', 1)

# Keep fewer canvases on mobile, but release them only after scrolling has settled.
s = s.replace('  if(renderedPages.size <= 10) return;',
              "  const mobileReader = window.matchMedia('(max-width:899px)').matches;\n  const maxRendered = mobileReader ? 6 : 10;\n  const keepDistance = mobileReader ? 3 : 6;\n  if(renderedPages.size <= maxRendered) return;", 1)
s = s.replace('    if(Math.abs(num - currentVisiblePage) > 6 && renderedPages.has(num)){',
              '    if(Math.abs(num - currentVisiblePage) > keepDistance && renderedPages.has(num)){', 1)

helper_marker = 'MATHLVL_READER_SCROLL_RUNTIME_FIX'
if helper_marker not in s:
    helper = r'''
// MATHLVL_READER_SCROLL_RUNTIME_FIX
let readerScrollRaf = 0;
let readerGcTimer = 0;
const readerIdleRenderJobs = new Map();

function scheduleReaderVisibleUpdate(){
  if(readerScrollRaf) return;
  readerScrollRaf = requestAnimationFrame(()=>{
    readerScrollRaf = 0;
    updateCurrentVisiblePage();
  });
}

function scheduleReaderGarbageCollect(){
  clearTimeout(readerGcTimer);
  readerGcTimer = setTimeout(()=>{
    const run = ()=> garbageCollectFarPages();
    if('requestIdleCallback' in window){
      requestIdleCallback(run, { timeout: 500 });
    }else{
      setTimeout(run, 0);
    }
  }, 320);
}

function scheduleMobileReaderPageRender(item, num){
  if(renderedPages.has(num)) return;
  if(readerIdleRenderJobs.has(num)) return;

  const run = ()=>{
    readerIdleRenderJobs.delete(num);
    if(!item || !item.isConnected || renderedPages.has(num)) return;
    renderPageInto(item, num);
  };

  if(Math.abs(num - currentVisiblePage) <= 1){
    requestAnimationFrame(run);
    return;
  }

  if('requestIdleCallback' in window){
    const id = requestIdleCallback(run, { timeout: 180 });
    readerIdleRenderJobs.set(num, ['idle', id]);
  }else{
    const id = setTimeout(run, 32);
    readerIdleRenderJobs.set(num, ['timeout', id]);
  }
}

function cancelReaderIdleRenders(){
  readerIdleRenderJobs.forEach(job=>{
    if(!job) return;
    if(job[0] === 'idle' && 'cancelIdleCallback' in window) cancelIdleCallback(job[1]);
    if(job[0] === 'timeout') clearTimeout(job[1]);
  });
  readerIdleRenderJobs.clear();
}

'''
    anchor = '// ---- IntersectionObserver: qaysi sahifa render qilinishi va joriy sahifa kuzatuvi ----'
    if anchor not in s:
        raise SystemExit('reader observer anchor not found')
    s = s.replace(anchor, helper + anchor, 1)

# Replace the observer with a mobile-friendly one. The old 900px pre-render margin can
# start several PDF renders during a swipe, which blocks mobile scrolling.
pattern = re.compile(
    r"function setupPageObserver\(\)\{.*?\n\}\n\n// ---- Ekrandan uzoq sahifalarni",
    re.S,
)
replacement = r'''function setupPageObserver(){
  const scrollEl = document.getElementById('reader-scroll');
  if(!scrollEl) return;

  if(pageObserver){
    pageObserver.disconnect();
    pageObserver = null;
  }
  cancelReaderIdleRenders();

  const isMobileReader = window.matchMedia('(max-width:899px)').matches;
  const rootMargin = isMobileReader ? '180px 0px' : '700px 0px';

  pageObserver = new IntersectionObserver((entries)=>{
    for(const entry of entries){
      const num = parseInt(entry.target.dataset.page, 10);
      if(!Number.isFinite(num) || !entry.isIntersecting) continue;

      if(isMobileReader){
        scheduleMobileReaderPageRender(entry.target, num);
      }else{
        renderPageInto(entry.target, num);
      }
    }
    scheduleReaderVisibleUpdate();
  }, { root: scrollEl, rootMargin, threshold: 0.01 });

  document.querySelectorAll('.reader-page-item').forEach(el=> pageObserver.observe(el));

  if(!scrollEl.dataset.readerPerfBound){
    scrollEl.dataset.readerPerfBound = '1';
    scrollEl.addEventListener('scroll', ()=>{
      scheduleReaderVisibleUpdate();
      scheduleReaderGarbageCollect();
    }, { passive:true });
  }
}

// ---- Ekrandan uzoq sahifalarni'''

s2, n = pattern.subn(replacement, s, count=1)
if n != 1:
    raise SystemExit(f'setupPageObserver replacement failed: {n}')
s = s2

# Avoid stale scheduled work when the reader is rebuilt/reopened.
reset_anchor = "  if(pageObserver){ pageObserver.disconnect(); pageObserver = null; }"
if reset_anchor in s and 'cancelReaderIdleRenders();\n  if(pageObserver)' not in s:
    s = s.replace(reset_anchor, '  cancelReaderIdleRenders();\n' + reset_anchor, 1)

p.write_text(s, encoding='utf-8')
print('Mobile PDF reader scrolling optimized.')
