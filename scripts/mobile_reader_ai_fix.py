from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

MARKER = 'MATHLVL_READER_AI_INSTANT_V3'

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
  const sheet = document.getElementById('ai-sheet');
  const backdrop = document.getElementById('ai-sheet-backdrop');
  const title = document.getElementById('ai-sheet-title');
  const isMobileReader = window.matchMedia('(max-width: 899px)').matches;

  // Panelni PDF qayta renderini kutmasdan darhol ko'rsatamiz.
  sheet.classList.add('open');
  backdrop.classList.add('open');
  document.body.classList.toggle('ai-drawer-open', isMobileReader);

  title.textContent = activeBook
    ? `${activeBook.title} • ${currentVisiblePage}-sahifa`
    : "Ustoz AI";
}
function closeAiSheet(){
  document.getElementById('ai-sheet').classList.remove('open');
  document.getElementById('ai-sheet-backdrop').classList.remove('open');
  document.body.classList.remove('ai-drawer-open');
}'''

if old_ai in s:
    s = s.replace(old_ai, new_ai, 1)
else:
    # If the function was already upgraded in a future source snapshot, do not fail the build.
    if 'function openAiSheet(){' not in s or 'function closeAiSheet(){' not in s:
        raise SystemExit('Reader AI function block not found')

# If a stopped answer has no text yet, remove the empty bubble instead of showing junk.
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

css = r'''

<style id="mathlvl-reader-ai-instant-v3">
/* MATHLVL_READER_AI_INSTANT_V3 */

/* Reader ichidagi Ustoz AI ochilishi hech qanday PDF re-render yoki og'ir layoutni kutmaydi. */
body.reader-mode .reader-body{ position:relative; }

@media (min-width:900px){
  /* Desktop: panel overlay bo'lib chiqadi, shuning uchun PDF kengligini qayta hisoblash shart emas. */
  body.reader-mode .ai-panel{
    display:flex !important;
    position:absolute !important;
    top:0 !important;
    right:0 !important;
    bottom:0 !important;
    left:auto !important;
    width:min(360px,34vw) !important;
    height:auto !important;
    z-index:90 !important;
    border-left:1px solid rgba(255,255,255,.08) !important;
    border-radius:14px 0 0 14px !important;
    background:rgba(13,17,23,.985) !important;
    box-shadow:-18px 0 55px rgba(0,0,0,.30) !important;
    transform:translateX(102%) !important;
    opacity:0 !important;
    visibility:hidden !important;
    pointer-events:none !important;
    transition:transform .10s ease-out, opacity .08s linear, visibility 0s linear .10s !important;
  }
  body.reader-mode .ai-panel.open{
    transform:translateX(0) !important;
    opacity:1 !important;
    visibility:visible !important;
    pointer-events:auto !important;
    transition:transform .10s ease-out, opacity .08s linear !important;
  }
  body.reader-mode .ai-panel-backdrop{ display:none !important; }
}

@media (max-width:899px){
  body.reader-mode .bottom-nav{ display:none !important; }
  body.reader-mode .app{
    max-width:none !important;
    padding:10px 10px max(10px,env(safe-area-inset-bottom,0px)) !important;
  }
  body.reader-mode #panel-teacher{ margin-top:0 !important; }
  body.reader-mode #panel-teacher > .glass-card{ padding:0 !important; }
  body.reader-mode .reader-header{ margin-bottom:8px !important; }
  body.reader-mode .reader-body{
    height:calc(100dvh - 70px) !important;
    min-height:0 !important;
    border-radius:12px !important;
  }

  .ai-panel-backdrop{
    position:fixed !important;
    inset:0 !important;
    z-index:10000 !important;
    background:rgba(4,7,11,.22) !important;
    backdrop-filter:blur(2px) !important;
    -webkit-backdrop-filter:blur(2px) !important;
  }

  body.reader-mode .ai-panel{
    display:flex !important;
    position:fixed !important;
    top:auto !important;
    left:8px !important;
    right:8px !important;
    bottom:calc(8px + env(safe-area-inset-bottom,0px)) !important;
    width:auto !important;
    height:clamp(350px,62dvh,590px) !important;
    max-height:62dvh !important;
    min-height:0 !important;
    z-index:10001 !important;
    padding:12px 12px calc(12px + env(safe-area-inset-bottom,0px)) !important;
    border:1px solid rgba(255,255,255,.09) !important;
    border-radius:18px !important;
    background:rgba(13,17,23,.985) !important;
    box-shadow:0 -18px 70px rgba(0,0,0,.40) !important;
    overflow:hidden !important;
    transform:translateY(calc(100% + 22px)) !important;
    opacity:0 !important;
    visibility:hidden !important;
    pointer-events:none !important;
    transition:transform .10s ease-out, opacity .08s linear, visibility 0s linear .10s !important;
  }
  body.reader-mode .ai-panel.open{
    transform:translateY(0) !important;
    opacity:1 !important;
    visibility:visible !important;
    pointer-events:auto !important;
    transition:transform .10s ease-out, opacity .08s linear !important;
  }
  .ai-panel-header{
    flex:0 0 auto;
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
    min-width:0;
    padding-top:7px;
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
  body.ai-drawer-open{ overflow:hidden !important; }
}

html[data-theme="light"] body.reader-mode .ai-panel{
  background:rgba(255,255,255,.985) !important;
  border-color:rgba(31,45,67,.10) !important;
  box-shadow:-16px 0 50px rgba(42,54,76,.15) !important;
}
@media(max-width:899px){
  html[data-theme="light"] body.reader-mode .ai-panel{
    box-shadow:0 -18px 60px rgba(42,54,76,.17) !important;
  }
}
</style>
'''

if MARKER not in s:
    if '</body>' not in s:
        raise SystemExit('Closing body tag not found')
    s = s.replace('</body>', css + '\n</body>', 1)

required = [
    'function openAiSheet(){',
    "sheet.classList.add('open');",
    MARKER,
    'transition:transform .10s ease-out',
]
for token in required:
    if token not in s:
        raise SystemExit(f'Reader AI instant fix missing: {token}')

p.write_text(s, encoding='utf-8')
print('In-book Ustoz AI now opens instantly on mobile and desktop.')
