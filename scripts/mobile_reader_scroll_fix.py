from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

# 1) Mobile should not eagerly render almost two screens of PDF pages ahead.
old_observer = """  }, { root: wrap, rootMargin: '900px 0px', threshold: 0.01 });

  document.querySelectorAll('.reader-page-item').forEach(el=> pageObserver.observe(el));
  document.getElementById('reader-canvas-wrap').querySelector('.reader-scroll')
    .addEventListener('scroll', debounce(updateCurrentVisiblePage, 150));"""
new_observer = """  }, {
    root: wrap,
    rootMargin: window.matchMedia('(max-width:899px)').matches ? '180px 0px' : '900px 0px',
    threshold: 0.01
  });

  document.querySelectorAll('.reader-page-item').forEach(el=> pageObserver.observe(el));
  document.getElementById('reader-canvas-wrap').querySelector('.reader-scroll')
    .addEventListener('scroll', debounce(updateCurrentVisiblePage, 120), { passive:true });"""
if old_observer in s:
    s = s.replace(old_observer, new_observer, 1)

# 2) Old double-tap zoom treated two quick scroll gestures as a double tap.
# Track finger movement so zoom only happens on a real stationary double tap.
old_double_tap = """  let lastTap = 0;
  scrollEl.addEventListener('touchend', (e)=>{
    if(annotationTool || e.touches.length > 0) return;
    const now = Date.now();
    if(now - lastTap < 300){
      setZoom(readerZoomPercent > 100 ? 100 : 200);
    }
    lastTap = now;
  });"""
new_double_tap = """  let lastTap = 0;
  let tapStartX = 0;
  let tapStartY = 0;
  let tapMoved = false;

  scrollEl.addEventListener('touchstart', (e)=>{
    if(annotationTool || e.touches.length !== 1) return;
    tapStartX = e.touches[0].clientX;
    tapStartY = e.touches[0].clientY;
    tapMoved = false;
  }, { passive:true });

  scrollEl.addEventListener('touchmove', (e)=>{
    if(e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - tapStartX;
    const dy = e.touches[0].clientY - tapStartY;
    if(Math.hypot(dx, dy) > 10) tapMoved = true;
  }, { passive:true });

  scrollEl.addEventListener('touchend', (e)=>{
    if(annotationTool || e.touches.length > 0 || tapMoved || pinchStartDist) return;
    const now = Date.now();
    if(lastTap && now - lastTap < 280){
      lastTap = 0;
      setZoom(readerZoomPercent > 100 ? 100 : 200);
      return;
    }
    lastTap = now;
  }, { passive:true });"""
if old_double_tap in s:
    s = s.replace(old_double_tap, new_double_tap, 1)

# 3) Lightweight mobile paint path. Large shadows + smooth scrolling + gradients
# on dozens of PDF canvases were causing compositor jank on phones.
marker = '/* MATHLVL_MOBILE_PDF_SCROLL_FIX */'
if marker not in s:
    css = r'''
/* MATHLVL_MOBILE_PDF_SCROLL_FIX */
@media(max-width:899px){
  body.reader-mode{
    overscroll-behavior-y:none!important;
  }
  body.reader-mode .reader-body{
    contain:layout paint!important;
  }
  body.reader-mode .reader-scroll{
    scroll-behavior:auto!important;
    touch-action:pan-y pinch-zoom!important;
    overscroll-behavior-y:contain!important;
    -webkit-overflow-scrolling:touch!important;
    background:#080b10!important;
    will-change:scroll-position;
  }
  html[data-theme="light"] body.reader-mode .reader-scroll{
    background:#e7ebf1!important;
  }
  body.reader-mode .reader-page-item{
    box-shadow:0 8px 22px rgba(0,0,0,.24)!important;
    contain:layout paint style!important;
  }
  body.reader-mode .reader-page-item canvas.page-canvas{
    transform:translateZ(0);
    backface-visibility:hidden;
  }
}
'''
    s = s.replace('</style>', css + '\n</style>', 1)

p.write_text(s, encoding='utf-8')
print('Mobile PDF reader scroll fix applied.')
