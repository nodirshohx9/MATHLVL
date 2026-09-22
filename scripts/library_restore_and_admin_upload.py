from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def patch_index():
    p = ROOT / "index.html"
    s = p.read_text(encoding="utf-8")
    start = s.find('<div id="book-list-section-outer"')
    if start < 0:
        return
    end = s.find('</div>\n    </div>\n  </section>', start)
    if end < 0:
        return
    # Replace only the temporary rebuild block, keeping the surrounding teacher panel intact.
    block_end = end + len('</div>')
    old = s[start:block_end]
    if 'books-rebuild-shell' not in old:
        return

    new = '''<div id="book-list-section-outer" style="margin-top:0;">
        <div class="library-topbar">
          <div>
            <div class="library-kicker">MATHLVL KUTUBXONASI</div>
            <h3 class="library-heading">Matematika kitoblari</h3>
            <p class="library-subheading">Darsliklar, qo‘llanmalar va boshqa ruxsatli kitoblarni bir joyda o‘qing.</p>
          </div>
          <div class="library-count" id="book-search-result-count">0 ta kitob</div>
        </div>

        <div class="library-search-shell">
          <svg class="library-search-icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5"></circle>
            <path d="m16 16 5 5"></path>
          </svg>
          <input id="book-search" type="search" autocomplete="off" placeholder="Kitob, muallif, sinf yoki mavzu qidiring..." aria-label="Kitob qidirish">
          <button class="library-search-clear" id="book-search-clear" type="button" hidden aria-label="Qidiruvni tozalash">×</button>
        </div>

        <div class="library-filter-row" id="library-filter-row" aria-label="Kitob filtrlari">
          <button type="button" class="library-filter active" data-library-filter="ALL">Barchasi</button>
          <button type="button" class="library-filter" data-library-filter="TEXTBOOK">Darsliklar</button>
          <button type="button" class="library-filter" data-library-filter="SUPPLEMENTARY">Qo‘shimcha</button>
          <button type="button" class="library-filter" data-library-filter="FREE">Bepul</button>
          <button type="button" class="library-filter" data-library-filter="PLUS">Plus</button>
          <button type="button" class="library-filter" data-library-filter="PURCHASE">Sotiladi</button>
        </div>

        <div id="book-grid" class="book-grid" aria-live="polite"></div>
      </div>'''

    s = s[:start] + new + s[block_end:]

    # Add the filter styling once.
    marker = '/* ===== MATHLVL v9 — refined library, saved fallback: backup-books-design-a318ee5 ===== */'
    css = r'''
<style id="mathlvl-library-final-style">
.library-filter-row{
  display:flex;
  gap:8px;
  flex-wrap:wrap;
  margin:-8px 0 18px;
}
.library-filter{
  border:1px solid rgba(255,255,255,.075);
  background:#0e131b;
  color:#778295;
  border-radius:999px;
  padding:8px 12px;
  font:650 11.5px/1 var(--font-body);
  cursor:pointer;
  transition:all .16s ease;
}
.library-filter:hover{
  color:#dce2ed;
  border-color:rgba(105,138,255,.32);
  background:#111824;
}
.library-filter.active{
  color:#f3f6fb;
  background:rgba(105,138,255,.12);
  border-color:rgba(105,138,255,.38);
}
.library-empty{
  grid-column:1/-1;
  min-height:220px;
  display:flex;
  align-items:center;
  justify-content:center;
  text-align:center;
  border:1px dashed rgba(255,255,255,.09);
  border-radius:16px;
  color:#7f899b;
  padding:30px;
}
@media(max-width:899px){
  .library-topbar{align-items:flex-start;flex-direction:column;gap:10px}
  .library-filter-row{overflow-x:auto;flex-wrap:nowrap;padding-bottom:2px;scrollbar-width:none}
  .library-filter-row::-webkit-scrollbar{display:none}
  .library-filter{white-space:nowrap;flex:none}
}
</style>
'''
    if 'id="mathlvl-library-final-style"' not in s:
        s = s.replace('</head>', css + '\n</head>', 1)

    # Replace the old "rebuild" guard with a real filter-aware render.
    old_render = '''function renderBookGrid(containerEl, books, {selectable, deletable}){
  containerEl.innerHTML = '';
  updateBookSearchCount(books.length);
  if(books.length === 0){
    containerEl.innerHTML = '<div class="empty-note">Hozircha kitoblar yo\\'q.</div>';
    return;
  }'''
    new_render = '''function renderBookGrid(containerEl, books, {selectable, deletable}){
  if(!containerEl) return;
  containerEl.innerHTML = '';
  updateBookSearchCount(books.length);
  if(books.length === 0){
    containerEl.innerHTML = '<div class="library-empty"><div><div style="font-size:28px;margin-bottom:8px;">📚</div><strong style="display:block;color:#dfe5ef;margin-bottom:5px;">Bu bo‘limda kitob topilmadi</strong><span>Qidiruv yoki filtrni o‘zgartirib ko‘ring.</span></div></div>';
    return;
  }'''
    if old_render in s:
        s = s.replace(old_render, new_render, 1)

    # Add filter-aware search logic before the USTOZ AI block.
    marker2 = '// ================= USTOZ AI (Gulchiroy) CHAT ================='
    patch = r'''
let activeLibraryFilter = 'ALL';

function filterBooksForLibrary(books){
  if(activeLibraryFilter === 'ALL') return books;
  if(activeLibraryFilter === 'FREE' || activeLibraryFilter === 'PLUS' || activeLibraryFilter === 'PURCHASE'){
    return books.filter(b => {
      if(activeLibraryFilter === 'PURCHASE') return b.accessType === 'PURCHASE' || b.accessType === 'PLUS_OR_PURCHASE';
      return b.accessType === activeLibraryFilter || (activeLibraryFilter === 'PLUS' && b.accessType === 'PLUS_OR_PURCHASE');
    });
  }
  return books.filter(b => (b.bookType || 'TEXTBOOK') === activeLibraryFilter);
}

function runLibraryFilters(){
  if(!bookSearchInput) return;
  const searched = filterBooksBySearch(booksCache, bookSearchInput.value);
  const filtered = filterBooksForLibrary(searched);
  renderBookGrid(document.getElementById('book-grid'), filtered, { selectable:true, deletable:false });
  if(bookSearchClear) bookSearchClear.hidden = !bookSearchInput.value.trim();
}

document.querySelectorAll('.library-filter[data-library-filter]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    activeLibraryFilter = btn.dataset.libraryFilter || 'ALL';
    document.querySelectorAll('.library-filter[data-library-filter]').forEach(b=>{
      b.classList.toggle('active', b === btn);
    });
    runLibraryFilters();
  });
});
if(bookSearchInput){
  bookSearchInput.addEventListener('input', runLibraryFilters);
}
if(bookSearchClear){
  bookSearchClear.addEventListener('click', ()=>{
    bookSearchInput.value = '';
    runLibraryFilters();
    bookSearchInput.focus();
  });
}

'''
    if marker2 in s and 'let activeLibraryFilter = ' not in s:
        s = s.replace(marker2, patch + marker2, 1)

    # Prevent the earlier search listener from rendering without the category filter.
    old_listener = '''if(bookSearchInput){
  bookSearchInput.addEventListener('input', runBookSearch);
}'''
    if old_listener in s:
        s = s.replace(old_listener, '''// Library search is handled by runLibraryFilters() above.''', 1)

    p.write_text(s, encoding="utf-8")

