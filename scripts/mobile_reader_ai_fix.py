from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

MARKER = 'MATHLVL_MOBILE_READER_AI_FIX'
PARTIAL_SHEET_MARKER = 'MATHLVL_MOBILE_READER_AI_PARTIAL_SHEET_V2'

partial_sheet_css = r'''

<style id="mathlvl-mobile-reader-ai-partial-sheet-v2">
/* MATHLVL_MOBILE_READER_AI_PARTIAL_SHEET_V2 */
@media (max-width: 899px){
  /* Mobile'da Ustoz AI kitobni to'liq yopmaydi: pastdan chiqadigan partial sheet. */
  .ai-panel-backdrop{
    background:rgba(4,7,11,.24) !important;
    backdrop-filter:blur(2px) !important;
    -webkit-backdrop-filter:blur(2px) !important;
  }

  .ai-panel{
    position:fixed !important;
    top:auto !important;
    left:10px !important;
    right:10px !important;
    bottom:calc(10px + env(safe-area-inset-bottom, 0px)) !important;
    width:auto !important;
    height:clamp(360px, 64dvh, 620px) !important;
    max-height:64dvh !important;
    min-height:0 !important;
    z-index:10001 !important;
    padding:12px 12px calc(12px + env(safe-area-inset-bottom, 0px)) !important;
    border:1px solid rgba(255,255,255,.09) !important;
    border-radius:18px !important;
    background:rgba(13,17,23,.97) !important;
    box-shadow:0 -18px 70px rgba(0,0,0,.42) !important;
    overflow:hidden !important;
    transform:translateY(calc(100% + 28px)) !important;
    transition:transform .24s cubic-bezier(.2,.8,.2,1), opacity .18s ease !important;
    opacity:0;
  }

  .ai-panel.open{
    transform:translateY(0) !important;
    opacity:1;
  }

  .ai-panel-header{
    min-height:42px;
    margin-bottom:8px !important;
    padding:0 2px 8px;
    border-bottom:1px solid rgba(255,255,255,.055);
  }

  .ai-panel-header::before{
    content:"";
    position:absolute;
    top:7px;
    left:50%;
    width:34px;
    height:3px;
    transform:translateX(-50%);
    border-radius:999px;
    background:rgba(255,255,255,.16);
    pointer-events:none;
  }

  .ai-panel-header span{
    padding-top:7px;
    min-width:0;
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
  }

  .ai-sheet-chat{
    min-height:0 !important;
    flex:1 1 auto !important;
    padding:4px 2px 2px !important;
    overscroll-behavior:contain;
    -webkit-overflow-scrolling:touch;
  }

  .ai-panel .chat-input-wrap{
    flex:0 0 auto;
    margin-top:8px !important;
  }

  #ai-sheet-input{
    min-height:46px !important;
    max-height:96px !important;
    resize:none !important;
  }

  body.ai-drawer-open{
    overflow:hidden !important;
  }
}

@media (max-width: 600px){
  .ai-panel{
    left:8px !important;
    right:8px !important;
    bottom:calc(8px + env(safe-area-inset-bottom, 0px)) !important;
    width:auto !important;
    height:clamp(350px, 62dvh, 590px) !important;
    max-height:62dvh !important;
    border-left:1px solid rgba(255,255,255,.09) !important;
  }
}

html[data-theme="light"] .ai-panel{
  background:rgba(255,255,255,.98) !important;
  border-color:rgba(31,45,67,.10) !important;
  box-shadow:0 -18px 60px rgba(42,54,76,.18) !important;
}
html[data-theme="light"] .ai-panel-header{
  border-bottom-color:rgba(31,45,67,.07) !important;
}
html[data-theme="light"] .ai-panel-header::before{
  background:rgba(31,45,67,.16) !important;
}
</style>
'''

# Current production index already contains the original mobile reader fix.
# Add a later override so the build can upgrade that existing UI instead of exiting early.
if MARKER in s:
    if PARTIAL_SHEET_MARKER not in s:
        if '</body>' not in s:
            raise SystemExit('Closing body tag not found')
        s = s.replace('</body>', partial_sheet_css + '\n</body>', 1)
        p.write_text(s, encoding='utf-8')
        print('Existing mobile reader AI upgraded to partial bottom sheet.')
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
# leaving an unnecessary "To'xtatildi" message behind.
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
s = s.replace('</body>', mobile_css + partial_sheet_css + '\n</body>', 1)

required = [
    MARKER,
    PARTIAL_SHEET_MARKER,
    "body.reader-mode .bottom-nav{ display:none !important; }",
    "document.body.classList.toggle('ai-drawer-open', !isDesktopReader);",
    "if(isDesktopReader){",
]
for token in required:
    if token not in s:
        raise SystemExit(f'Mobile reader fix missing: {token}')

p.write_text(s, encoding='utf-8')
print('Mobile reader + partial in-book Ustoz AI applied.')
