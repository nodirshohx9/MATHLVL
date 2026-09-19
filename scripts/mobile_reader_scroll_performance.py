from pathlib import Path
import re

p = Path('index.html')
s = p.read_text(encoding='utf-8')

MARK = 'MATHLVL_MOBILE_READER_SCROLL_PERF_V2'

css = r'''
/* ===== MATHLVL_MOBILE_READER_SCROLL_PERF_V2 ===== */
@media (max-width:899px){
  body.reader-mode{
    overscroll-behavior:none!important;
  }
  body.reader-mode .reader-body{
    height:calc(100dvh - 78px)!important;
    max-height:calc(100dvh - 78px)!important;
    min-height:0!important;
    contain:layout paint style!important;
  }
  body.reader-mode .reader-canvas-wrap{
    min-height:0!important;
    overflow:hidden!important;
    contain:layout paint style!important;
  }
  body.reader-mode .reader-scroll{
    overflow-y:auto!important;
    overflow-x:hidden!important;
    -webkit-overflow-scrolling:touch!important;
    overscroll-behavior-y:contain!important;
    touch-action:pan-y!important;
    scroll-behavior:auto!important;
    contain:layout paint style!important;
    scrollbar-width:none!important;
  }
  body.reader-mode .reader-scroll::-webkit-scrollbar{display:none!important}
  body.reader-mode .reader-page-item{
    contain:layout paint!important;
    box-shadow:0 6px 18px rgba(0,0,0,.20)!important;
  }
  body.reader-mode .reader-page-item canvas.page-canvas{
    pointer-events:none!important;
    transform:none!important;
    backface-visibility:visible!important;
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

# The old mobile patch promoted the entire scrolling surface and every PDF canvas to
# GPU layers. On real phones this can increase memory pressure and cause scroll stalls.
s = s.replace('    will-change:scroll-position;\n', '', 1)
s = s.replace('    transform:translateZ(0);\n', '', 1)
s = s.replace('    transform:translateZ(0);\n    backface-visibility:hidden;\n', '', 1)

# Do not scale the entire 100+ page scroll container live during pinch. Just measure
# the gesture and apply the real PDF zoom after the fingers are released.
s = s.replace("    scrollEl.style.transform = `scale(${liveScale})`;\n    scrollEl.style.transformOrigin = 'center top';\n", '', 1)

# Current-page tracking used to scan every page and call getBoundingClientRect on all
# of them. A 190-page book makes that noticeably expensive on mobile.
visible_pattern = re.compile(
    r"function updateCurrentVisiblePage\(\)\{.*?\n\}\n\n(?:function updatePageIndicator|window\.updatePageIndicator = function\(\))",
    re.S,
)
visible_replacement = r'''function updateCurrentVisiblePage(){
  const wrap = document.getElementById('reader-canvas-wrap');
  if(!wrap) return;

  const rect = wrap.getBoundingClientRect();
  const x = Math.min(window.innerWidth - 2, Math.max(2, rect.left + rect.width * 0.5));
  const y = Math.min(window.innerHeight - 2, Math.max(2, rect.top + rect.height * 0.35));

  let best = null;
  const stack = document.elementsFromPoint ? document.elementsFromPoint(x, y) : [];
  for(const node of stack){
    const page = node && node.closest ? node.closest('.reader-page-item') : null;
    if(page){ best = page; break; }
  }

  if(!best){
    const current = document.querySelector(`.reader-page-item[data-page="${currentVisiblePage}"]`);
    const candidates = [current, current?.previousElementSibling, current?.nextElementSibling].filter(Boolean);
    let bestDist = Infinity;
    for(const el of candidates){
      if(!el.classList?.contains('reader-page-item')) continue;
      const r = el.getBoundingClientRect();
      const dist = Math.abs((r.top + r.height * .5) - y);
      if(dist < bestDist){ bestDist = dist; best = el; }
    }
  }

  if(best){
    const num = parseInt(best.dataset.page, 10);
    if(Number.isFinite(num) && num !== currentVisiblePage){
      currentVisiblePage = num;
      readerPageNum = num;
      updatePageIndicator();
      const sheet = document.getElementById('ai-sheet');
      if(sheet?.classList.contains('open')){
        document.getElementById('ai-sheet-title').textContent = `${activeBook ? activeBook.title : ''} • ${num}-sahifa`;
      }
    }
  }
}