def patch_admin():
    p = ROOT / "admin.html"
    s = p.read_text(encoding="utf-8")

    pdf_old = '''<div class="field">
                <label class="req" for="admin-pdf">PDF fayli</label>
                <input type="file" id="admin-pdf" accept="application/pdf">
                <div id="pdf-state-box"></div>
                <div class="err-text">PDF faylni tanlang.</div>
              </div>

              <div class="field">
                <label for="admin-cover">Muqova (rasm)</label>
                <input type="file" id="admin-cover" accept="image/*">
                <div id="cover-preview-box"></div>
              </div>'''
    pdf_new = '''<div class="admin-upload-grid">
                <div class="field admin-upload-field">
                  <label class="req">Kitob PDF</label>
                  <label class="admin-dropzone" for="admin-pdf" id="admin-pdf-drop">
                    <span class="admin-drop-icon">PDF</span>
                    <span class="admin-drop-title" id="admin-pdf-name">PDF faylni tanlang</span>
                    <span class="admin-drop-hint">Bosish yoki faylni shu yerga tashlash · max 200 MB</span>
                  </label>
                  <input type="file" id="admin-pdf" accept="application/pdf" hidden>
                  <div id="pdf-state-box"></div>
                  <div class="err-text">PDF faylni tanlang.</div>
                </div>

                <div class="field admin-upload-field">
                  <label>Muqova</label>
                  <label class="admin-dropzone" for="admin-cover" id="admin-cover-drop">
                    <span class="admin-drop-icon">IMG</span>
                    <span class="admin-drop-title" id="admin-cover-name">Muqova rasmini tanlang</span>
                    <span class="admin-drop-hint">JPG, PNG yoki WebP · tavsiya 3:4</span>
                  </label>
                  <input type="file" id="admin-cover" accept="image/*" hidden>
                  <div id="cover-preview-box"></div>
                </div>
              </div>'''
    if pdf_old in s:
        s = s.replace(pdf_old, pdf_new, 1)

    css = r'''
<style id="mathlvl-admin-library-style">
.admin-upload-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:4px 0 2px}
.admin-dropzone{
  min-height:132px;
  padding:18px;
  border:1px dashed rgba(115,128,255,.30);
  border-radius:14px;
  background:linear-gradient(145deg,rgba(115,128,255,.07),rgba(255,255,255,.018));
  display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;
  cursor:pointer;transition:all .16s ease;
}
.admin-dropzone:hover,.admin-dropzone.dragover{
  border-color:rgba(115,128,255,.68);
  background:rgba(115,128,255,.11);
  transform:translateY(-1px);
}
.admin-drop-icon{
  width:38px;height:38px;border-radius:10px;display:grid;place-items:center;
  margin-bottom:9px;background:rgba(115,128,255,.12);color:#aeb7ff;
  font:800 10px/1 var(--font-mono);letter-spacing:.04em;
}
.admin-drop-title{font-weight:750;font-size:13px;color:#edf1f7}
.admin-drop-hint{margin-top:5px;color:#737f91;font-size:10.5px;line-height:1.45}
.admin-upload-field>.err-text{margin-top:6px}
.admin-upload-field #pdf-state-box:empty{display:none}
@media(max-width:720px){.admin-upload-grid{grid-template-columns:1fr}}
</style>
'''
    if 'id="mathlvl-admin-library-style"' not in s:
        s=s.replace('</head>',css+'\n</head>',1)

    js = r'''
<script id="mathlvl-admin-library-upload-js">
(function(){
  function wireDrop(inputId, zoneId, nameId){
    const input=document.getElementById(inputId), zone=document.getElementById(zoneId), name=document.getElementById(nameId);
    if(!input||!zone||!name) return;
    input.addEventListener('change',()=>{
      const f=input.files && input.files[0];
      if(f){
        name.textContent=f.name;
        zone.classList.add('has-file');
      }
    });
    ['dragenter','dragover'].forEach(ev=>zone.addEventListener(ev,e=>{
      e.preventDefault(); zone.classList.add('dragover');
    }));
    ['dragleave','drop'].forEach(ev=>zone.addEventListener(ev,e=>{
      e.preventDefault(); zone.classList.remove('dragover');
    }));
    zone.addEventListener('drop',e=>{
      const f=e.dataTransfer.files && e.dataTransfer.files[0];
      if(!f) return;
      const dt=new DataTransfer(); dt.items.add(f); input.files=dt.files;
      input.dispatchEvent(new Event('change',{bubbles:true}));
    });
  }
  wireDrop('admin-pdf','admin-pdf-drop','admin-pdf-name');
  wireDrop('admin-cover','admin-cover-drop','admin-cover-name');
})();
</script>
'''
    if 'id="mathlvl-admin-library-upload-js"' not in s:
        s=s.replace('</body>',js+'\n</body>',1)

    p.write_text(s,encoding="utf-8")

patch_index()
patch_admin()
print("MATHLVL library + admin upload UI tayyor.")
