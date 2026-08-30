from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

MARKER = 'MATHLVL_MOBILE_READER_AI_FIX'
if MARKER in s:
    raise SystemExit(0)

old_ai = '''function openAiSheet(){
  document.getElementById('ai-sheet').classList.add('open');
  document.getElementById('ai-sheet-backdrop').classList.add('open');
  document.getElementById('ai-sheet-title').textContent = activeBook
    ? `${activeBook.title} • ${currentVisiblePage}-sahifa`
    : "Ustoz AI";
  // Desktop'da panel ochilganda reader kengligi qisqaradi — sahifalarni yangi kenglikka moslab qayta chizamiz
  setTimeout(()=>{ if(readerPdfDoc) reRenderAllForZoom(); }, 260);
}
function closeAiSheet(){
  document.getElementById('ai-sheet').classList.remove('open');
  document.getElementById('ai-sheet-backdrop').classList.remove('open');
  setTimeout(()=>{ if(readerPdfDoc) reRenderAllForZoom(); }, 260);
}'''

new_ai = '''function openAiSheet(){
  const isDesktopReader = window.matchMedia('(min-width: 900px)').matches;
  document.getElementById('ai-sheet').classList.add('open');
  document.getElementById('ai-sheet-backdrop').classList.add('open');
  document.body.classList.toggle('ai-drawer-open', !isDesktopReader);
  document.getElementById('ai-sheet-title').textContent = activeBook
    ? `${activeBook.title} • ${currentVisiblePage}-sahifa`
    : "Ustoz AI";
  // Faqat desktop split-view reader kengligini o'zgartiradi. Mobile drawer overlay bo'lgani uchun
  // PDF'ni qayta render qilish keraksiz lag va sakrashga sabab bo'ladi.
  if(isDesktopReader){
    setTimeout(()=>{ if(readerPdfDoc) reRenderAllForZoom(); }, 260);
  }
}
function closeAiSheet(){
  const isDesktopReader = window.matchMedia('(min-width: 900px)').matches;
  document.getElementById('ai-sheet').classList.remove('open');
  document.getElementById('ai-sheet-backdrop').classList.remove('open');
  document.body.classList.remove('ai-drawer-open');
  if(isDesktopReader){
    setTimeout(()=>{ if(readerPdfDoc) reRenderAllForZoom(); }, 260);
  }
}'''

if old_ai not in s:
    raise SystemExit('Mobile AI function block not found')
s = s.replace(old_ai, new_ai, 1)

# If a streamed answer is stopped before any text arrives, remove the empty bubble instead of
# leaving an unnecessary "To\'xtatildi" message behind.
old_abort = '''if(err.name === 'AbortError'){
      bubbleEl.innerHTML = marked.parse(bubbleEl.textContent || "To'xtatildi.");
    }else{'''
new_abort = '''if(err.name === 'AbortError'){
      const partialText = (bubbleEl.textContent || '').trim();
      if(partialText){
        bubbleEl.innerHTML = marked.parse(partialText);
      }else{
        typingDiv.remove();
      }
    }else{'''
if old_abort in s:
    s = s.replace(old_abort, new_abort, 1)

mobile_css = r'''

<style id="mathlvl-mobile-reader-ai-fix">
/* MATHLVL_MOBILE_READER_AI_FIX */
@media (max-width: 899px){
  /* Later mobile-nav rules used !important and could make the bottom nav reappear on top of the reader. */
  body.reader-mode .bottom-nav{ display:none !important; }
  body.reader-mode .app{
    max-width:none !important;
    padding:10px 10px max(10px, env(safe-area-inset-bottom, 0px)) !important;
  }
  body.reader-mode #panel-teacher{ margin-top:0 !important; }
  body.reader-mode #panel-teacher > .glass-card{ padding:0 !important; }
  body.reader-mode .reader-header{ margin-bottom:8px !important; }
  body.reader-mode .reader-body{
    height:calc(100dvh - 70px) !important;
    min-height:0 !important;
    border-radius:12px;
  }

  .ai-panel-backdrop{
    position:fixed !important;
    inset:0 !important;
    z-index:10000 !important;
    overscroll-behavior:contain;
    touch-action:none;
  }
  .ai-panel{
    position:fixed !important;
    top:0 !important;
    right:0 !important;
    bottom:auto !important;
    width:min(420px, 92vw) !important;
    height:100dvh !important;
    max-height:100dvh !important;
    z-index:10001 !important;
    padding-top:calc(12px + env(safe-area-inset-top, 0px)) !important;
    padding-right:14px !important;
    padding-bottom:calc(12px + env(safe-area-inset-bottom, 0px)) !important;
    padding-left:14px !important;
    overflow:hidden;
    overscroll-behavior:contain;
  }
  .ai-panel-header{ flex:0 0 auto; }
  .ai-sheet-chat{
    min-height:0 !important;
    flex:1 1 auto !important;
    overscroll-behavior:contain;
    -webkit-overflow-scrolling:touch;
  }
  .ai-panel .chat-input-wrap{
    flex:0 0 auto;
    margin-top:8px !important;
  }
  #ai-sheet-input{
    min-height:48px !important;
    max-height:120px;
    resize:none;
  }
  body.ai-drawer-open{ overflow:hidden !important; }
}

@media (max-width: 600px){
  /* Continue-reading card: the global mobile glow-button width must not overlap the book info. */
  .dash-continue-row{
    display:grid !important;
    grid-template-columns:52px minmax(0,1fr) !important;
    gap:12px !important;
    align-items:center !important;
  }
  .dash-continue-cover{
    grid-column:1 !important;
    grid-row:1 !important;
    width:52px !important;
    height:70px !important;
  }
  .dash-continue-info{
    grid-column:2 !important;
    grid-row:1 !important;
    min-width:0 !important;
  }
  .dash-continue-title{
    overflow-wrap:anywhere;
  }
  #dash-continue-btn{
    grid-column:1 / -1 !important;
    grid-row:2 !important;
    width:100% !important;
    min-width:0 !important;
    margin:0 !important;
  }

  .ai-panel{
    width:100vw !important;
    border-left:0 !important;
  }
  body.reader-mode .reader-body{ height:calc(100dvh - 68px) !important; }
  .reader-floating-bar{ bottom:calc(10px + env(safe-area-inset-bottom, 0px)) !important; }
  .annotation-toolbar,
  .reader-page-popover,
  .annotation-clear-confirm{ bottom:calc(66px + env(safe-area-inset-bottom, 0px)) !important; }
}
</style>
'''

if '</body>' not in s:
    raise SystemExit('Closing body tag not found')
s = s.replace('</body>', mobile_css + '\n</body>', 1)

required = [
    MARKER,
    "body.reader-mode .bottom-nav{ display:none !important; }",
    "height:100dvh !important;",
    "document.body.classList.toggle('ai-drawer-open', !isDesktopReader);",
    "if(isDesktopReader){",
    ".dash-continue-row{",
    "#dash-continue-btn{",
]
for token in required:
    if token not in s:
        raise SystemExit(f'Mobile reader fix missing: {token}')

p.write_text(s, encoding='utf-8')
print('Mobile reader + in-book Ustoz AI + continue card fixes applied.')
