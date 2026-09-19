from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

MARKER = 'MATHLVL_READER_PAGE_INDICATOR_BOOTSTRAP_V2'
if MARKER in s:
    print('Reader page-indicator bootstrap already applied.')
    raise SystemExit(0)

start = s.find('function buildPageContainers(){')
end = s.find('// ---- IntersectionObserver: qaysi sahifa render qilinishi va joriy sahifa kuzatuvi ----', start)
if start < 0 or end < 0:
    raise SystemExit('buildPageContainers block not found')

block = s[start:end]
call = '  window.__mathlvlUpdatePageIndicator();'
bootstrap = '''  // PDF reader can build page containers before the helper assignment below.
  // Define a safe bootstrap here so one missing helper cannot abort PDF rendering.
  if(typeof window.__mathlvlUpdatePageIndicator !== 'function'){
    window.__mathlvlUpdatePageIndicator = function(){
      const el = document.getElementById('reader-page-text-desktop');
      if(el) el.textContent = readerNumPages ? String(currentVisiblePage) + ' / ' + String(readerNumPages) : '— / —';
    };
  }
  window.__mathlvlUpdatePageIndicator();'''

if call not in block:
    raise SystemExit('page indicator call not found inside buildPageContainers')

block = block.replace(call, bootstrap, 1)
s = s[:start] + block + s[end:]
s = s.replace('</body>', '<script id="' + MARKER + '"></script>\n</body>', 1)

p.write_text(s, encoding='utf-8')
print('Reader page-indicator bootstrap applied.')
