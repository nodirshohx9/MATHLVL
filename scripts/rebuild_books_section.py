from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"

text = INDEX.read_text(encoding="utf-8")

START = '      <div id="book-list-section-outer"'
END = '  <!-- ===== PROFILE'

start = text.find(START)
end = text.find(END, start)

if start < 0 or end < 0:
    raise SystemExit("Books section markers topilmadi; build to'xtatildi.")

replacement = r'''      <div id="book-list-section-outer" data-books-rebuild="1" style="margin-top:0;">
        <div class="library-topbar">
          <div>
            <div class="library-kicker">MATHLVL KUTUBXONASI</div>
            <h3 class="library-heading">Yangi kutubxona tayyorlanmoqda</h3>
            <p class="library-subheading">Kitoblar bo‘limi boshidan qayta qurilmoqda. Yangi katalog shu dizayn asosida joylanadi.</p>
          </div>
          <div class="library-count">YANGILANMOQDA</div>
        </div>

        <div class="books-rebuild-shell">
          <div class="books-rebuild-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5z"/>
              <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5z"/>
            </svg>
          </div>
          <div class="books-rebuild-title">Kitoblar bo‘limi qayta ishlanmoqda</div>
          <div class="books-rebuild-text">Eski katalog vaqtincha olib tashlandi. Yangi bo‘limda darsliklar, qo‘llanmalar va boshqa ruxsatli kitoblar alohida toifalar bilan joylashtiriladi.</div>
        </div>
      </div>
    </div>
  </section>

'''

text = text[:start] + replacement + text[end:]

# Old book search/grid code must not accidentally repopulate the rebuilt shell.
marker = 'function refreshAllBookViews(){'
if marker in text:
    text = text.replace(marker, marker + r'''
  if(document.getElementById('book-list-section-outer')?.dataset.booksRebuild === '1') return;
''', 1)

# Do not trigger the old catalog renderer while the section is being rebuilt.
text = text.replace("    if(tab === 'books') refreshAllBookViews();", "    if(tab === 'books' && !document.getElementById('book-list-section-outer')?.dataset.booksRebuild) refreshAllBookViews();", 1)

# Preserve the existing library visual language while adding a clean temporary state.
style = r'''
<style id="mathlvl-books-rebuild-style">
.books-rebuild-shell{
  min-height:300px;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  text-align:center;
  padding:52px 24px;
  border:1px solid rgba(255,255,255,.075);
  border-radius:18px;
  background:
    radial-gradient(circle at 50% 20%,rgba(123,140,255,.09),transparent 42%),
    #0d121a;
}
.books-rebuild-icon{
  width:64px;height:64px;border-radius:18px;
  display:grid;place-items:center;
  margin-bottom:18px;
  color:#aeb8ff;
  background:rgba(123,140,255,.10);
  border:1px solid rgba(123,140,255,.18);
}
.books-rebuild-icon svg{
  width:29px;height:29px;fill:none;stroke:currentColor;
  stroke-width:1.55;stroke-linecap:round;stroke-linejoin:round;
}
.books-rebuild-title{
  color:#f2f5fb;
  font:750 20px/1.2 var(--font-display);
  letter-spacing:-.025em;
}
.books-rebuild-text{
  max-width:560px;
  margin-top:9px;
  color:#7f899b;
  font-size:13px;
  line-height:1.65;
}
html[data-theme="light"] .books-rebuild-shell{
  background:linear-gradient(145deg,#fff,#f5f8fd);
  border-color:rgba(31,57,104,.10);
}
html[data-theme="light"] .books-rebuild-title{color:#18243c}
html[data-theme="light"] .books-rebuild-text{color:#68758f}
</style>
'''
if 'id="mathlvl-books-rebuild-style"' not in text:
    text = text.replace('</head>', style + '
</head>', 1)

INDEX.write_text(text, encoding="utf-8")
print("MATHLVL books section: eski katalog olib tashlandi, dizayn shell saqlandi.")
