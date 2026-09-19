from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

MARKER = 'MATHLVL_READER_PAGE_INDICATOR_BOOTSTRAP_V1'

old = '''  window.__mathlvlUpdatePageIndicator();
}

// ---- IntersectionObserver: qaysi sahifa render qilinishi va joriy sahifa kuzatuvi ----'''
new = '''  // buildPageContainers() can run before the later reader helper assignment.
  // Bootstrap the helper here so PDF rendering is never aborted by a missing function.
  if(typeof window.__mathlvlUpdatePageIndicator !== 'function'){
    window.__mathlvlUpdatePageIndicator = function(){
      const el = document.getElementById('reader-page-text-desktop');
      if(el) el.textContent = readerNumPages ? String(currentVisiblePage) + ' / ' + String(readerNumPages) : '— / —';
    };
  }
  window.__mathlvlUpdatePageIndicator();
}

// ---- IntersectionObserver: qaysi sahifa render qilinishi va joriy sahifa kuzatuvi ----'''

if MARKER not in s:
    if old not in s:
        raise SystemExit('buildPageContainers indicator call not found')
    s = s.replace(old, new, 1)
    s = s.replace('</body>', '<script id="' + MARKER + '"></script>\n</body>', 1)

p.write_text(s, encoding='utf-8')
print('Reader page-indicator bootstrap applied.')