window.updatePageIndicator = function(){'''
s2, n = visible_pattern.subn(visible_replacement, s, count=1)
if n != 1:
    raise SystemExit(f'visible page tracker replacement failed: {n}')
s = s2

# Keep GC away from the finger gesture. It now runs only after scrolling settles.
s = s.replace('  garbageCollectFarPages();\n}\n\nfunction updatePageIndicator',
              '}\n\nfunction updatePageIndicator', 1)

s = s.replace('  if(renderedPages.size <= 10) return;',
              "  const mobileReader = window.matchMedia('(max-width:899px)').matches;\n  const maxRendered = mobileReader ? 8 : 10;\n  const keepDistance = mobileReader ? 4 : 6;\n  if(renderedPages.size <= maxRendered) return;", 1)
s = s.replace('    if(Math.abs(num - currentVisiblePage) > 6 && renderedPages.has(num)){',
              '    if(Math.abs(num - currentVisiblePage) > keepDistance && renderedPages.has(num)){', 1)

helper_marker = 'MATHLVL_READER_SCROLL_RUNTIME_V2'
if helper_marker not in s:
    helper = r'''
// MATHLVL_READER_SCROLL_RUNTIME_V2
let readerScrollRaf = 0;
let readerGcTimer = 0;
let readerTouchActive = false;
let mobileRenderBusy = false;
const mobileRenderQueue = [];
const mobileQueuedPages = new Set();

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
      requestIdleCallback(run, { timeout: 700 });
    }else{
      setTimeout(run, 0);
    }
  }, 700);
}

function clearMobileRenderQueue(){
  mobileRenderQueue.length = 0;
  mobileQueuedPages.clear();
}

function pumpMobileRenderQueue(){
  if(mobileRenderBusy || readerTouchActive) return;
  let job = null;
  while(mobileRenderQueue.length){
    const candidate = mobileRenderQueue.shift();
    mobileQueuedPages.delete(candidate.num);
    if(candidate.item?.isConnected && !renderedPages.has(candidate.num)){
      job = candidate;
      break;
    }
  }
  if(!job) return;

  mobileRenderBusy = true;
  requestAnimationFrame(async ()=>{
    try{
      await renderPageInto(job.item, job.num);
    }catch(e){
      if(e?.name !== 'RenderingCancelledException') console.warn('PDF sahifa renderi qayta urinadi:', job.num);
    }finally{
      mobileRenderBusy = false;
      requestAnimationFrame(pumpMobileRenderQueue);
    }
  });
}

function scheduleMobileReaderPageRender(item, num){
  if(!item || renderedPages.has(num) || mobileQueuedPages.has(num)) return;
  mobileQueuedPages.add(num);
  mobileRenderQueue.push({ item, num });
  mobileRenderQueue.sort((a,b)=> Math.abs(a.num-currentVisiblePage) - Math.abs(b.num-currentVisiblePage));
  pumpMobileRenderQueue();
}

'''
    anchor = '// ---- IntersectionObserver: qaysi sahifa render qilinishi va joriy sahifa kuzatuvi ----'
    if anchor not in s:
        raise SystemExit('reader observer anchor not found')
    s = s.replace(anchor, helper + anchor, 1)

# One PDF canvas render at a time on phones. Rendering multiple pages concurrently is
# the main source of the freeze felt while dragging the book with a finger.
observer_pattern = re.compile(
    r"function setupPageObserver\(\)\{.*?\n\}\n\n// ---- Ekrandan uzoq sahifalarni",
    re.S,
)
observer_replacement = r'''function setupPageObserver(){
  const scrollEl = document.getElementById('reader-scroll');
  if(!scrollEl) return;

  if(pageObserver){
    pageObserver.disconnect();
    pageObserver = null;
  }
  clearMobileRenderQueue();

  const isMobileReader = window.matchMedia('(max-width:899px)').matches;
  const rootMargin = isMobileReader ? '120px 0px' : '700px 0px';

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

  if(!scrollEl.dataset.readerPerfV2Bound){
    scrollEl.dataset.readerPerfV2Bound = '1';

    scrollEl.addEventListener('touchstart', ()=>{
      readerTouchActive = true;
      clearTimeout(readerGcTimer);
    }, { passive:true });

    scrollEl.addEventListener('touchend', ()=>{
      readerTouchActive = false;
      scheduleReaderVisibleUpdate();
      scheduleReaderGarbageCollect();
      pumpMobileRenderQueue();
    }, { passive:true });

    scrollEl.addEventListener('touchcancel', ()=>{
      readerTouchActive = false;
      pumpMobileRenderQueue();
    }, { passive:true });

    scrollEl.addEventListener('scroll', ()=>{
      scheduleReaderVisibleUpdate();
      scheduleReaderGarbageCollect();
    }, { passive:true });
  }

  scheduleReaderVisibleUpdate();
  pumpMobileRenderQueue();
}

// ---- Ekrandan uzoq sahifalarni'''
s2, n = observer_pattern.subn(observer_replacement, s, count=1)
if n != 1:
    raise SystemExit(f'setupPageObserver replacement failed: {n}')
s = s2

# Reader reopen: remove stale queued work from the previous PDF.
reset_anchor = "  if(pageObserver){ pageObserver.disconnect(); pageObserver = null; }"
if reset_anchor in s and 'clearMobileRenderQueue();\n  if(pageObserver)' not in s:
    s = s.replace(reset_anchor, '  clearMobileRenderQueue();\n' + reset_anchor, 1)

p.write_text(s, encoding='utf-8')
print('Mobile PDF reader performance v2 applied.')
