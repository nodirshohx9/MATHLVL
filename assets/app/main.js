
const API_URL = "/api/chat"; // xavfsiz backend orqali - API kalit shu yerda ko'rinmaydi

// ---------- Starfield ----------
const starsEl = document.getElementById('stars');
for(let i=0;i<80;i++){
  const s = document.createElement('span');
  s.style.left = Math.random()*100 + '%';
  s.style.top = Math.random()*100 + '%';
  s.style.animationDelay = (Math.random()*4) + 's';
  const size = (Math.random()*1.6 + 1).toFixed(1);
  s.style.width = size + 'px'; s.style.height = size + 'px';
  starsEl.appendChild(s);
}

// ---------- Floating geometric formulas/shapes ----------
const shapes = [
  `<svg width="46" height="46" viewBox="0 0 46 46"><circle cx="23" cy="23" r="18" stroke="#3DA9FC" stroke-width="1.6" fill="none"/></svg>`,
  `<svg width="46" height="46" viewBox="0 0 46 46"><polygon points="23,4 42,40 4,40" stroke="#FFC93C" stroke-width="1.6" fill="none"/></svg>`,
  `<svg width="40" height="40" viewBox="0 0 40 40"><rect x="6" y="6" width="28" height="28" stroke="#3DA9FC" stroke-width="1.6" fill="none" transform="rotate(20 20 20)"/></svg>`,
  `<svg width="52" height="34" viewBox="0 0 52 34"><text x="0" y="26" font-family="Sora" font-size="30" fill="#FFC93C">π</text></svg>`,
  `<svg width="52" height="34" viewBox="0 0 52 34"><text x="0" y="26" font-family="Sora" font-size="28" fill="#3DA9FC">Σ</text></svg>`,
  `<svg width="60" height="34" viewBox="0 0 60 34"><text x="0" y="26" font-family="Sora" font-size="24" fill="#FFC93C">√x</text></svg>`,
  `<svg width="60" height="34" viewBox="0 0 60 34"><text x="0" y="26" font-family="Sora" font-size="24" fill="#3DA9FC">∞</text></svg>`,
  `<svg width="60" height="30" viewBox="0 0 60 30"><text x="0" y="24" font-family="Sora" font-size="22" fill="#FFC93C">x²+y²</text></svg>`
];
const floatersEl = document.getElementById('floaters');
const positions = [
  [4,10],[88,8],[10,70],[80,60],[45,4],[65,85],[20,40],[92,35],[35,90],[55,22]
];
positions.forEach((pos, i)=>{
  const wrap = document.createElement('div');
  wrap.className = 'floater' + (i % 2 === 0 ? '' : ' gold');
  wrap.style.left = pos[0] + '%';
  wrap.style.top = pos[1] + '%';
  wrap.style.animationDuration = (14 + Math.random()*10).toFixed(1) + 's';
  wrap.style.animationDelay = (Math.random()*-10).toFixed(1) + 's';
  wrap.innerHTML = shapes[i % shapes.length];
  floatersEl.appendChild(wrap);
});

// ---------- Tabs ----------
const tabTitles = { home:'Bosh sahifa', teacher:'Ustoz AI', books:'Kitoblar', mocktest:'Mock Test', profile:'Profil' };
function activateTab(tab){
  document.querySelectorAll('.sidebar-nav-item[data-sidebar-tab]').forEach(b=> b.classList.toggle('active', b.dataset.sidebarTab === tab));
  document.querySelectorAll('.bottom-nav-item[data-tab]').forEach(b=> b.classList.toggle('active', b.dataset.tab === tab));
  if(tab === 'profile'){ document.getElementById('bottom-nav-profile').classList.add('active'); }
  document.querySelectorAll('.panel').forEach(p=> p.classList.remove('active'));
  document.body.classList.remove('reader-mode', 'ai-drawer-open');
  document.getElementById('teacher-layout').classList.remove('book-mode');
  closeAiSheet();
  document.getElementById('book-list-section-outer').hidden = tab !== 'books';
  document.querySelector('#teacher-layout .book-col').hidden = tab !== 'books';
  document.querySelector('#teacher-layout .chat-col').hidden = tab !== 'teacher';

  if(tab === 'books' || tab === 'teacher'){
    const panel = document.getElementById('panel-teacher');
    panel.classList.add('active');
    panel.classList.toggle('view-books', tab === 'books');
    panel.classList.toggle('view-teacher', tab === 'teacher');
    document.getElementById('panel-teacher-title').textContent = tab === 'books' ? 'Kitoblar' : 'Ustoz AI';
    document.getElementById('panel-teacher-sub').textContent = tab === 'books'
      ? "Matematika kitoblaridan birini tanlab o'qishni boshlang."
      : "Savol bering, birga tushuning va mashq qiling.";
    if(tab === 'books' && !document.getElementById('book-list-section-outer')?.dataset.booksRebuild) refreshAllBookViews();
  }else{
    const panel = document.getElementById('panel-' + tab);
    if(panel) panel.classList.add('active');
  }
  window.scrollTo(0,0);
}
document.querySelectorAll('.sidebar-nav-item[data-sidebar-tab]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    activateTab(btn.dataset.sidebarTab);
    if(btn.dataset.scrollTo){
      setTimeout(()=>{
        const el = document.getElementById(btn.dataset.scrollTo);
        if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
      }, 60);
    }
  });
});
document.querySelectorAll('.bottom-nav-item[data-tab]').forEach(btn=>{
  btn.addEventListener('click', ()=> activateTab(btn.dataset.tab));
});
document.getElementById('bottom-nav-profile').addEventListener('click', ()=> activateTab('profile'));
document.getElementById('sidebar-logo-btn').addEventListener('click', ()=> activateTab('home'));

// ---------- Helper: call Claude API ----------
async function callMathlvlAI({system, messages, tools, max_tokens, mode}){
  const body = { max_tokens: max_tokens || 1000, system, messages };
  if(tools) body.tools = tools;
  if(mode) body.mode = mode;

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const payload = await res.json().catch(()=> ({}));
  if(!res.ok){
    const err = new Error(payload?.error || ("So'rovda xatolik: " + res.status));
    err.status = res.status;
    throw err;
  }
  return payload;
}
function extractText(data){
  return (data.content || []).map(b => b.type === 'text' ? b.text : '').filter(Boolean).join('\n');
}
function stripFences(text){ return text.replace(/```json/g,'').replace(/```/g,'').trim(); }
function escapeHtml(str){ const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

// ---------- Image upload (Solve) ----------
let solveImageBase64 = null;
let solveImageMedia = null;

const solveDrop = document.getElementById('solve-drop');
const solveFile = document.getElementById('solve-file');
const solveClear = document.getElementById('solve-clear');
const solveUploadEmpty = document.getElementById('solve-upload-empty');
const solveImagePreview = document.getElementById('solve-image-preview');
const solvePreviewImg = document.getElementById('solve-preview-img');
const solveImageName = document.getElementById('solve-image-name');
const solveImageMeta = document.getElementById('solve-image-meta');
const solveStatusEl = document.getElementById('solve-status');

function formatSolveBytes(bytes){
  if(!Number.isFinite(bytes) || bytes <= 0) return '';
  if(bytes < 1024) return bytes + ' B';
  if(bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function resetSolveImage(){
  solveImageBase64 = null;
  solveImageMedia = null;
  solveFile.value = '';
  solveDrop.classList.remove('has-image','is-processing');
  solveUploadEmpty.hidden = false;
  solveImagePreview.hidden = true;
  solvePreviewImg.removeAttribute('src');
  solveImageName.textContent = 'Rasm tayyor';
  solveImageMeta.textContent = '';
}

function fileToDataUrl(file){
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onload = ()=> resolve(reader.result);
    reader.onerror = ()=> reject(new Error("Rasmni o'qib bo'lmadi."));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(src){
  return new Promise((resolve,reject)=>{
    const img = new Image();
    img.onload = ()=> resolve(img);
    img.onerror = ()=> reject(new Error("Rasm formatini o'qib bo'lmadi."));
    img.src = src;
  });
}

function canvasToBlob(canvas, type, quality){
  return new Promise((resolve,reject)=>{
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Rasmni tayyorlab bo'lmadi.")), type, quality);
  });
}

async function prepareSolveImage(file){
  const allowed = new Set(['image/jpeg','image/png','image/webp']);
  if(!allowed.has(file.type)){
    throw new Error('Faqat JPG, PNG yoki WebP rasm yuklang.');
  }
  if(file.size > 12 * 1024 * 1024){
    throw new Error('Rasm juda katta. 12 MB dan kichik rasm tanlang.');
  }

  const sourceUrl = await fileToDataUrl(file);
  const image = await loadImageElement(sourceUrl);

  const maxSide = 1800;
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
  const width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
  const height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha:false });
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0,0,width,height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image,0,0,width,height);

  let quality = .90;
  let blob = await canvasToBlob(canvas,'image/jpeg',quality);

  // Keep the base64 request comfortably below server request limits.
  while(blob.size > 2.35 * 1024 * 1024 && quality > .62){
    quality -= .08;
    blob = await canvasToBlob(canvas,'image/jpeg',quality);
  }

  if(blob.size > 2.7 * 1024 * 1024){
    throw new Error('Rasmni yetarlicha kichraytirib bo‘lmadi. Boshqa rasm tanlang.');
  }

  const dataUrl = await fileToDataUrl(blob);
  return {
    dataUrl,
    base64:dataUrl.split(',')[1],
    mediaType:'image/jpeg',
    bytes:blob.size,
    width,
    height
  };
}

solveFile.addEventListener('change', async (e)=>{
  const file = e.target.files?.[0];
  if(!file) return;

  solveStatusEl.classList.remove('err');
  solveStatusEl.textContent = 'Rasm tayyorlanmoqda...';
  solveDrop.classList.add('is-processing');

  try{
    const prepared = await prepareSolveImage(file);
    solveImageBase64 = prepared.base64;
    solveImageMedia = prepared.mediaType;

    solvePreviewImg.src = prepared.dataUrl;
    solveImageName.textContent = file.name || 'Masala rasmi';
    solveImageMeta.textContent = prepared.width + '×' + prepared.height + ' • ' + formatSolveBytes(prepared.bytes);
    solveUploadEmpty.hidden = true;
    solveImagePreview.hidden = false;
    solveDrop.classList.add('has-image');
    solveStatusEl.textContent = '';
  }catch(err){
    resetSolveImage();
    solveStatusEl.textContent = err.message || 'Rasmni yuklab bo‘lmadi.';
    solveStatusEl.classList.add('err');
  }finally{
    solveDrop.classList.remove('is-processing');
  }
});

solveClear.addEventListener('click', (e)=>{
  e.preventDefault();
  e.stopPropagation();
  resetSolveImage();
  solveStatusEl.textContent = '';
  solveStatusEl.classList.remove('err');
});

function stripJsonFence(text){
  return String(text || '')
    .replace(/^```(?:json)?\s*/i,'')
    .replace(/\s*```$/,'')
    .trim();
}

function repairSolveJson(text){
  let s = String(text || '').trim();

  // LaTeX commands such as \frac or \pmod are not valid JSON escapes unless
  // the backslash itself is escaped. Repair only invalid JSON escape sequences.
  s = s.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');

  // Models can occasionally put a literal line break inside a JSON string.
  // Escape those line breaks without touching structural whitespace.
  let out = '';
  let inString = false;
  let escaped = false;
  for(let i = 0; i < s.length; i++){
    const ch = s[i];

    if(inString){
      if(escaped){
        out += ch;
        escaped = false;
        continue;
      }
      if(ch === '\\'){
        out += ch;
        escaped = true;
        continue;
      }
      if(ch === '"'){
        inString = false;
        out += ch;
        continue;
      }
      if(ch === '\n'){
        out += '\\n';
        continue;
      }
      if(ch === '\r'){
        continue;
      }
      out += ch;
      continue;
    }

    if(ch === '"') inString = true;
    out += ch;
  }
  return out;
}

function parseSolvePayload(raw){
  const cleaned = stripJsonFence(raw);
  if(!cleaned) throw new Error('AI bo‘sh javob qaytardi.');

  const candidates = [cleaned];
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if(start !== -1 && end > start){
    candidates.push(cleaned.slice(start, end + 1));
  }

  let parsed = null;
  for(const candidate of candidates){
    try{
      parsed = JSON.parse(candidate);
      break;
    }catch{}

    try{
      parsed = JSON.parse(repairSolveJson(candidate));
      break;
    }catch{}
  }

  if(!parsed || typeof parsed !== 'object'){
    throw new Error('AI javobini to‘g‘ri formatda o‘qib bo‘lmadi. Qayta urinib ko‘ring.');
  }

  let steps = Array.isArray(parsed.steps) ? parsed.steps : [];
  steps = steps
    .map(v=>{
      if(typeof v === 'string') return v.trim();
      if(v && typeof v === 'object'){
        return String(v.text || v.step || v.explanation || '').trim();
      }
      return String(v || '').trim();
    })
    .filter(Boolean)
    .slice(0, 20);

  const answer = String(
    parsed.answer ??
    parsed.final_answer ??
    parsed.finalAnswer ??
    parsed.result ??
    ''
  ).trim();

  if(!steps.length && !answer){
    throw new Error('AI javobida yechim topilmadi. Qayta urinib ko‘ring.');
  }

  return { steps, answer };
}

function renderSolveMath(el){
  try{
    renderMathInElement(el, {
      delimiters: [
        {left: "$$", right: "$$", display: true},
        {left: "$", right: "$", display: false}
      ],
      throwOnError:false
    });
  }catch(e){}
}

// ---------- SOLVE ----------
document.getElementById('solve-btn').addEventListener('click', async ()=>{
  const textEl = document.getElementById('solve-text');
  const text = textEl.value.trim();
  const statusEl = document.getElementById('solve-status');
  const resultEl = document.getElementById('solve-result');
  const stepsEl = document.getElementById('solve-steps');
  const finalEl = document.getElementById('solve-final');
  const btn = document.getElementById('solve-btn');
  const btnLabel = btn.querySelector('.solve-btn-label');

  if(!text && !solveImageBase64){
    statusEl.textContent = "Masala matnini yozing yoki rasmini yuklang.";
    statusEl.classList.add('err');
    textEl.focus();
    return;
  }

  statusEl.classList.remove('err');
  statusEl.textContent = "Masala tahlil qilinmoqda...";
  resultEl.classList.remove('show');
  stepsEl.innerHTML = '';
  finalEl.innerHTML = '';
  btn.disabled = true;
  btn.classList.add('is-loading');
  if(btnLabel) btnLabel.textContent = 'Yechilmoqda...';

  const content = [];
  if(solveImageBase64){
    content.push({
      type:"image",
      source:{ type:"base64", media_type:solveImageMedia, data:solveImageBase64 }
    });
  }
  content.push({
    type:"text",
    text:text || "Rasmdagi matematik masala yoki misolni o‘zbek tilida yeching."
  });

  const system = `Sen MATHLVL platformasidagi kuchli matematika masala yechuvchi yordamchisan.
Foydalanuvchi yuborgan masalani avval ichingda to‘liq yech, keyin natijani mustaqil ravishda qayta tekshir.
Katta darajalar, modullar, tenglamalar, geometriya, kombinatorika va uzun ko‘p bosqichli masalalarda shoshilma:
- har bir algebraik o‘tish matematik jihatdan to‘g‘ri bo‘lsin;
- modul masalalarida Fermat/Euler yoki son tartibini to‘g‘ri qo‘lla;
- taxminiy natijani aniq natija deb yozma;
- yakuniy javobni imkon bo‘lsa ikkinchi usul yoki tez tekshiruv bilan tasdiqla.
Yechimni o‘zbek tilida, kerakli miqdorda aniq va tushunarli qadamlar bilan yoz.
Matematik ifodalarni LaTeX ko‘rinishida $...$ yoki $...$ ichida yoz.
JAVOB FAQAT valid JSON bo‘lsin:
{"steps":["1-qadam matni","2-qadam matni"],"answer":"yakuniy javob"}
JSON stringlaridagi LaTeX backslashlarini JSON qoidasi bo‘yicha to‘g‘ri escape qil.
Markdown code fence, JSON tashqarisida matn, sarlavha yoki izoh yozma.`;

  try{
    const data = await callMathlvlAI({
      system,
      messages:[{ role:"user", content }],
      max_tokens:6000,
      mode:'solve'
    });

    const parsed = parseSolvePayload(extractText(data));

    parsed.steps.forEach((stepText,i)=>{
      const div = document.createElement('div');
      div.className = 'step';
      div.innerHTML = '<div class="step-num">' + (i + 1) + '</div><div class="step-text"></div>';
      const body = div.querySelector('.step-text');
      body.textContent = stepText;
      renderSolveMath(body);
      stepsEl.appendChild(div);
    });

    if(parsed.answer){
      finalEl.style.display = '';
      const label = document.createElement('b');
      label.textContent = 'Javob: ';
      const answerSpan = document.createElement('span');
      answerSpan.textContent = parsed.answer;
      finalEl.append(label,answerSpan);
      renderSolveMath(finalEl);
    }else{
      finalEl.style.display = 'none';
    }

    resultEl.classList.add('show');
    statusEl.textContent = '';
    window.setTimeout(()=>{
      resultEl.scrollIntoView({ behavior:'smooth', block:'nearest' });
    },80);
  }catch(err){
    let message = "Nimadir xato ketdi. Qayta urinib ko‘ring.";
    if(err?.status === 401) message = "Masala yechish uchun avval hisobingizga kiring.";
    else if(err?.status === 429) message = err.message || "So‘rovlar limiti tugadi. Birozdan keyin urinib ko‘ring.";
    else if(err?.status === 413) message = "Rasm hajmi juda katta. Kichikroq rasm yuklang.";
    else if(err?.message && !String(err.message).startsWith("So'rovda xatolik")) message = err.message;

    statusEl.textContent = message;
    statusEl.classList.add('err');
  }finally{
    btn.disabled = false;
    btn.classList.remove('is-loading');
    if(btnLabel) btnLabel.textContent = 'Yechishni boshlash';
  }
});

document.getElementById('solve-text').addEventListener('keydown',(e)=>{
  if((e.ctrlKey || e.metaKey) && e.key === 'Enter'){
    e.preventDefault();
    document.getElementById('solve-btn').click();
  }
});

// ================= BOOKS (shared storage) =================
let booksCache = [];
let activeBook = null;

let booksLoadError = '';
async function loadBooks(){
  try{
    const res = await fetch('/api/books', {signal: AbortSignal.timeout(20000)});
    if(!res.ok) throw new Error('Kitoblar yuklanmadi. Qayta urinib ko‘ring.');
    const data = await res.json();
    if(!Array.isArray(data.books)) throw new Error('Kitoblar ro‘yxatini olib bo‘lmadi.');
    booksLoadError = '';
    booksCache = data.books;
    return booksCache;
  }catch(e){ booksLoadError = 'Kitoblar yuklanmadi. Internetni tekshirib, qayta urinib ko‘ring.'; return []; }
}

// O‘qish jarayoni qurilmada saqlanmaydi. Eski local progress tozalanadi.
try{ localStorage.removeItem('nova_book_progress'); }catch(e){}

function getBookAccessPresentation(book){
  const access = book.accessType || 'FREE';
  if(access === 'FREE'){
    return { cls:'free', label:'Bepul' };
  }
  if(access === 'PLUS'){
    return { cls:'plus', label:'MATHLVL Plus' };
  }
  if(access === 'PURCHASE'){
    const price = Number(book.price || 0);
    return {
      cls:'purchase',
      label: price ? price.toLocaleString('uz-UZ') + " so'm" : 'Alohida sotiladi'
    };
  }
  const price = Number(book.price || 0);
  return {
    cls:'plus-purchase',
    label: price ? 'Plus yoki ' + price.toLocaleString('uz-UZ') + " so'm" : 'Plus yoki xarid'
  };
}

function renderBookGrid(containerEl, books, {selectable, deletable}){
  if(!containerEl) return;
  containerEl.innerHTML = '';
  if(booksLoadError){
    const message = document.createElement('p'); message.textContent = booksLoadError;
    const retry = document.createElement('button'); retry.className = 'ghost-btn'; retry.textContent = 'Qayta urinish'; retry.onclick = refreshAllBookViews;
    containerEl.append(message, retry); return;
  }
  updateBookSearchCount(books.length);
  if(books.length === 0){
    containerEl.innerHTML = '<div class="library-empty"><div><div style="font-size:28px;margin-bottom:8px;">📚</div><strong style="display:block;color:#dfe5ef;margin-bottom:5px;">Bu bo‘limda kitob topilmadi</strong><span>Qidiruv yoki filtrni o‘zgartirib ko‘ring.</span></div></div>';
    return;
  }

  books.forEach(b=>{
    const card = document.createElement('article');
    card.className = 'book-card';
    card.tabIndex = selectable ? 0 : -1;

    const access = getBookAccessPresentation(b);
    const grade = b.grade && b.grade !== 'ALL' ? escapeHtml(b.grade) : '';
    const subject = b.subject ? escapeHtml(b.subject) : '';
    const meta = [grade, subject].filter(Boolean).join(' • ');
    const fallbackMeta = b.category ? escapeHtml(b.category) : (b.author ? escapeHtml(b.author) : 'Matematika');

    card.innerHTML = `
      <div class="book-cover-shell">
        ${b.coverUrl
          ? `<img class="book-cover-image" src="${b.coverUrl}" alt="${escapeHtml(b.title)}" loading="lazy">`
          : `<div class="book-cover-placeholder" aria-hidden="true"><span>MATHLVL</span><strong>${escapeHtml(b.title)}</strong></div>`
        }
      </div>

      <div class="book-card-content">
        <h3 class="b-title">${escapeHtml(b.title)}</h3>
        <div class="book-meta-line">${meta || fallbackMeta}</div>
        <div class="book-access-badge ${access.cls}">
          <span class="book-access-dot"></span>
          <span>${access.label}</span>
        </div>
      </div>
    `;

    if(selectable){
      const open = ()=> openBookInChat(b);
      card.addEventListener('click', open);
      card.addEventListener('keydown', e=>{
        if(e.key === 'Enter' || e.key === ' '){
          e.preventDefault();
          open();
        }
      });
    }
    containerEl.appendChild(card);
  });
}

async function refreshAllBookViews(){
  if(document.getElementById('book-list-section-outer')?.dataset.booksRebuild === '1') return;
  const grid = document.getElementById('book-grid');
  if(grid) grid.textContent = 'Kitoblar yuklanmoqda…';
  const books = await loadBooks();
  renderBookGrid(document.getElementById('book-grid'), books, { selectable:true, deletable:false });
}

function normalizeBookSearch(value){
  return String(value ?? '')
    .toLowerCase()
    .replace(/[ʻʼ’‘\u02bb\u02bc`´']/g, ' ')
    .replace(/[-_/.,:;()\[\]{}]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getBookSearchText(book){
  const accessLabels = {
    FREE: 'bepul free',
    PLUS: 'mathlvl plus premium',
    PURCHASE: 'alohida sotiladi xarid pullik',
    PLUS_OR_PURCHASE: 'plus yoki xarid alohida sotiladi premium'
  };

  return normalizeBookSearch([
    book.title,
    book.author,
    book.subject,
    book.grade,
    book.category,
    book.bookType === 'TEXTBOOK' ? 'darslik' : 'qoshimcha kitob',
    accessLabels[book.accessType || 'FREE'],
    book.price
  ].filter(Boolean).join(' '));
}

function filterBooksBySearch(books, query){
  const normalized = normalizeBookSearch(query);
  if(!normalized) return books;

  const tokens = normalized.split(' ').filter(Boolean);
  return books.filter(book=>{
    const haystack = getBookSearchText(book);
    const compact = haystack.replace(/\s+/g, '');
    return tokens.every(token =>
      haystack.includes(token) || compact.includes(token.replace(/\s+/g, ''))
    );
  });
}

function updateBookSearchCount(count){
  const el = document.getElementById('book-search-result-count');
  if(el) el.textContent = count + ' ta kitob';
}

const bookSearchInput = document.getElementById('book-search');
const bookSearchClear = document.getElementById('book-search-clear');

function runBookSearch(){
  if(!bookSearchInput) return;
  const filtered = filterBooksBySearch(booksCache, bookSearchInput.value);
  renderBookGrid(document.getElementById('book-grid'), filtered, { selectable:true, deletable:false });
  if(bookSearchClear) bookSearchClear.hidden = !bookSearchInput.value.trim();
}

// Library search is handled by runLibraryFilters() above.
if(bookSearchClear){
  bookSearchClear.addEventListener('click', ()=>{
    bookSearchInput.value = '';
    runBookSearch();
    bookSearchInput.focus();
  });
}

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

// ================= USTOZ AI (Gulchiroy) CHAT =================
let chatHistory = []; // {role, content}

function appendMsg(role, text){
  if(role === 'user'){
    const welcome = document.getElementById('ai-welcome');
    if(welcome) welcome.classList.add('is-hidden');
  }
  const win = document.getElementById('chat-window');
  const div = document.createElement('div');
  div.className = 'msg ' + role;
  div.innerHTML = `<div class="bubble"></div>`;
  div.querySelector('.bubble').textContent = text;
  win.appendChild(div);
  win.scrollTop = win.scrollHeight;
}

function appendTypingBubble(){
  const win = document.getElementById('chat-window');
  const div = document.createElement('div');
  div.className = 'msg teacher';
  div.innerHTML = `<div class="bubble typing-dots" aria-label="Ustoz AI javob tayyorlamoqda"><span></span><span></span><span></span></div>`;
  win.appendChild(div);
  win.scrollTop = win.scrollHeight;
  return div;
}

function cleanAiText(text){
  return String(text || '')
    .replace(/[\u200B-\u200D\uFEFF]/g,'')
    .replace(/\uFFFD/g,'')
    .trim();
}

function renderAiAnswer(el, text){
  el.innerHTML = safeMarkdown(cleanAiText(text));
  renderMathInElement(el, {
    delimiters:[
      {left:"$$", right:"$$", display:true},
      {left:"$", right:"$", display:false}
    ],
    throwOnError:false
  });
}

function getAiTypingPreview(text){
  const clean = cleanAiText(text);
  const temp = document.createElement('div');

  try{
    renderAiAnswer(temp, clean);

    // KaTeX keeps a hidden MathML copy for accessibility. Remove that copy so
    // formulas do not appear twice in the temporary typing preview.
    temp.querySelectorAll('.katex-mathml').forEach(node=>node.remove());
    temp.querySelectorAll('br').forEach(br=>br.replaceWith('\n'));

    const preview = (temp.innerText || temp.textContent || '')
      .replace(/\n{3,}/g,'\n\n')
      .trim();

    if(preview) return preview;
  }catch(e){}

  // Safe fallback: hide markdown control characters while typing.
  return clean
    .replace(/```[a-z]*\n?/gi,'')
    .replace(/```/g,'')
    .replace(/\*\*|__/g,'')
    .replace(/^#{1,6}\s+/gm,'')
    .replace(/\$\$/g,'')
    .replace(/\$/g,'')
    .trim();
}

function waitForTyping(ms, signal){
  return new Promise((resolve,reject)=>{
    if(signal?.aborted){
      const err = new Error('Stopped');
      err.name = 'AbortError';
      reject(err);
      return;
    }

    const timer = setTimeout(()=>{
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    function onAbort(){
      clearTimeout(timer);
      const err = new Error('Stopped');
      err.name = 'AbortError';
      reject(err);
    }

    signal?.addEventListener('abort', onAbort, { once:true });
  });
}

async function typewriterReveal(div, text, options = {}){
  const bubbleEl = div.querySelector('.bubble');
  const scrollEl = options.scrollEl || document.getElementById('chat-window');
  const signal = options.signal;
  const finalText = cleanAiText(text);
  const previewText = getAiTypingPreview(finalText);

  bubbleEl.classList.remove('typing-dots');
  bubbleEl.classList.add('typewriter-active');
  bubbleEl.textContent = '';

  for(let i = 0; i < previewText.length; i++){
    if(signal?.aborted){
      const err = new Error('Stopped');
      err.name = 'AbortError';
      throw err;
    }

    bubbleEl.textContent += previewText[i];

    if((i % 3) === 0 && scrollEl){
      scrollEl.scrollTop = scrollEl.scrollHeight;
    }

    const ch = previewText[i];
    const delay =
      ch === '\n' ? 18 :
      /[.!?]/.test(ch) ? 34 :
      /[,;:]/.test(ch) ? 18 :
      ch === ' ' ? 3 : 8;

    await waitForTyping(delay, signal);
  }

  bubbleEl.classList.remove('typewriter-active');
  renderAiAnswer(bubbleEl, finalText);

  if(scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
}

let chatImageBase64 = null;
let chatImageMedia = null;
let chatAbortController = null;

document.getElementById('chat-image-input').addEventListener('change', async (e)=>{
  const file = e.target.files?.[0];
  if(!file) return;

  const previewEl = document.getElementById('chat-image-preview');
  const statusEl = document.getElementById('chat-status');
  statusEl.classList.remove('err');
  statusEl.textContent = 'Rasm tayyorlanmoqda...';

  try{
    const prepared = await prepareSolveImage(file);
    chatImageBase64 = prepared.base64;
    chatImageMedia = prepared.mediaType;

    previewEl.style.display = 'block';
    previewEl.innerHTML = `
      <div class="chat-thumb">
        <img src="${prepared.dataUrl}" alt="Biriktirilgan rasm">
        <button type="button" class="rm" id="chat-image-remove" aria-label="Rasmni olib tashlash">×</button>
      </div>`;

    document.getElementById('chat-image-remove').addEventListener('click', ()=>{
      chatImageBase64 = null;
      chatImageMedia = null;
      previewEl.style.display = 'none';
      previewEl.innerHTML = '';
      document.getElementById('chat-image-input').value = '';
      statusEl.textContent = '';
    });

    statusEl.textContent = '';
  }catch(err){
    chatImageBase64 = null;
    chatImageMedia = null;
    previewEl.style.display = 'none';
    previewEl.innerHTML = '';
    document.getElementById('chat-image-input').value = '';
    statusEl.textContent = err.message || 'Rasmni biriktirib bo‘lmadi.';
    statusEl.classList.add('err');
  }
});


function looksLikeLibraryTopicQuestion(text){
  const q = String(text || '').toLowerCase();
  if(!q) return false;
  return /(qaysi|qayer|qanaqa|qanday).*?(kitob|darslik)|(?:kitob|darslik).*?(mavzu|bor|top|tavsiya)|(?:mavzu).*?(qaysi|qayer).*?(kitob|darslik)|(?:shu|bu).*?(mavzu).*?(kitob|darslik)/i.test(q);
}

async function findLibraryBooksForTopic(query){
  try{
    const res = await fetch('/api/books?action=topic-search', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ query })
    });
    if(!res.ok) return { matches:[], verified:false };
    const data = await res.json();
    return {
      matches:Array.isArray(data.matches) ? data.matches : [],
      verified:!!data.verified
    };
  }catch(e){
    return { matches:[], verified:false };
  }
}

function getBookByIdFromLibrary(id){
  return booksCache.find(book => String(book.id) === String(id)) || null;
}

async function openBookFromTeacherRecommendation(bookId){
  if(!booksCache.length) await loadBooks();
  const book = getBookByIdFromLibrary(bookId);
  if(!book) return;

  activateTab('books');

  const search = document.getElementById('book-search');
  if(search){
    search.value = book.title || '';
    if(typeof runBookSearch === 'function') runBookSearch();
  }

  window.setTimeout(()=>{
    openBookInChat(book);
    const panel = document.getElementById('panel-teacher');
    panel?.scrollIntoView({behavior:'smooth', block:'start'});
  }, 80);
}

function renderTeacherBookRecommendations(messageDiv, matches, verified){
  if(!messageDiv || !Array.isArray(matches) || !matches.length) return;

  const old = messageDiv.querySelector('.ai-book-recommendations');
  if(old) old.remove();

  const wrap = document.createElement('div');
  wrap.className = 'ai-book-recommendations';

  const label = document.createElement('div');
  label.className = 'ai-book-rec-label';
  label.textContent = verified ? 'MATHLVL kitobidan topildi' : 'MATHLVL kutubxonasidan tavsiya';
  wrap.appendChild(label);

  matches.slice(0,3).forEach(match=>{
    const card = document.createElement('div');
    card.className = 'ai-book-rec-card';

    const cover = document.createElement('div');
    cover.className = 'ai-book-rec-cover';
    if(match.coverUrl){
      const img = document.createElement('img');
      img.src = match.coverUrl;
      img.alt = match.title || 'Kitob muqovasi';
      img.loading = 'lazy';
      cover.appendChild(img);
    }else{
      const fallback = document.createElement('div');
      fallback.className = 'ai-book-rec-fallback';
      fallback.textContent = 'MATHLVL';
      cover.appendChild(fallback);
    }

    const info = document.createElement('div');
    info.className = 'ai-book-rec-info';

    const titleEl = document.createElement('div');
    titleEl.className = 'ai-book-rec-title';
    titleEl.textContent = match.title || 'Kitob';

    const metaEl = document.createElement('div');
    metaEl.className = 'ai-book-rec-meta';
    metaEl.textContent = [match.grade && match.grade !== 'ALL' ? match.grade : '', match.subject || '', match.author || '']
      .filter(Boolean)
      .join(' • ');

    info.appendChild(titleEl);
    info.appendChild(metaEl);

    if(match.verified){
      const proof = document.createElement('div');
      proof.className = 'ai-book-rec-proof';
      proof.textContent = match.reason ? 'Mavzu tekshirildi: ' + match.reason : 'Mavzu kitob ichidan tekshirildi';
      info.appendChild(proof);
    }

    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.className = 'ghost-btn ai-book-rec-open';
    openBtn.textContent = 'Kutubxonada ochish';
    openBtn.addEventListener('click', ()=> openBookFromTeacherRecommendation(match.id));

    card.appendChild(cover);
    card.appendChild(info);
    card.appendChild(openBtn);
    wrap.appendChild(card);
  });

  messageDiv.appendChild(wrap);
  document.getElementById('chat-window')?.scrollTo({
    top:document.getElementById('chat-window').scrollHeight,
    behavior:'smooth'
  });
}

async function sendChat(){
  const input = document.getElementById('chat-input');
  await restoreTeacherMemory();
  const text = input.value.trim();
  const statusEl = document.getElementById('chat-status');
  const btn = document.getElementById('chat-send');

  if(btn.classList.contains('stop-state')){
    if(chatAbortController) chatAbortController.abort();
    return;
  }

  if(!text && !chatImageBase64) return;
  const qp = document.getElementById('quick-prompts');
  if(qp) qp.style.display = 'none';

  let userContent = text;
  if(chatImageBase64){
    userContent = [
      { type:'image', source:{ type:'base64', media_type: chatImageMedia, data: chatImageBase64 } },
      { type:'text', text: text || "Rasmdagi masalani tushuntiring." }
    ];
  }
  appendMsg('user', text || "📷 Rasm yuborildi");
  chatHistory.push({ role:'user', content: userContent });
  input.value = '';
  input.style.height = '';
  const hadImage = !!chatImageBase64;
  chatImageBase64 = null; chatImageMedia = null;
  document.getElementById('chat-image-preview').style.display = 'none';
  document.getElementById('chat-image-preview').innerHTML = '';
  document.getElementById('chat-image-input').value = '';

  statusEl.classList.remove('err');
  statusEl.textContent = '';
  btn.classList.add('stop-state');
  btn.title = "To'xtatish";
  btn.setAttribute('aria-label', "Javobni to'xtatish");
  btn.querySelector('.chat-send-icon')?.setAttribute('hidden','');
  btn.querySelector('.chat-stop-icon')?.removeAttribute('hidden');
  const typingDiv = appendTypingBubble();
  // Yuborish tugmasi javob paytida Stop vazifasini bajaradi, shuning uchun disabled bo'lmasin.
  btn.disabled = false;

  let libraryRecommendation = { matches:[], verified:false };
  if(text && looksLikeLibraryTopicQuestion(text)){
    const waitingBubble = typingDiv.querySelector('.bubble');
    if(waitingBubble) waitingBubble.textContent = 'MATHLVL kutubxonasidan mos kitob qidirilyapti...';
    libraryRecommendation = await findLibraryBooksForTopic(text);
    if(waitingBubble){
      waitingBubble.classList.add('typing-dots');
      waitingBubble.innerHTML = '<span></span><span></span><span></span>';
    }
  }

  let system = `Matematika bo‘yicha o‘zbek tilida yordam bering. Matematik formulalarni $...$ yoki $$...$$ LaTeX bilan yozing. Foydalanuvchining savolini va suhbat kontekstini hisobga oling.`;
  if(activeBook){
    system += `\n\nFoydalanuvchi hozir "${activeBook.title}" nomli darslik bilan ishlayapti (PDF holida, siz matnini ko'rmaysiz). Savollariga umumiy matematik bilim asosida javob bering, kerak bo'lsa aniqroq savol so'rang.`;
  }

  if(libraryRecommendation.matches.length){
    const libraryLines = libraryRecommendation.matches.map((book, i)=>{
      const status = book.verified ? 'PDF ichidan mavzu topildi' : 'katalog bo‘yicha eng mos';
      return `${i+1}. "${book.title}" | ${book.grade || ''} | ${book.subject || ''} | ${status}${book.reason ? ' | ' + book.reason : ''}`;
    }).join('\n');

    system += `\n\nMATHLVL KUTUBXONASI NATIJASI:
${libraryLines}

Agar foydalanuvchi qaysi kitobda mavzu borligini so‘ragan bo‘lsa, FAQAT yuqoridagi real MATHLVL kitoblaridan tavsiya qil. Kitob nomini aniq yoz. Saytda yo‘q kitobni o‘ylab topma. Javob oxirida foydalanuvchiga pastdagi “Kitobni ochish” tugmasi orqali kitobga o‘tishi mumkinligini qisqa ayt.`;
  }

  const bubbleEl = typingDiv.querySelector('.bubble');
  const win = document.getElementById('chat-window');
  chatAbortController = new AbortController();

  try{
    const res = await fetch('/api/chat-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system, messages: chatHistory.slice(-20), max_tokens: 1000, memory_scope:'teacher' }),
      signal: chatAbortController.signal
    });
    if(!res.ok || !res.body){
      const errData = await res.json().catch(()=>({}));
      throw new Error(errData.error || "Xatolik yuz berdi");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

    while(true){
      const { done, value } = await reader.read();
      if(done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for(const line of lines){
        if(!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if(payload === '[DONE]') continue;
        let parsed = null;
        try{ parsed = JSON.parse(payload); }catch(e){}
        if(parsed?.status){ bubbleEl.classList.remove('typing-dots'); bubbleEl.textContent = parsed.status; }
        if(typeof parsed?.memorySaved === 'boolean'){
          document.getElementById('memory-status').textContent = parsed.memorySaved ? 'Suhbat saqlandi' : 'Javob tayyor. Xotiraga saqlanmadi.';
        }
        if(parsed?.error){
          throw new Error(parsed.error);
        }
        if(parsed?.text){
          fullText += parsed.text;
          bubbleEl.classList.remove('typing-dots');
          bubbleEl.textContent = cleanAiText(fullText);
          win.scrollTop = win.scrollHeight;
        }
      }
    }

    const finalText = cleanAiText(fullText);
    if(!finalText) throw new Error("Ustoz AI bo‘sh javob qaytardi.");

    renderAiAnswer(bubbleEl, finalText);

    if(libraryRecommendation.matches.length){
      renderTeacherBookRecommendations(typingDiv, libraryRecommendation.matches, libraryRecommendation.verified);
    }
    chatHistory.push({ role:'assistant', content: finalText });
  }catch(err){
    if(err.name === 'AbortError'){
      bubbleEl.classList.remove('typing-dots');
      bubbleEl.textContent = "To‘xtatildi.";
    }else{
      typingDiv.remove();
      const raw = String(err?.message || '');
      if(/429|limit|Juda ko'p|limiti tugadi/i.test(raw)){
        statusEl.textContent = raw || "Ustoz AI limiti tugadi. Birozdan keyin urinib ko‘ring.";
      }else if(/401|tizimga kiring/i.test(raw)){
        statusEl.textContent = "Ustoz AI uchun avval hisobingizga kiring.";
      }else if(raw){
        statusEl.textContent = raw;
      }else{
        statusEl.textContent = "Ustoz AI bilan ulanishda xatolik. Qayta urinib ko‘ring.";
      }
      statusEl.classList.add('err');
    }
  }finally{
    btn.classList.remove('stop-state');
    btn.title = "Yuborish";
    btn.setAttribute('aria-label', 'Xabarni yuborish');
    btn.querySelector('.chat-stop-icon')?.setAttribute('hidden','');
    btn.querySelector('.chat-send-icon')?.removeAttribute('hidden');
    btn.disabled = false;
    chatAbortController = null;
  }
}
document.getElementById('chat-send').addEventListener('click', sendChat);
document.getElementById('chat-input').addEventListener('keydown', (e)=>{
  if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); sendChat(); }
});
document.getElementById('chat-input').addEventListener('input', (e)=>{
  e.target.style.height = 'auto';
  e.target.style.height = Math.min(e.target.scrollHeight, 132) + 'px';
});
document.querySelectorAll('.chip-btn').forEach(chip=>{
  chip.addEventListener('click', ()=>{
    document.getElementById('chat-input').value = chip.dataset.prompt;
    document.getElementById('quick-prompts').style.display = 'none';
    sendChat();
  });
});

// ---- Book mode: detail screen -> custom continuous-scroll PDF reader (PDF.js) ----
if(window['pdfjsLib']){
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
}
let readerPdfDoc = null;
let readerPageNum = 1;
let readerNumPages = 0;
let readerZoomPercent = 100;
let readerBaseWidth = 0;      // 100% zoom pixel width (fit-width)
let readerAspect = 1.4;       // page height/width ratio, used for placeholder sizing
let renderedPages = new Set();
let pageObserver = null;
let currentVisiblePage = 1;
let zoomRerenderTimer = null;

async function resolveBookForReading(book){
  if(!book || !book.id) return null;
  try{
    const res = await fetch('/api/books?action=open&id=' + encodeURIComponent(book.id), {
      credentials:'include',
      cache:'no-store'
    });
    const data = await res.json().catch(()=>({}));

    if(res.status === 401 || data.error === 'not_logged_in'){
      if(typeof window.requireMathlvlAuth === 'function'){
        window.requireMathlvlAuth('book','books');
      }
      return null;
    }
    if(res.status === 403){
      if(data.error === 'plus_required'){
        await openPlanSelect({active:false});
      }else if(data.error === 'purchase_required' || data.error === 'plus_or_purchase_required'){
        await openBookPurchase(book);
      }
      return null;
    }
    if(!res.ok) throw new Error(data.error || "Kitobni ochib bo‘lmadi");

    const safeBook = data.book || {};
    return { ...book, ...safeBook, fileUrl: data.fileUrl || safeBook.fileUrl };
  }catch(err){
    console.error('Kitob access xatosi:', err);
    alert("Kitobni ochishda muammo yuz berdi. Qayta urinib ko‘ring.");
    return null;
  }
}

function openBookInChat(book){
  activateTab('books');
  activeBook = book;
  document.getElementById('teacher-layout').classList.add('book-mode');
  document.body.classList.add('reader-mode');

  document.getElementById('book-detail-screen').style.display = 'block';
  document.getElementById('book-reader-screen').style.display = 'none';

  const coverEl = document.getElementById('book-detail-cover');
  const fallbackEl = document.getElementById('book-detail-cover-fallback');
  if(book.coverUrl){
    coverEl.src = book.coverUrl;
    coverEl.style.display = 'block';
    fallbackEl.style.display = 'none';
  }else{
    coverEl.removeAttribute('src');
    coverEl.style.display = 'none';
    fallbackEl.style.display = 'flex';
  }

  document.getElementById('book-detail-title').textContent = book.title || 'Matematika kitobi';
  document.getElementById('book-detail-author').textContent = book.author || 'MATHLVL kutubxonasi';

  const meta = [
    book.grade && book.grade !== 'ALL' ? book.grade : '',
    book.subject || '',
    book.category || ''
  ].filter(Boolean);
  document.getElementById('book-detail-meta').textContent = meta.length ? meta.join('  •  ') : 'Matematika';

  const access = getBookAccessPresentation(book);
  document.getElementById('book-detail-access').textContent = access.label;

  const startBtn = document.getElementById('book-start-reading');
  startBtn.querySelector('span').textContent = 'O‘qishni boshlash';
  startBtn.onclick = async ()=>{
    const readableBook = await resolveBookForReading(book);
    if(!readableBook) return;
    activeBook = readableBook;
    startReading(readableBook);
  };
  requestAnimationFrame(()=>{
    window.scrollTo({top:0, left:0, behavior:'instant'});
    document.querySelectorAll('main, .main-content, .content').forEach(el=>el.scrollTo({top:0,left:0,behavior:'instant'}));
    document.getElementById('book-detail-screen').scrollIntoView({block:'start',behavior:'instant'});
    window.scrollTo({top:0,left:0,behavior:'instant'});
  });
}

async function startReading(book){
  document.getElementById('book-detail-screen').style.display = 'none';
  document.getElementById('book-reader-screen').style.display = 'block';
  document.getElementById('reader-header-title').textContent = book.title;

  const readerControls = document.getElementById('reader-header-desktop-controls');
  const readerAiButton = document.getElementById('ai-desktop-btn');
  if(readerControls){
    readerControls.style.display = 'flex';
    readerControls.style.visibility = 'visible';
    readerControls.style.opacity = '1';
  }
  if(readerAiButton){
    readerAiButton.style.display = 'inline-flex';
    readerAiButton.style.visibility = 'visible';
    readerAiButton.style.opacity = '1';
  }

  // Give the browser one actual visual frame before PDF.js/network/render work begins.
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  const loadingEl = document.getElementById('reader-loading');
  const loadingTextEl = document.getElementById('reader-loading-text');
  const retryBtn = document.getElementById('reader-retry-btn');
  const scrollEl = document.getElementById('reader-scroll');
  loadingEl.style.display = 'flex';
  loadingTextEl.textContent = 'Kitob tayyorlanmoqda...';
  retryBtn.style.display = 'none';
  scrollEl.innerHTML = '';
  readerPdfDoc = null;
  readerZoomPercent = 100;
  pageStrokesCache = {};
  pageRedoCache = {};
  renderedPages = new Set();
  pageRenderState = {};
  setAnnotationTool(null);
  clearMobileRenderQueue();
  if(pageObserver){ pageObserver.disconnect(); pageObserver = null; }

  readerPageNum = 1;
  currentVisiblePage = 1;

  if(!book.fileUrl){
    try{
      const openRes = await fetch('/api/books?action=open&id=' + encodeURIComponent(book.id), { cache:'no-store' });
      const openData = await openRes.json().catch(()=>({}));
      if(!openRes.ok){
        if(openRes.status === 401) throw new Error('Bu kitobni ochish uchun hisobingizga kiring.');
        if(openRes.status === 403) throw new Error('Bu kitobga kirish uchun kerakli tarif yoki xarid talab qilinadi.');
        throw new Error(openData.error || "Kitob faylini olib bo‘lmadi.");
      }
      book = { ...book, ...(openData.book || {}), fileUrl: openData.fileUrl || openData.book?.fileUrl };
      activeBook = book;
    }catch(err){
      loadingTextEl.textContent = err.message || "Kitobni ochishda muammo yuz berdi.";
      retryBtn.style.display = 'inline-block';
      return;
    }
  }

  function showReaderError(){
    loadingTextEl.textContent = "Kitobni ochishda muammo yuz berdi. Qayta urinib ko'ring.";
    retryBtn.style.display = 'inline-block';
  }

  if(typeof pdfjsLib === 'undefined'){
    console.error('PDF.js kutubxonasi yuklanmadi (pdfjsLib aniqlanmagan).');
    showReaderError();
    return;
  }

  // Mobil brauzerlarda tashqi Blob/CORS PDF yuklanishi ishonchsiz bo‘lishi mumkin.
  // Avval to‘g‘ridan-to‘g‘ri ochamiz, ishlamasa himoyalangan same-origin proxyga o‘tamiz.
  async function loadPdfDocument(){
    const sources = [];
    if(book.fileUrl) sources.push({url:book.fileUrl, label:'direct'});
    if(book.id) sources.push({
      url:'/api/books?action=pdf&id='+encodeURIComponent(book.id),
      label:'proxy'
    });

    let lastError = null;
    for(const source of sources){
      try{
        const task = pdfjsLib.getDocument({
          url:source.url,
          disableAutoFetch:false,
          disableStream:false,
          useWorkerFetch:true,
          isEvalSupported:false
        });
        let timeout;
        try { return await Promise.race([task.promise, new Promise((_, reject)=>{ timeout=setTimeout(()=>{task.destroy(); reject(new Error('PDF yuklanishi kechikdi.'));},25000); })]); }
        finally { clearTimeout(timeout); }
      }catch(err){
        lastError = err;
        console.warn('PDF manbasi ishlamadi:', source.label, err);
      }
    }
    throw lastError || new Error('PDF yuklanmadi');
  }

  loadPdfDocument().then(async pdf=>{
    try{
      readerPdfDoc = pdf;
      readerNumPages = pdf.numPages;
      if(readerPageNum > readerNumPages) readerPageNum = 1;
      if(readerPageNum < 1) readerPageNum = 1;

      const firstPage = await pdf.getPage(1);
      const vp1 = firstPage.getViewport({ scale: 1 });
      readerAspect = vp1.height / vp1.width;

      buildPageContainers();
      loadingEl.style.display = 'none';
      setupPageObserver();

      requestAnimationFrame(()=> scrollToPage(1, false));
    }catch(renderErr){
      console.error('PDF sahifasini tayyorlashda xato:', renderErr);
      showReaderError();
    }
  }).catch(err=>{
    console.error('PDF hujjatini yuklashda xato:', err);
    showReaderError();
  });
}
document.getElementById('reader-retry-btn').addEventListener('click', ()=>{
  if(activeBook) startReading(activeBook);
});

// ---- Sahifa konteynerlarini yaratish (placeholder balandliklar bilan) ----
function pageTargetWidth(){
  const wrap = document.getElementById('reader-canvas-wrap');
  const fitWidth = Math.min(wrap.clientWidth - 24, 780);
  readerBaseWidth = fitWidth;
  return fitWidth * (readerZoomPercent / 100);
}
function updatePageIndicator(){
  const el = document.getElementById('reader-page-text-desktop');
  if(el) el.textContent = readerNumPages ? `${currentVisiblePage} / ${readerNumPages}` : '— / —';
}
window.updatePageIndicator = updatePageIndicator;

function buildPageContainers(){
  const scrollEl = document.getElementById('reader-scroll');
  scrollEl.innerHTML = '';
  const width = pageTargetWidth();
  const height = width * readerAspect;
  for(let i=1; i<=readerNumPages; i++){
    const item = document.createElement('div');
    item.className = 'reader-page-item';
    item.dataset.page = i;
    item.style.width = width + 'px';
    item.style.height = height + 'px';
    scrollEl.appendChild(item);
  }
  updatePageIndicator();
}


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
    if(candidate.item?.isConnected && Math.abs(candidate.num-currentVisiblePage)<=3 && !renderedPages.has(candidate.num)){
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

// ---- IntersectionObserver: qaysi sahifa render qilinishi va joriy sahifa kuzatuvi ----
function setupPageObserver(){
  const scrollEl = document.getElementById('reader-scroll');
  if(!scrollEl) return;

  if(pageObserver){
    pageObserver.disconnect();
    pageObserver = null;
  }

  // Keep this reader path deliberately simple: render the first few pages
  // immediately and render the next nearby page on scroll. This avoids runtime
  // dependencies on IntersectionObserver callbacks/helpers that were being
  // rewritten by other build patches.
  const items = Array.from(scrollEl.querySelectorAll('.reader-page-item'));
  const renderNearby = ()=>{
    if(!items.length) return;
    const first = items[0];
    const stride = first.offsetHeight + (parseFloat(getComputedStyle(first).marginBottom) || 0);
    const idx = stride ? Math.max(0, Math.min(items.length - 1, Math.round(scrollEl.scrollTop / stride))) : 0;
    const start = Math.max(0, idx - 1);
    const end = Math.min(items.length - 1, idx + 2);

    for(let i=start; i<=end; i++){
      const num = parseInt(items[i].dataset.page, 10);
      if(Number.isFinite(num)) scheduleMobileReaderPageRender(items[i], num);
    }

    const num = parseInt(items[idx]?.dataset.page, 10);
    if(Number.isFinite(num)){
      currentVisiblePage = num;
      readerPageNum = num;
      updatePageIndicator();
    }
  };

  clearMobileRenderQueue();
  renderNearby();

  // Replace the old listener so reopening a book uses its new page elements.
  if(scrollEl.readerScrollHandler){
    scrollEl.removeEventListener('scroll', scrollEl.readerScrollHandler);
  }
  let raf = 0;
  scrollEl.readerScrollHandler = ()=>{
    if(raf) return;
    raf = requestAnimationFrame(()=>{
      raf = 0;
      renderNearby();
      scheduleReaderGarbageCollect();
    });
  };
  scrollEl.addEventListener('scroll', scrollEl.readerScrollHandler, { passive:true });
}

// MATHLVL_READER_OBSERVER_RUNTIME_FIX_V4


// MATHLVL_READER_OBSERVER_RUNTIME_FIX_V4

function updateCurrentVisiblePage(){
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

window.updatePageIndicator = function(){
  const el = document.getElementById('reader-page-text-desktop');
  if(el) el.textContent = readerNumPages ? `${currentVisiblePage} / ${readerNumPages}` : '— / —';
};

// ---- Bitta sahifani render qilish ----
// ---- Har sahifa uchun alohida render holatini kuzatish (poyga holatini oldini olish uchun) ----
let pageRenderState = {}; // { [pageNum]: { task, token } }
function getPageRenderState(num){
  if(!pageRenderState[num]) pageRenderState[num] = { task: null, token: 0 };
  return pageRenderState[num];
}
async function cancelPageRender(num){
  const state = getPageRenderState(num);
  if(state.task){
    try{ state.task.cancel(); }catch(e){}
    try{ await state.task.promise; }catch(e){ /* bekor qilinganda kutilgan xato */ }
    state.task = null;
  }
}
function cancelAllPageRenders(){
  Object.keys(pageRenderState).forEach(key=>{
    const state = pageRenderState[key];
    if(state.task){ try{ state.task.cancel(); }catch(e){} state.task = null; }
    state.token++;
  });
}

function renderPageInto(item, num, forceRerender){
  const state = getPageRenderState(num);
  if(state.pending && !forceRerender) return state.pending;
  const pending = performPageRender(item, num, forceRerender).finally(()=>{ if(state.pending === pending) state.pending = null; });
  state.pending = pending;
  return pending;
}
async function performPageRender(item, num, forceRerender){
  if(!readerPdfDoc) return;
  const state = getPageRenderState(num);

  // Sahifa allaqachon joriy sozlamalar bilan render qilingan va hech narsa faol emas — qayta ishlash shart emas
  if(!forceRerender && renderedPages.has(num) && !state.task) return;

  // Shu sahifa uchun oldingi render tugamagan bo'lsa — avval uni bekor qilib, tugashini kutamiz
  await cancelPageRender(num);

  const myToken = ++state.token;

  try{
    const page = await readerPdfDoc.getPage(num);
    if(myToken !== state.token) return; // bu vaqt ichida yangiroq so'rov kelgan, eskisini e'tiborsiz qoldiramiz

    const width = pageTargetWidth();
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = width / baseViewport.width;
    const viewport = page.getViewport({ scale });

    let canvas = item.querySelector('canvas.page-canvas');
    let annCanvas = item.querySelector('canvas.page-annotation-canvas');
    if(!canvas){
      canvas = document.createElement('canvas');
      canvas.className = 'page-canvas';
      item.appendChild(canvas);
    }
    if(!annCanvas){
      annCanvas = document.createElement('canvas');
      annCanvas.className = 'page-annotation-canvas';
      annCanvas.style.pointerEvents = annotationTool ? 'auto' : 'none';
      annCanvas.style.touchAction = annotationTool ? 'none' : 'pan-x pan-y';
      item.appendChild(annCanvas);
    }
    // Canvas o'lchamini FAQAT oldingi render to'liq bekor qilingandan keyin yangilaymiz
    const maxPixels = window.matchMedia('(max-width: 899px)').matches ? 2400000 : 6000000;
    const resolution = Math.min(1, Math.sqrt(maxPixels / (viewport.width * viewport.height)));
    canvas.width = Math.ceil(viewport.width * resolution); canvas.height = Math.ceil(viewport.height * resolution);
    annCanvas.width = canvas.width; annCanvas.height = canvas.height;
    canvas.style.width = annCanvas.style.width = viewport.width + 'px';
    canvas.style.height = annCanvas.style.height = viewport.height + 'px';
    item.style.width = viewport.width + 'px';
    item.style.height = viewport.height + 'px';

    const ctx = canvas.getContext('2d');
    const task = page.render({ canvasContext: ctx, viewport, transform: resolution < 1 ? [resolution,0,0,resolution,0,0] : undefined });
    state.task = task;
    await task.promise;

    if(myToken !== state.token) return; // eskirgan natija, UI'ga qo'llanmaydi
    state.task = null;
    renderedPages.add(num);
    redrawAnnotationsFor(num, annCanvas);
  }catch(e){
    if(e && e.name === 'RenderingCancelledException') return; // kutilgan holat, xato emas
    if(myToken === state.token) state.task = null;
    renderedPages.delete(num);
    console.error('Sahifa render xatosi:', num, e);
  }
}

// ---- Ekrandan uzoq sahifalarni bo'shatish (xotira uchun) ----
function garbageCollectFarPages(){
  const isMobile = window.matchMedia('(max-width: 899px)').matches;
  const keepCount = isMobile ? 5 : 8;
  const keepDistance = isMobile ? 3 : 5;
  if(renderedPages.size <= keepCount) return;
  document.querySelectorAll('.reader-page-item').forEach(el=>{
    const num = parseInt(el.dataset.page, 10);
    if(Math.abs(num - currentVisiblePage) > keepDistance && renderedPages.has(num)){
      const state = getPageRenderState(num);
      if(state.task){ try{ state.task.cancel(); }catch(e){} state.task = null; }
      state.token++;
      const canvas = el.querySelector('canvas.page-canvas');
      const annCanvas = el.querySelector('canvas.page-annotation-canvas');
      if(canvas){ canvas.width = 0; canvas.height = 0; canvas.remove(); }
      if(annCanvas){ annCanvas.width = 0; annCanvas.height = 0; annCanvas.remove(); }
      renderedPages.delete(num);
    }
  });
}

// ---- To'g'ridan-to'g'ri sahifaga o'tish ----
function scrollToPage(num, smooth){
  num = Math.max(1, Math.min(readerNumPages || 1, num));
  const item = document.querySelector(`.reader-page-item[data-page="${num}"]`);
  if(!item) return;
  item.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
  currentVisiblePage = num;
  readerPageNum = num;
  updatePageIndicator();
}

// ================= ZOOM =================
let zoomDebounceTimer = null;
let zoomRenderGeneration = 0;
function reRenderAllForZoom(){
  const generation = ++zoomRenderGeneration;
  clearMobileRenderQueue();
  cancelAllPageRenders();
  const anchorItem = document.querySelector(`.reader-page-item[data-page="${currentVisiblePage}"]`);
  const wrap = document.getElementById('reader-canvas-wrap');
  let anchorFraction = 0;
  if(anchorItem){
    const r = anchorItem.getBoundingClientRect();
    const wrapTop = wrap.getBoundingClientRect().top;
    anchorFraction = (wrapTop - r.top) / r.height;
  }
  const width = pageTargetWidth();
  const height = width * readerAspect;
  const pagesToRender = [];
  document.querySelectorAll('.reader-page-item').forEach(el=>{
    const num = parseInt(el.dataset.page, 10);
    el.style.width = width + 'px';
    el.style.height = height + 'px';
    if(Math.abs(num-currentVisiblePage)<=1) pagesToRender.push([el, num]);
    else { el.querySelectorAll('canvas').forEach(c=>{c.width=0;c.height=0;c.remove();}); }
    renderedPages.delete(num);
  });
  // Har sahifani ketma-ket (parallel emas) qayta render qilamiz — bir vaqtda ko'p canvas'ga tegmaslik uchun
  (async ()=>{
    for(const [el, num] of pagesToRender.sort((a,b)=>Math.abs(a[1]-currentVisiblePage)-Math.abs(b[1]-currentVisiblePage))){
      if(generation !== zoomRenderGeneration) break;
      await renderPageInto(el, num, true);
    }
  })();
  requestAnimationFrame(()=>{
    const newAnchor = document.querySelector(`.reader-page-item[data-page="${currentVisiblePage}"]`);
    if(newAnchor){
      const r = newAnchor.getBoundingClientRect();
      const wrapTop = wrap.getBoundingClientRect().top;
      const delta = r.top - wrapTop + anchorFraction * r.height;
      document.getElementById('reader-scroll').scrollTop += delta;
    }
  });
  // Zoom foizi endi vizual ko'rsatkichda ko'rsatilmaydi (faqat gesture/Ctrl+wheel orqali)
}
function setZoom(percent){
  readerZoomPercent = Math.max(100, Math.min(400, Math.round(percent)));
  document.getElementById('reader-scroll').classList.toggle('zoomed-pan', readerZoomPercent > 100);
  if(!readerPdfDoc) return;
  clearTimeout(zoomDebounceTimer);
  zoomDebounceTimer = setTimeout(()=> reRenderAllForZoom(), 160);
}
// Zoom endi faqat Ctrl/Cmd+wheel (desktop) va pinch (mobil) orqali ishlaydi, UI tugmasiz

// ---- Desktop: kattalashtirilganda sichqonchani bosib ushlab surish (pan) ----
(function(){
  const scrollEl = document.getElementById('reader-scroll');
  let isPanning = false, panStartX = 0, panStartY = 0, panScrollLeft = 0, panScrollTop = 0;
  scrollEl.addEventListener('mousedown', (e)=>{
    if(annotationTool || readerZoomPercent <= 100) return;
    isPanning = true;
    panStartX = e.clientX; panStartY = e.clientY;
    panScrollLeft = scrollEl.scrollLeft; panScrollTop = scrollEl.scrollTop;
    scrollEl.style.cursor = 'grabbing';
    e.preventDefault();
  });
  window.addEventListener('mousemove', (e)=>{
    if(!isPanning) return;
    scrollEl.scrollLeft = panScrollLeft - (e.clientX - panStartX);
    scrollEl.scrollTop = panScrollTop - (e.clientY - panStartY);
  });
  window.addEventListener('mouseup', ()=>{
    if(!isPanning) return;
    isPanning = false;
    scrollEl.style.cursor = '';
  });
})();

// ---- Mobil: ikki barmoq bilan (pinch) va ikki marta bosib kattalashtirish ----
(function(){
  const scrollEl = document.getElementById('reader-scroll');
  let pinchStartDist = null, pinchStartZoom = 100, liveScale = 1;
  function dist(t1, t2){ return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY); }

  scrollEl.addEventListener('touchstart', (e)=>{
    if(annotationTool) return;
    if(e.touches.length === 2){
      liveScale = 1;
      pinchStartDist = dist(e.touches[0], e.touches[1]);
      pinchStartZoom = readerZoomPercent;
    }
  }, { passive:true });

  scrollEl.addEventListener('touchmove', (e)=>{
    if(annotationTool || !pinchStartDist || e.touches.length !== 2) return;
    if(e.cancelable) e.preventDefault();
    const newDist = dist(e.touches[0], e.touches[1]);
    liveScale = newDist / pinchStartDist;
  }, { passive:false });

  scrollEl.addEventListener('touchend', (e)=>{
    if(!pinchStartDist) return;
    if(e.touches.length < 2){
      scrollEl.style.transform = 'none';
      const target = Math.max(100, Math.min(400, Math.round(pinchStartZoom * liveScale)));
      pinchStartDist = null;
      tapMoved = true;
      lastTap = 0;
      liveScale = 1;
      clearTimeout(zoomRerenderTimer);
      zoomRerenderTimer = setTimeout(()=> setZoom(target), 120);
    }
  });

  scrollEl.addEventListener('touchcancel', ()=>{pinchStartDist=null;liveScale=1;tapMoved=true;lastTap=0;}, {passive:true});
  let lastTap = 0;
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
  }, { passive:true });
})();

// ---- Desktop: Ctrl/Cmd + sichqoncha g'ildiragi bilan zoom ----
document.getElementById('reader-scroll').addEventListener('wheel', (e)=>{
  if(!e.ctrlKey && !e.metaKey) return;
  e.preventDefault();
  setZoom(readerZoomPercent + (e.deltaY < 0 ? 15 : -15));
}, { passive:false });

// ---- Sarlavha ⋮ menyusi ----
document.getElementById('reader-menu-btn').addEventListener('click', (e)=>{
  e.stopPropagation();
  document.getElementById('reader-menu-popover').classList.toggle('open');
});

// ---- Sahifaga to'g'ridan-to'g'ri o'tish (popover, ⋮ menyu yoki desktop yorlig'idan ochiladi) ----
function openPageJumpPopover(){
  if(!readerPdfDoc) return;
  const popover = document.getElementById('reader-page-popover');
  const input = document.getElementById('reader-page-input');
  input.max = readerNumPages;
  input.value = currentVisiblePage;
  document.getElementById('reader-page-popover-total').textContent = readerNumPages;
  popover.classList.add('open');
  input.focus();
}
document.getElementById('menu-page-jump-btn').addEventListener('click', (e)=>{
  e.stopPropagation();
  document.getElementById('reader-menu-popover').classList.remove('open');
  openPageJumpPopover();
});
document.getElementById('reader-page-text-desktop').addEventListener('click', (e)=>{
  e.stopPropagation();
  openPageJumpPopover();
});
function jumpToPage(){
  if(!readerPdfDoc) return;
  const input = document.getElementById('reader-page-input');
  let n = parseInt(input.value, 10);
  if(isNaN(n)) return;
  scrollToPage(n, true);
  document.getElementById('reader-page-popover').classList.remove('open');
}
document.getElementById('reader-page-go').addEventListener('click', jumpToPage);
document.getElementById('reader-page-input').addEventListener('keydown', (e)=>{
  if(e.key === 'Enter'){ e.preventDefault(); jumpToPage(); }
});
document.addEventListener('click', (e)=>{
  const popover = document.getElementById('reader-page-popover');
  if(popover && popover.classList.contains('open') && !popover.contains(e.target)){
    popover.classList.remove('open');
  }
  const menuPopover = document.getElementById('reader-menu-popover');
  const menuBtn = document.getElementById('reader-menu-btn');
  if(menuPopover && menuPopover.classList.contains('open') && !menuPopover.contains(e.target) && e.target !== menuBtn){
    menuPopover.classList.remove('open');
  }
});

// ---- Klaviatura: yuqori/pastga (kompyuterda) ----
document.addEventListener('keydown', (e)=>{
  if(!document.body.classList.contains('reader-mode')) return;
  const tag = (e.target.tagName || '').toLowerCase();
  if(tag === 'input' || tag === 'textarea') return;
  if(document.getElementById('book-reader-screen').style.display !== 'block') return;
  if(annotationTool) return;
  const scrollEl = document.getElementById('reader-scroll');
  if(e.key === 'ArrowDown' || e.key === 'PageDown'){ scrollEl.scrollTop += scrollEl.clientHeight * 0.85; }
  else if(e.key === 'ArrowUp' || e.key === 'PageUp'){ scrollEl.scrollTop -= scrollEl.clientHeight * 0.85; }
});

document.getElementById('reader-back-to-detail').addEventListener('click', (e)=>{
  e.preventDefault();
  e.stopPropagation();
  setAnnotationTool(null);
  document.getElementById('ai-sheet')?.classList.remove('open');
  document.getElementById('ai-sheet-backdrop')?.classList.remove('open');
  cancelAllPageRenders();
  if(pageObserver){ pageObserver.disconnect(); pageObserver = null; }
  document.getElementById('book-reader-screen').style.display = 'none';
  document.getElementById('book-detail-screen').style.display = 'block';
  readerPdfDoc = null;
  document.getElementById('reader-scroll').innerHTML = '';
});

// ================= ANNOTATION/ (chizish tizimi, har sahifa uchun alohida) =================
let annotationTool = null; // null | 'pen' | 'marker' | 'eraser'
let pageStrokesCache = {};
let pageRedoCache = {};
let isDrawingStroke = false;
let currentStrokePoints = [];
let activeDrawCanvas = null;
let activeDrawPage = null;

function getAnnotationStorageKey(){ return 'nova_annotations_' + (activeBook ? activeBook.id : 'unknown'); }
function loadPageStrokes(pageNum){
  try{
    const all = JSON.parse(localStorage.getItem(getAnnotationStorageKey()) || '{}');
    return all[pageNum] || [];
  }catch(e){ return []; }
}
function savePageStrokes(pageNum, strokes){
  try{
    const all = JSON.parse(localStorage.getItem(getAnnotationStorageKey()) || '{}');
    all[pageNum] = strokes;
    localStorage.setItem(getAnnotationStorageKey(), JSON.stringify(all));
  }catch(e){}
}
function getCurrentStrokes(pageNum){
  if(!pageStrokesCache[pageNum]) pageStrokesCache[pageNum] = loadPageStrokes(pageNum);
  return pageStrokesCache[pageNum];
}
function drawStroke(ctx, stroke, w, h){
  if(!stroke.points || stroke.points.length < 2) return;
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.globalAlpha = stroke.tool === 'marker' ? 0.35 : 1;
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.width;
  ctx.beginPath();
  stroke.points.forEach((p,i)=>{
    const x = p.x * w, y = p.y * h;
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  });
  ctx.stroke();
  ctx.restore();
}
function redrawAnnotationsFor(pageNum, annCanvas){
  if(!annCanvas || !annCanvas.width) return;
  const ctx = annCanvas.getContext('2d');
  ctx.clearRect(0,0,annCanvas.width, annCanvas.height);
  getCurrentStrokes(pageNum).forEach(s=> drawStroke(ctx, s, annCanvas.width, annCanvas.height));
}
function redrawAnnotations(){
  document.querySelectorAll('.reader-page-item').forEach(el=>{
    const num = parseInt(el.dataset.page, 10);
    const annCanvas = el.querySelector('canvas.page-annotation-canvas');
    if(annCanvas) redrawAnnotationsFor(num, annCanvas);
  });
}
function setAnnotationTool(tool){
  annotationTool = tool;
  const scrollEl = document.getElementById('reader-scroll');
  document.querySelectorAll('#pen-toggle,#pen-tool-btn,#eraser-toggle').forEach(b=> b.classList.remove('active'));
  if(tool){
    document.getElementById(tool === 'pen' ? 'pen-tool-btn' : tool + '-toggle').classList.add('active');
    scrollEl.classList.add('draw-lock');
    document.querySelectorAll('canvas.page-annotation-canvas').forEach(c=>{
      c.style.pointerEvents = 'auto'; c.style.touchAction = 'none';
    });
    document.getElementById('annotation-toolbar').classList.add('open');
    document.getElementById('pen-toggle')?.classList.add('active');
  }else{
    scrollEl.classList.remove('draw-lock');
    document.querySelectorAll('canvas.page-annotation-canvas').forEach(c=>{
      c.style.pointerEvents = 'none'; c.style.touchAction = 'pan-y';
    });
    document.getElementById('annotation-toolbar').classList.remove('open');
    document.getElementById('pen-toggle')?.classList.remove('active');
  }
}
document.getElementById('pen-toggle').addEventListener('click', ()=>{
  setAnnotationTool(annotationTool ? null : 'pen');
});
document.getElementById('pen-tool-btn').addEventListener('click', ()=>{
  annotationTool = 'pen';
  document.querySelectorAll('#pen-tool-btn,#eraser-toggle').forEach(b=> b.classList.remove('active'));
  document.getElementById('pen-tool-btn').classList.add('active');
});
document.getElementById('eraser-toggle').addEventListener('click', ()=>{
  annotationTool = 'eraser';
  document.querySelectorAll('#pen-tool-btn,#eraser-toggle').forEach(b=> b.classList.remove('active'));
  document.getElementById('eraser-toggle').classList.add('active');
});
document.getElementById('annotation-done').addEventListener('click', ()=> setAnnotationTool(null));

function pointerPos(canvas, e){
  const rect = canvas.getBoundingClientRect();
  return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
}
function eraseAt(pageNum, pos){
  const strokes = getCurrentStrokes(pageNum);
  const threshold = 0.025;
  const remaining = strokes.filter(s=> !s.points.some(p=> Math.hypot(p.x-pos.x, p.y-pos.y) < threshold));
  if(remaining.length !== strokes.length){
    pageStrokesCache[pageNum] = remaining;
    savePageStrokes(pageNum, remaining);
    const item = document.querySelector(`.reader-page-item[data-page="${pageNum}"]`);
    const annCanvas = item && item.querySelector('canvas.page-annotation-canvas');
    if(annCanvas) redrawAnnotationsFor(pageNum, annCanvas);
  }
}
document.getElementById('reader-scroll').addEventListener('pointerdown', (e)=>{
  if(!annotationTool) return;
  const canvas = e.target.closest('canvas.page-annotation-canvas');
  if(!canvas) return;
  e.preventDefault();
  const item = canvas.closest('.reader-page-item');
  activeDrawCanvas = canvas;
  activeDrawPage = parseInt(item.dataset.page, 10);
  isDrawingStroke = true;
  const pos = pointerPos(canvas, e);
  if(annotationTool === 'eraser'){ eraseAt(activeDrawPage, pos); return; }
  currentStrokePoints = [pos];
  try{ canvas.setPointerCapture(e.pointerId); }catch(err){}
});
document.getElementById('reader-scroll').addEventListener('pointermove', (e)=>{
  if(!isDrawingStroke || !annotationTool || !activeDrawCanvas) return;
  const pos = pointerPos(activeDrawCanvas, e);
  if(annotationTool === 'eraser'){ eraseAt(activeDrawPage, pos); return; }
  currentStrokePoints.push(pos);
  const n = currentStrokePoints.length;
  if(n >= 2){
    const ctx = activeDrawCanvas.getContext('2d');
    const w = activeDrawCanvas.width, h = activeDrawCanvas.height;
    ctx.save();
    ctx.lineJoin='round'; ctx.lineCap='round';
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#3DA9FC';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const p1 = currentStrokePoints[n-2], p2 = currentStrokePoints[n-1];
    ctx.moveTo(p1.x*w, p1.y*h); ctx.lineTo(p2.x*w, p2.y*h);
    ctx.stroke();
    ctx.restore();
  }
});
function finishStroke(){
  if(!isDrawingStroke) return;
  isDrawingStroke = false;
  if(annotationTool !== 'eraser' && currentStrokePoints.length > 1 && activeDrawPage){
    const strokes = getCurrentStrokes(activeDrawPage);
    strokes.push({
      tool: 'pen',
      color: '#3DA9FC',
      width: 3,
      points: currentStrokePoints
    });
    pageRedoCache[activeDrawPage] = [];
    savePageStrokes(activeDrawPage, strokes);
  }
  currentStrokePoints = [];
  activeDrawCanvas = null;
}
document.getElementById('reader-scroll').addEventListener('pointerup', finishStroke);
document.getElementById('reader-scroll').addEventListener('pointercancel', ()=>{ isDrawingStroke=false; currentStrokePoints=[]; activeDrawCanvas=null; });

document.getElementById('annotation-undo').addEventListener('click', ()=>{
  const strokes = getCurrentStrokes(currentVisiblePage);
  if(!strokes.length) return;
  const removed = strokes.pop();
  if(!pageRedoCache[currentVisiblePage]) pageRedoCache[currentVisiblePage] = [];
  pageRedoCache[currentVisiblePage].push(removed);
  savePageStrokes(currentVisiblePage, strokes);
  redrawAnnotations();
});
document.getElementById('annotation-redo').addEventListener('click', ()=>{
  const redoStack = pageRedoCache[currentVisiblePage] || [];
  if(!redoStack.length) return;
  const restored = redoStack.pop();
  getCurrentStrokes(currentVisiblePage).push(restored);
  savePageStrokes(currentVisiblePage, getCurrentStrokes(currentVisiblePage));
  redrawAnnotations();
});
document.getElementById('menu-clear-page-btn').addEventListener('click', (e)=>{
  e.stopPropagation();
  document.getElementById('reader-menu-popover').classList.remove('open');
  document.getElementById('annotation-clear-confirm').classList.add('open');
});
document.getElementById('annotation-clear-cancel').addEventListener('click', ()=>{
  document.getElementById('annotation-clear-confirm').classList.remove('open');
});
document.getElementById('annotation-clear-confirm-btn').addEventListener('click', ()=>{
  pageStrokesCache[currentVisiblePage] = [];
  savePageStrokes(currentVisiblePage, []);
  redrawAnnotations();
  document.getElementById('annotation-clear-confirm').classList.remove('open');
});


// ---- In-reader AI tutor: mobil'da drawer, desktop'da split-view ----
function openAiSheet(){
  if(!bookChatBusy){
    document.getElementById('ai-sheet-chat').replaceChildren();
    for(const message of (bookChatHistories.get(String(activeBook?.id || 'general')) || [])) appendAiSheetMsg(message.role === 'assistant' ? 'teacher' : 'user', message.content);
  }
  const sheet = document.getElementById('ai-sheet');
  const backdrop = document.getElementById('ai-sheet-backdrop');
  const title = document.getElementById('ai-sheet-title');
  const isMobileReader = window.matchMedia('(max-width: 899px)').matches;

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
}
document.getElementById('ai-desktop-btn').addEventListener('click', openAiSheet);
document.getElementById('ai-sheet-close').addEventListener('click', closeAiSheet);
document.getElementById('ai-sheet-backdrop').addEventListener('click', closeAiSheet);

function appendAiSheetMsg(role, text){
  const win = document.getElementById('ai-sheet-chat');
  const div = document.createElement('div');
  div.className = 'msg ' + role;
  div.innerHTML = `<div class="bubble"></div>`;
  const bubbleEl = div.querySelector('.bubble');
  bubbleEl.innerHTML = safeMarkdown(text);
  renderMathInElement(bubbleEl, {
    delimiters: [
      {left: "$$", right: "$$", display: true},
      {left: "$", right: "$", display: false}
    ]
  });
  win.appendChild(div);
  win.scrollTop = win.scrollHeight;
  return div;
}

async function getCurrentPageText(){
  if(!readerPdfDoc) return '';
  try{
    const page = await readerPdfDoc.getPage(currentVisiblePage);
    const textContent = await page.getTextContent();
    return textContent.items.map(it=>it.str).join(' ').slice(0, 3000);
  }catch(e){ return ''; }
}

const bookChatHistories = new Map();
let bookChatBusy = false;
async function sendAiSheetMessage(text){
  if(!text || bookChatBusy) return;
  bookChatBusy = true;
  document.getElementById('ai-sheet-send').disabled = true;
  const bookKey = String(activeBook?.id || 'general');
  const history = bookChatHistories.get(bookKey) || [];
  const turn = {role:'user', content:text};
  const hintEl = document.getElementById('ai-panel-hint');
  if(hintEl) hintEl.style.display = 'none';
  appendAiSheetMsg('user', text);

  const typingDiv = document.createElement('div');
  typingDiv.className = 'msg teacher';
  typingDiv.innerHTML = `<div class="bubble typing-dots" aria-label="Ustoz AI javob tayyorlamoqda"><span></span><span></span><span></span></div>`;
  document.getElementById('ai-sheet-chat').appendChild(typingDiv);
  const bubbleEl = typingDiv.querySelector('.bubble');
  const win = document.getElementById('ai-sheet-chat');
  win.scrollTop = win.scrollHeight;

  const pageText = await getCurrentPageText();
  let system = `Sen tajribali, mehribon matematika ustozisan. O'zbek tilida javob ber. Foydalanuvchi hozir "${activeBook ? activeBook.title : ''}" kitobini o'qiyapti, hozir ${currentVisiblePage}-sahifada (jami ${readerNumPages} sahifa).`;
  if(pageText){
    system += `\n\nShu sahifadagi matn (kontekst uchun): ${pageText}`;
  }
  system += `\nAgar savol shu sahifa yoki kitob mavzusi bilan bog'liq bo'lsa, shu kontekstdan foydalanib javob ber. Agar savol umuman boshqa matematik mavzuga oid bo'lsa ("bu sahifada yo'q" deb to'xtab qolma) — o'zingning umumiy matematik bilimingdan foydalanib, baribir to'liq va foydali javob ber. Qisqa, aniq va tushunarli yoz.`;

  try{
    const res = await fetch('/api/chat-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system, messages: [...history, turn].slice(-20), max_tokens: 1500 })
    });
    if(!res.ok || !res.body){ const data = await res.json().catch(()=>({})); throw new Error(data.error || 'Ulanishda xatolik.'); }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '', fullText = '';
    while(true){
      const { done, value } = await reader.read();
      if(done) break;
      buffer += decoder.decode(value, { stream:true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for(const line of lines){
        if(!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if(payload === '[DONE]') continue;
        let parsed;
        try{ parsed = JSON.parse(payload); }catch(e){ continue; }
        if(parsed.error) throw new Error(parsed.error);
        {
          if(parsed.text){ fullText += parsed.text;
          bubbleEl.classList.remove('typing-dots');
          bubbleEl.textContent = cleanAiText(fullText);
          win.scrollTop = win.scrollHeight; }
        }
      }
    }
    const finalText = cleanAiText(fullText);
    if(!finalText) throw new Error("Ustoz AI bo‘sh javob qaytardi.");
    renderAiAnswer(bubbleEl, finalText);
    bookChatHistories.set(bookKey, [...history, turn, {role:'assistant',content:finalText}].slice(-20));
  }catch(err){
    bubbleEl.classList.remove('typing-dots');
    bubbleEl.textContent = err.message || 'Qayta urinib ko‘ring.';
  }finally{
    bookChatBusy = false;
    document.getElementById('ai-sheet-send').disabled = false;
  }
}

document.getElementById('ai-sheet-send').addEventListener('click', ()=>{
  const input = document.getElementById('ai-sheet-input');
  const text = input.value.trim();
  if(!text) return;
  input.value = '';
  sendAiSheetMessage(text);
});
document.getElementById('ai-sheet-input').addEventListener('keydown', (e)=>{
  if(e.key === 'Enter' && !e.shiftKey){
    e.preventDefault();
    document.getElementById('ai-sheet-send').click();
  }
});

refreshAllBookViews();

// ================= PROFILE (haqiqiy Google login) =================
function setUserAvatar(el, user){
  if(!el) return;

  const label = (user && (user.name || user.email)) || '?';
  const fallback = label.charAt(0).toUpperCase();

  el.innerHTML = '';

  if(user && user.picture){
    const img = document.createElement('img');
    img.src = user.picture;
    img.alt = 'Google profil rasmi';
    img.referrerPolicy = 'no-referrer';
    img.loading = 'eager';
    img.addEventListener('error', ()=>{
      el.innerHTML = '';
      el.textContent = fallback;
    }, { once:true });
    el.appendChild(img);
  }else{
    el.textContent = fallback;
  }
}

function showSignedOutUI(){
  document.getElementById('profile-logged-out').style.display = 'block';
  document.getElementById('profile-dashboard').style.display = 'none';

  const sidebarAvatar = document.getElementById('sidebar-footer-avatar');
  if(sidebarAvatar){
    sidebarAvatar.innerHTML = '';
    sidebarAvatar.textContent = '?';
  }
}
function showSignedInUI(user){
  document.getElementById('profile-logged-out').style.display = 'none';
  document.getElementById('profile-dashboard').style.display = 'block';

  setUserAvatar(document.getElementById('profile-avatar'), user);
  setUserAvatar(document.getElementById('sidebar-footer-avatar'), user);

  document.getElementById('profile-name').textContent = user.name || user.email;
  document.getElementById('profile-email').textContent = user.isGuest ? 'Vaqtinchalik mehmon sessiyasi · 12 soat' : (user.email || '');

  const sidebarName = document.getElementById('sidebar-footer-name');
  if(sidebarName) sidebarName.textContent = user.name || user.email || 'Profil';

  refreshPlusStatus();
  renderMyBooks();
}

function renderSubscriptionCard(plusData){
  const el = document.getElementById('subscription-card-body');
  const footerPlan = document.getElementById('sidebar-footer-plan');
  if(footerPlan) footerPlan.textContent = plusData && plusData.active ? 'MATHLVL Plus' : 'Bepul plan';
  const badge = document.getElementById('plan-badge');
  if(plusData.active){
    badge.textContent = 'MATHLVL PLUS';
    badge.classList.add('plus');
    const dateStr = new Date(plusData.expiresAt).toLocaleDateString('uz-UZ', { day:'numeric', month:'long' });
    el.innerHTML = `
      <div style="font-family:var(--font-display); font-size:16px; margin-bottom:4px;">MATHLVL Plus</div>
      <div style="font-size:13px; color:var(--gold); margin-bottom:2px;">Faol</div>
      <div style="font-size:13px; color:var(--text-dim); margin-bottom:16px;">${dateStr}gacha</div>
      <button class="ghost-btn" id="manage-plan-btn" style="width:100%;">Tarifni boshqarish</button>
    `;
  }else{
    badge.textContent = 'MATHLVL FREE';
    badge.classList.remove('plus');
    el.innerHTML = `
      <div style="font-family:var(--font-display); font-size:16px; margin-bottom:4px;">MATHLVL Free</div>
      <div style="font-size:13px; color:var(--text-dim); margin-bottom:16px;">Bepul imkoniyatlardan foydalanyapsiz.</div>
      <button class="glow-btn" id="manage-plan-btn" style="width:100%;">MATHLVL Plus'ga o'tish</button>
    `;
  }
  document.getElementById('manage-plan-btn').addEventListener('click', ()=> openPlanSelect(plusData));
}

async function refreshPlusStatus(){
  try{
    const res = await fetch('/api/gift?action=status');
    const data = await res.json();
    renderSubscriptionCard(data);
  }catch(e){
    renderSubscriptionCard({ active:false });
  }
}

async function openPurchasedBookFromProfile(bookId){
  try{
    const res = await fetch('/api/books?action=open&id=' + encodeURIComponent(bookId), {
      cache:'no-store'
    });
    const data = await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.error || "Kitobni ochib bo'lmadi");

    const book = data.book || {};
    book.fileUrl = data.fileUrl || book.fileUrl;
    if(!book.id || !book.fileUrl) throw new Error("Kitob fayli topilmadi");

    activateTab('books');
    window.setTimeout(()=> openBookInChat(book), 60);
  }catch(err){
    const el = document.getElementById('my-books-body');
    const note = el?.querySelector('.profile-books-error');
    if(note){
      note.textContent = "Kitobni ochib bo‘lmadi. Qayta urinib ko‘ring.";
      note.hidden = false;
    }
  }
}

async function renderMyBooks(){
  const el = document.getElementById('my-books-body');
  if(!el) return;

  el.innerHTML = '<div class="profile-books-loading">Sotib olingan kitoblar yuklanmoqda...</div>';

  try{
    const res = await fetch('/api/gift?action=my-books', { cache:'no-store' });
    const data = await res.json().catch(()=>({}));

    if(res.status === 401){
      el.innerHTML = '<div class="profile-books-empty">Sotib olingan kitoblarni ko‘rish uchun hisobingizga kiring.</div>';
      return;
    }
    if(!res.ok) throw new Error(data.error || 'Kitoblar yuklanmadi');

    const books = Array.isArray(data.books) ? data.books : [];
    if(!books.length){
      el.innerHTML = '<div class="profile-books-empty">Hali hech qanday kitob sotib olinmagan.</div>';
      return;
    }

    const list = document.createElement('div');
    list.className = 'profile-purchased-list';

    books.forEach(book=>{
      const row = document.createElement('div');
      row.className = 'profile-purchased-book';

      const cover = document.createElement('div');
      cover.className = 'profile-purchased-cover';
      if(book.coverUrl){
        const img = document.createElement('img');
        img.src = book.coverUrl;
        img.alt = book.title || 'Kitob muqovasi';
        img.loading = 'lazy';
        cover.appendChild(img);
      }else{
        const fallback = document.createElement('span');
        fallback.textContent = 'M';
        cover.appendChild(fallback);
      }

      const info = document.createElement('div');
      info.className = 'profile-purchased-info';

      const title = document.createElement('div');
      title.className = 'profile-purchased-title';
      title.textContent = book.title || 'Kitob';

      const meta = document.createElement('div');
      meta.className = 'profile-purchased-meta';
      meta.textContent = [
        book.grade && book.grade !== 'ALL' ? book.grade : '',
        book.subject || '',
        book.author || ''
      ].filter(Boolean).join(' • ') || 'MATHLVL kitobi';

      const bought = document.createElement('div');
      bought.className = 'profile-purchased-status';
      bought.textContent = 'Sotib olingan';

      info.appendChild(title);
      info.appendChild(meta);
      info.appendChild(bought);

      const openBtn = document.createElement('button');
      openBtn.type = 'button';
      openBtn.className = 'ghost-btn profile-purchased-open';
      openBtn.textContent = 'Ochish';
      openBtn.addEventListener('click', ()=> openPurchasedBookFromProfile(book.id));

      row.appendChild(cover);
      row.appendChild(info);
      row.appendChild(openBtn);
      list.appendChild(row);
    });

    const error = document.createElement('div');
    error.className = 'profile-books-error';
    error.hidden = true;

    el.innerHTML = '';
    el.appendChild(list);
    el.appendChild(error);
  }catch(err){
    el.innerHTML = '<div class="profile-books-empty">Sotib olingan kitoblarni yuklab bo‘lmadi.</div>';
  }
}

// ---- Tarif tanlash ekrani ----
let paymentSettings = { cardNumber: '', cardHolder: '', monthlyPrice: 0, yearlyPrice: 0 };
let selectedCycle = 'monthly';
let pendingBookPurchase = null;

async function loadPaymentSettings(){
  try{
    const res = await fetch('/api/gift?action=payment-settings');
    paymentSettings = await res.json();
  }catch(e){}
}

async function openBookPurchase(book){
  if(!book || !book.id) return;
  await loadPaymentSettings();

  if(!paymentSettings.cardNumber || !paymentSettings.cardHolder){
    alert("Kitob xaridi uchun to‘lov hali sozlanmagan.");
    return;
  }
  const price = Number(book.price) || 0;
  if(price <= 0){
    alert("Bu kitob uchun narx hali belgilanmagan.");
    return;
  }

  pendingBookPurchase = book;
  document.getElementById('plan-select-overlay').classList.add('open');
  document.getElementById('plan-card-view').style.display = 'none';
  document.getElementById('payment-pending-view').style.display = 'none';
  document.getElementById('payment-instruction-view').style.display = 'block';
  document.getElementById('payment-amount').textContent = formatSom(price);
  document.getElementById('payment-card-number').textContent = paymentSettings.cardNumber;
  document.getElementById('payment-card-holder').textContent = paymentSettings.cardHolder;

  const status = document.getElementById('payment-submit-status');
  if(status){ status.textContent = `Kitob: ${book.title}`; status.classList.remove('err'); }
}

async function openPlanSelect(plusData){
  pendingBookPurchase = null;
  document.getElementById('plan-select-overlay').classList.add('open');
  document.getElementById('plan-card-view').style.display = 'block';
  document.getElementById('payment-instruction-view').style.display = 'none';
  document.getElementById('payment-pending-view').style.display = 'none';

  const noteEl = document.getElementById('current-plan-note');
  if(plusData && plusData.active){
    const dateStr = new Date(plusData.expiresAt).toLocaleDateString('uz-UZ', { day:'numeric', month:'long' });
    noteEl.style.display = 'block';
    noteEl.innerHTML = `<div class="glass-card profile-section-card" style="margin-bottom:16px;">
      <div style="font-size:12px; color:var(--text-dim); margin-bottom:6px;">Sizning hozirgi tarifingiz</div>
      <div style="color:var(--gold); font-family:var(--font-display);">MATHLVL Plus — Faol, ${dateStr}gacha</div>
    </div>`;
  }else{
    noteEl.style.display = 'none';
    noteEl.innerHTML = '';
  }
  await loadPaymentSettings();
  updatePlanPriceDisplay();

  // Agar kutilayotgan to'lov bo'lsa, shuni ko'rsatish
  try{
    const myPayRes = await fetch('/api/gift?action=my-payment');
    const myPay = await myPayRes.json();
    if(myPay.payment && myPay.payment.status === 'PENDING'){
      document.getElementById('plan-card-view').style.display = 'none';
      document.getElementById('payment-pending-view').style.display = 'block';
    }
  }catch(e){}
}
document.getElementById('plan-select-back').addEventListener('click', ()=>{
  document.getElementById('plan-select-overlay').classList.remove('open');
});
document.querySelectorAll('.plan-toggle-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.plan-toggle-btn').forEach(b=> b.classList.remove('active'));
    btn.classList.add('active');
    selectedCycle = btn.dataset.cycle;
    updatePlanPriceDisplay();
  });
});
function formatSom(n){
  return n ? n.toLocaleString('uz-UZ') + " so'm" : "Narx hali belgilanmagan";
}
function updatePlanPriceDisplay(){
  const price = selectedCycle === 'monthly' ? paymentSettings.monthlyPrice : paymentSettings.yearlyPrice;
  const label = selectedCycle === 'monthly' ? '/ oy' : '/ yil';
  document.getElementById('plan-price').textContent = price ? `${formatSom(price)} ${label}` : "Narx tez orada e'lon qilinadi";
}
document.getElementById('plan-purchase-btn').addEventListener('click', ()=>{
  if(!paymentSettings.cardNumber){
    document.getElementById('plan-purchase-status').textContent = "To'lov hali sozlanmagan. Sovg'a kodi orqali faollashtirishingiz mumkin.";
    document.getElementById('plan-purchase-status').classList.add('err');
    return;
  }
  const price = selectedCycle === 'monthly' ? paymentSettings.monthlyPrice : paymentSettings.yearlyPrice;
  document.getElementById('payment-amount').textContent = formatSom(price);
  document.getElementById('payment-card-number').textContent = paymentSettings.cardNumber;
  document.getElementById('payment-card-holder').textContent = paymentSettings.cardHolder;
  document.getElementById('plan-card-view').style.display = 'none';
  document.getElementById('payment-instruction-view').style.display = 'block';
});
document.getElementById('payment-instruction-back-btn').addEventListener('click', ()=>{
  document.getElementById('payment-instruction-view').style.display = 'none';
  document.getElementById('plan-card-view').style.display = 'block';
});
document.getElementById('payment-copy-card-btn').addEventListener('click', ()=>{
  navigator.clipboard.writeText(paymentSettings.cardNumber);
  const btn = document.getElementById('payment-copy-card-btn');
  btn.textContent = 'Nusxalandi ✓';
  setTimeout(()=> btn.textContent = 'Karta raqamini nusxalash', 1500);
});
document.getElementById('payment-submit-btn').addEventListener('click', async ()=>{
  const fileInput = document.getElementById('payment-screenshot-input');
  const statusEl = document.getElementById('payment-submit-status');
  const btn = document.getElementById('payment-submit-btn');
  const file = fileInput.files[0];
  if(!file){
    statusEl.textContent = "Chek rasmini yuklang.";
    statusEl.classList.add('err');
    return;
  }
  btn.disabled = true;
  statusEl.classList.remove('err');
  statusEl.textContent = "Yuklanmoqda...";
  try{
    const safeName = String(file.name || 'receipt.jpg').replace(/[^a-zA-Z0-9._-]+/g,'-').slice(-100);
    const blobResult = await window.__blobUpload(`payment/${Date.now()}-${safeName}`, file, {
      access: 'public',
      handleUploadUrl: '/api/upload'
    });
    statusEl.textContent = "Yuborilmoqda...";
    const res = await fetch('/api/gift', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        pendingBookPurchase
          ? { action:'submit-payment', kind:'book', bookId:pendingBookPurchase.id, screenshotUrl:blobResult.url }
          : { action:'submit-payment', kind:'plus', plan:selectedCycle, screenshotUrl:blobResult.url }
      )
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || "Yuborib bo'lmadi");

    document.getElementById('payment-instruction-view').style.display = 'none';
    document.getElementById('payment-pending-view').style.display = 'block';
  }catch(err){
    statusEl.textContent = "Nimadir xato ketdi. Qayta urinib ko'ring.";
    statusEl.classList.add('err');
  }finally{
    btn.disabled = false;
  }
});
document.getElementById('plan-open-redeem-btn').addEventListener('click', openRedeemScreen);
document.getElementById('open-redeem-btn').addEventListener('click', ()=> openRedeemScreen());

// ---- Sovg'ani faollashtirish ekrani ----
function openRedeemScreen(){
  document.getElementById('redeem-screen-overlay').classList.add('open');
}
document.getElementById('redeem-screen-back').addEventListener('click', ()=>{
  document.getElementById('redeem-screen-overlay').classList.remove('open');
  stopQrScanner();
});

async function handleRedeemFlow(){
  const params = new URLSearchParams(window.location.search);
  const redeemCode = params.get('redeem');
  if(!redeemCode) return;

  const overlay = document.getElementById('redeem-overlay');
  const content = document.getElementById('redeem-content');
  overlay.style.display = 'flex';

  const meRes = await fetch('/api/auth');
  const me = await meRes.json();

  if(!me.loggedIn){
    content.innerHTML = `
      <div style="font-size:32px; margin-bottom:12px;">🎁</div>
      <h3 style="font-family:var(--font-display); margin-bottom:10px;">Sizga MATHLVL Plus sovg'a qilindi!</h3>
      <p style="color:var(--text-dim); font-size:13.5px; margin-bottom:20px;">Sovg'ani faollashtirish uchun avval hisobingizga kiring.</p>
      <button class="glow-btn" id="redeem-login-btn" style="width:100%;">Google bilan kirish</button>
    `;
    document.getElementById('redeem-login-btn').addEventListener('click', ()=>{
      window.location.href = '/api/auth-google-start?redeem=' + encodeURIComponent(redeemCode);
    });
    return;
  }

  content.innerHTML = `<div style="color:var(--text-dim); font-size:13.5px;">Tekshirilmoqda...</div>`;
  try{
    const previewRes = await fetch('/api/gift', {
      method:'POST', headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ action:'preview', code: redeemCode })
    });
    const preview = await previewRes.json();
    const errMessages = {
      already_used: "Bu sovg'a kodi allaqachon faollashtirilgan.",
      expired: "Ushbu sovg'a kodining amal qilish muddati tugagan.",
      revoked: "Ushbu sovg'a kodi endi faol emas.",
      not_found: "Sovg'a kodi topilmadi."
    };
    if(!previewRes.ok){
      content.innerHTML = `
        <div style="font-size:32px; margin-bottom:12px;">😕</div>
        <p style="color:var(--text-dim); font-size:14px; margin-bottom:20px;">${errMessages[preview.error] || "Nimadir xato ketdi."}</p>
        <button class="ghost-btn" id="redeem-close-btn" style="width:100%;">Yopish</button>
      `;
      document.getElementById('redeem-close-btn').addEventListener('click', ()=>{
        overlay.style.display = 'none';
        window.history.replaceState({}, '', window.location.pathname);
      });
      return;
    }

    content.innerHTML = `
      <div style="font-size:32px; margin-bottom:12px;">🎁</div>
      <h3 style="font-family:var(--font-display); margin-bottom:10px;">Sizga MATHLVL Plus sovg'a qilindi</h3>
      <p style="color:var(--text-dim); font-size:14px; margin-bottom:20px;">${preview.durationDays} kunlik MATHLVL Plus</p>
      <div style="display:flex; gap:10px;">
        <button class="ghost-btn" id="redeem-cancel-btn" style="flex:1;">Bekor qilish</button>
        <button class="glow-btn" id="redeem-confirm-btn" style="flex:1;">Faollashtirish</button>
      </div>
    `;
    document.getElementById('redeem-cancel-btn').addEventListener('click', ()=>{
      overlay.style.display = 'none';
      window.history.replaceState({}, '', window.location.pathname);
    });
    document.getElementById('redeem-confirm-btn').addEventListener('click', async ()=>{
      content.innerHTML = `<div style="color:var(--text-dim); font-size:13.5px;">Faollashtirilmoqda...</div>`;
      const res = await fetch('/api/gift', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ action:'redeem', code: redeemCode })
      });
      const data = await res.json();
      if(!res.ok){
        content.innerHTML = `
          <div style="font-size:32px; margin-bottom:12px;">😕</div>
          <p style="color:var(--text-dim); font-size:14px; margin-bottom:20px;">${errMessages[data.error] || "Nimadir xato ketdi."}</p>
          <button class="ghost-btn" id="redeem-close-btn" style="width:100%;">Yopish</button>
        `;
      }else{
        const newDateStr = new Date(data.expiresAt).toLocaleDateString('uz-UZ', { day:'numeric', month:'long' });
        content.innerHTML = `
          <div style="font-size:32px; margin-bottom:12px;">🎉</div>
          <h3 style="font-family:var(--font-display); margin-bottom:10px;">MATHLVL Plus faollashtirildi!</h3>
          <p style="color:var(--text-dim); font-size:13.5px; margin-bottom:6px;">+${data.durationDays} kun</p>
          <p style="color:var(--text-dim); font-size:13px; margin-bottom:20px;">Yangi muddat: ${newDateStr}gacha</p>
          <button class="glow-btn" id="redeem-close-btn" style="width:100%;">Davom etish</button>
        `;
        refreshPlusStatus();
      }
      document.getElementById('redeem-close-btn').addEventListener('click', ()=>{
        overlay.style.display = 'none';
        window.history.replaceState({}, '', window.location.pathname);
      });
    });
  }catch(err){
    content.innerHTML = `<p style="color:var(--text-dim); font-size:14px;">Nimadir xato ketdi. Qayta urinib ko'ring.</p>`;
  }
}

async function refreshAuthState(){
  try{
    const res = await fetch('/api/auth');
    const data = await res.json();
    if(data.loggedIn){ showSignedInUI(data); restoreTeacherMemory(); }
    else{ showSignedOutUI(); }
  }catch(e){ showSignedOutUI(); }
}
document.getElementById('google-btn').addEventListener('click', ()=>{
  window.location.href = '/api/auth-google-start';
});
document.getElementById('logout-row').addEventListener('click', async ()=>{
  await fetch('/api/auth', { method:'POST' });
  window.location.reload();
});

const urlParams = new URLSearchParams(window.location.search);
if(urlParams.get('logged_in') === '1' && !urlParams.get('redeem')){
  activateTab('profile');
  window.history.replaceState({}, '', window.location.pathname);
}else if(urlParams.get('login_error') === '1'){
  window.history.replaceState({}, '', window.location.pathname);
}
handleRedeemFlow();

let qrScannerInstance = null;
function extractRedeemCode(scannedText){
  try{
    const url = new URL(scannedText);
    const fromParam = url.searchParams.get('redeem');
    if(fromParam) return fromParam;
  }catch(e){}
  return scannedText.trim();
}
document.getElementById('qr-scan-btn').addEventListener('click', async ()=>{
  const wrap = document.getElementById('qr-scanner-wrap');
  wrap.style.display = 'block';
  const statusEl = document.getElementById('manual-redeem-status');
  statusEl.textContent = '';
  statusEl.classList.remove('err');
  try{
    qrScannerInstance = new Html5Qrcode('qr-scanner-view');
    await qrScannerInstance.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: 220 },
      (decodedText)=>{
        document.getElementById('manual-redeem-input').value = extractRedeemCode(decodedText);
        stopQrScanner();
        document.getElementById('manual-redeem-btn').click();
      },
      ()=>{}
    );
  }catch(err){
    statusEl.textContent = "Kameraga ruxsat berilmadi yoki kamera topilmadi.";
    statusEl.classList.add('err');
    wrap.style.display = 'none';
  }
});
function stopQrScanner(){
  document.getElementById('qr-scanner-wrap').style.display = 'none';
  if(qrScannerInstance){
    qrScannerInstance.stop().then(()=> qrScannerInstance.clear()).catch(()=>{});
    qrScannerInstance = null;
  }
}
document.getElementById('qr-scan-close-btn').addEventListener('click', stopQrScanner);

document.getElementById('manual-redeem-btn').addEventListener('click', async ()=>{
  const input = document.getElementById('manual-redeem-input');
  const code = input.value.trim();
  const statusEl = document.getElementById('manual-redeem-status');
  const btn = document.getElementById('manual-redeem-btn');
  if(!code){
    statusEl.textContent = "Kodni kiriting.";
    statusEl.classList.add('err');
    return;
  }
  btn.disabled = true;
  statusEl.classList.remove('err');
  statusEl.textContent = "Tekshirilmoqda...";
  const errMessages = {
    already_used: "Bu sovg'a kodi allaqachon faollashtirilgan.",
    expired: "Ushbu sovg'a kodining amal qilish muddati tugagan.",
    revoked: "Ushbu sovg'a kodi endi faol emas.",
    not_found: "Sovg'a kodi topilmadi.",
    not_logged_in: "Avval hisobingizga kiring."
  };
  try{
    const previewRes = await fetch('/api/gift', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action:'preview', code })
    });
    const preview = await previewRes.json();
    if(!previewRes.ok){
      statusEl.textContent = errMessages[preview.error] || "Nimadir xato ketdi. Qayta urinib ko'ring.";
      statusEl.classList.add('err');
      btn.disabled = false;
      return;
    }

    if(!confirm(`Sizga MATHLVL Plus sovg'a qilindi — ${preview.durationDays} kunlik. Faollashtirilsinmi?`)){
      statusEl.textContent = '';
      btn.disabled = false;
      return;
    }

    statusEl.textContent = "Faollashtirilmoqda...";
    const res = await fetch('/api/gift', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action:'redeem', code })
    });
    const data = await res.json();
    if(!res.ok){
      statusEl.textContent = errMessages[data.error] || "Nimadir xato ketdi. Qayta urinib ko'ring.";
      statusEl.classList.add('err');
    }else{
      statusEl.textContent = `${data.durationDays} kunlik MATHLVL Plus faollashtirildi.`;
      input.value = '';
      refreshPlusStatus();
    }
  }catch(err){
    statusEl.textContent = "Nimadir xato ketdi. Qayta urinib ko'ring.";
    statusEl.classList.add('err');
  }finally{
    btn.disabled = false;
  }
});
refreshAuthState();

// ================= DASHBOARD (Bosh sahifa) =================
function refreshDashboard(){
  const subEl = document.getElementById('dash-sub-text');
  if(subEl) subEl.textContent = "Bugun nima o‘rganamiz?";
}
document.querySelectorAll('.hpp-link[data-home-target]').forEach(item=>{
  item.addEventListener('click', ()=>{
    activateTab(item.dataset.homeTarget);
  });
});

(async ()=>{
  await loadBooks();
  await syncMockHistoryFromServer();
  refreshDashboard();
})();

// ================= MILLIY SERTIFIKAT MOCK TEST =================
// Format is based on BBA/UZBMB's published mathematics national-certificate structure:
// 35 closed questions + 10 open questions, each open question has A/B parts = 55 scored response elements.
// Time: 150 minutes. Questions below are original MATHLVL practice questions, not copied official items.
let mockTestData = [
  {
    id:'ms-full-1',
    title:'Matematika — Milliy sertifikat Mock #1',
    minutes:150,
    closedCount:35,
    openCount:10,
    closed:[
      {q:'$2x+5=17$ tenglamaning yechimini toping.',o:['4','5','6','7'],a:2},
      {q:'$x^2-7x+10=0$ tenglama ildizlari ko‘paytmasini toping.',o:['7','10','12','17'],a:1},
      {q:'$3^x=27$ bo‘lsa, $x$ ni toping.',o:['2','3','4','9'],a:1},
      {q:'$\\log_2 32$ ning qiymatini toping.',o:['4','5','6','8'],a:1},
      {q:'Arifmetik progressiyada $a_1=5$, $d=4$. $a_{10}$ ni toping.',o:['37','39','41','45'],a:2},
      {q:'Geometrik progressiyada $b_1=3$, $q=2$. $b_6$ ni toping.',o:['48','64','96','192'],a:2},
      {q:'$\\sqrt{50}$ ifodani soddalashtiring.',o:['$2\\sqrt5$','$5\\sqrt2$','$10\\sqrt5$','$25\\sqrt2$'],a:1},
      {q:'$\\frac{1}{x-1}=\\frac13$ tenglamaning yechimini toping.',o:['2','3','4','5'],a:2},
      {q:'$|2x-5|=7$ tenglama yechimlari yig‘indisini toping.',o:['3','4','5','7'],a:2},
      {q:'$x+y=11$, $x-y=3$ sistemada $x$ ni toping.',o:['4','6','7','8'],a:2},
      {q:'$f(x)=2x^2-3$ bo‘lsa, $f(2)$ ni toping.',o:['1','5','8','13'],a:1},
      {q:'$y=\\sqrt{5-x}$ funksiyaning aniqlanish sohasini toping.',o:['$x<5$','$x\\le5$','$x\\ge5$','$x>5$'],a:1},
      {q:'$y=x^2-6x+11$ parabola uchining abssissasini toping.',o:['2','3','4','6'],a:1},
      {q:'$3x-4>8$ tengsizlikni yeching.',o:['$x>3$','$x>4$','$x<4$','$x\\ge4$'],a:1},
      {q:'$\\sin30^\\circ$ ning qiymatini toping.',o:['$0$','$\\frac12$','$\\frac{\\sqrt2}{2}$','$1$'],a:1},
      {q:'$\\cos60^\\circ$ ning qiymatini toping.',o:['$0$','$\\frac12$','$\\frac{\\sqrt3}{2}$','$1$'],a:1},
      {q:'$\\tan45^\\circ$ ning qiymatini toping.',o:['$0$','$\\frac12$','$1$','$\\sqrt3$'],a:2},
      {q:'$\\sin^2\\alpha+\\cos^2\\alpha$ nimaga teng?',o:['0','1','$\\sin2\\alpha$','$\\cos2\\alpha$'],a:1},
      {q:'Uchburchakning ikki burchagi $35^\\circ$ va $65^\\circ$. Uchinchi burchakni toping.',o:['$70^\\circ$','$75^\\circ$','$80^\\circ$','$90^\\circ$'],a:2},
      {q:'Katetlari 8 va 15 bo‘lgan to‘g‘ri burchakli uchburchak gipotenuzasini toping.',o:['16','17','18','23'],a:1},
      {q:'Radiusi 6 bo‘lgan doiraning yuzini toping.',o:['$12\\pi$','$18\\pi$','$36\\pi$','$72\\pi$'],a:2},
      {q:'Radiusi 5 bo‘lgan aylananing uzunligini toping.',o:['$5\\pi$','$10\\pi$','$20\\pi$','$25\\pi$'],a:1},
      {q:'Tomonlari 7 va 11 bo‘lgan to‘g‘ri to‘rtburchak yuzini toping.',o:['18','36','72','77'],a:3},
      {q:'Asoslari 6 va 10, balandligi 4 bo‘lgan trapetsiya yuzini toping.',o:['24','28','32','64'],a:2},
      {q:'Muntazam oltiburchakning bitta ichki burchagini toping.',o:['$108^\\circ$','$120^\\circ$','$135^\\circ$','$144^\\circ$'],a:1},
      {q:'$C_6^2$ ning qiymatini toping.',o:['12','15','20','30'],a:1},
      {q:'Oddiy kubik tashlanganda 4 dan katta son tushish ehtimolini toping.',o:['$\\frac16$','$\\frac13$','$\\frac12$','$\\frac23$'],a:1},
      {q:'4, 6, 8, 10 sonlarining o‘rta arifmetigini toping.',o:['6','7','8','9'],a:1},
      {q:'84 va 126 sonlarining EKUBini toping.',o:['21','28','42','63'],a:2},
      {q:'12 va 18 sonlarining EKUKini toping.',o:['24','30','36','72'],a:2},
      {q:'$2^5$ sonini 5 ga bo‘lgandagi qoldiqni toping.',o:['0','1','2','3'],a:2},
      {q:'$f(x)=x^3-2x$ bo‘lsa, $f\'(1)$ ni toping.',o:['-1','0','1','3'],a:2},
      {q:'$\\int_0^2 x\\,dx$ ni hisoblang.',o:['1','2','3','4'],a:1},
      {q:'$1+2+3+\\dots+20$ yig‘indini toping.',o:['190','200','210','220'],a:2},
      {q:'$x^2+4x+5=0$ tenglama nechta haqiqiy ildizga ega?',o:['0','1','2','4'],a:0}
    ],
    open:[
      {q:'$x^2-5x+6=0$ tenglamaning ildizlarini toping.',parts:[{label:'A',ask:'Kichik ildiz',ans:'2'},{label:'B',ask:'Katta ildiz',ans:'3'}]},
      {q:'Arifmetik progressiyada $a_1=7$, $d=5$.',parts:[{label:'A',ask:'$a_{15}$ ni toping',ans:'77'},{label:'B',ask:'$S_{15}$ ni toping',ans:'630'}]},
      {q:'Koordinata tekisligida $A(0,0)$ va $B(6,8)$ nuqtalar berilgan. Shuningdek $C(2,4)$ va $D(8,10)$ nuqtalar berilgan.',parts:[{label:'A',ask:'$AB$ masofani toping',ans:'10'},{label:'B',ask:'$CD$ kesmaning o‘rta nuqtasi ordinatasini toping',ans:'7'}]},
      {q:'Radiusi 4 bo‘lgan aylana va doira uchun javoblarda $\\pi$ oldidagi koeffitsientni yozing.',parts:[{label:'A',ask:'Aylana uzunligidagi koeffitsient',ans:'8'},{label:'B',ask:'Doira yuzidagi koeffitsient',ans:'16'}]},
      {q:'$\\alpha$ o‘tkir burchak va $\\sin\\alpha=\\frac35$.',parts:[{label:'A',ask:'$\\cos\\alpha$ ni toping',ans:'4/5'},{label:'B',ask:'$\\tan\\alpha$ ni toping',ans:'3/4'}]},
      {q:'Darajali va logarifmik tenglamalarni yeching.',parts:[{label:'A',ask:'$2^{x+1}=16$ tenglamada $x$',ans:'3'},{label:'B',ask:'$\\log_3\\frac1{27}$ ning qiymati',ans:'-3'}]},
      {q:'$f(x)=x^2+1$, $g(x)=2x-3$.',parts:[{label:'A',ask:'$f(3)$ ni toping',ans:'10'},{label:'B',ask:'$g(f(2))$ ni toping',ans:'7'}]},
      {q:'Qutida 3 ta qizil va 2 ta ko‘k shar bor. Sharlar teng ehtimol bilan olinadi.',parts:[{label:'A',ask:'Bitta shar qizil chiqish ehtimoli',ans:'3/5'},{label:'B',ask:'Ketma-ket 2 ta shar qaytarmasdan olinganda ikkalasi ham qizil bo‘lish ehtimoli',ans:'3/10'}]},
      {q:'Hosila va integralni hisoblang.',parts:[{label:'A',ask:'$f(x)=x^3-3x^2+2x$ uchun $f\'(2)$',ans:'2'},{label:'B',ask:'$\\int_0^1(2x+1)\\,dx$',ans:'2'}]},
      {q:'Katetlari 9 va 12 bo‘lgan to‘g‘ri burchakli uchburchak berilgan.',parts:[{label:'A',ask:'Gipotenuzani toping',ans:'15'},{label:'B',ask:'Uchburchak yuzini toping',ans:'54'}]}
    ]
  }
];

let activeMock = null;
let mockIndex = 0; // 0..44
let mockClosedAnswers = [];
let mockOpenAnswers = [];
let mockSecondsLeft = 0;
let mockTimerId = null;
const MOCK_DRAFT_KEY = 'mathlvl_mock_draft_v1';
function saveMockDraft(){
  if(!activeMock) return;
  try{
    localStorage.setItem(MOCK_DRAFT_KEY, JSON.stringify({
      testId: activeMock.id,
      mockIndex,
      closed: mockClosedAnswers,
      open: mockOpenAnswers,
      secondsLeft: mockSecondsLeft,
      updatedAt: Date.now()
    }));
  }catch(e){}
}
function loadMockDraft(testId){
  try{
    const draft = JSON.parse(localStorage.getItem(MOCK_DRAFT_KEY) || 'null');
    if(!draft || draft.testId !== testId) return null;
    if(Date.now() - Number(draft.updatedAt || 0) > 7 * 86400000) return null;
    return draft;
  }catch(e){ return null; }
}
function clearMockDraft(){
  try{ localStorage.removeItem(MOCK_DRAFT_KEY); }catch(e){}
}
async function syncMockHistoryFromServer(){
  try{
    const res = await fetch('/api/progress?action=mock-history', {credentials:'include',cache:'no-store'});
    if(!res.ok) return;
    const data = await res.json();
    let local = [];
    try{ local = JSON.parse(localStorage.getItem('mathlvl_mock_results') || '[]'); }catch(e){}
    const merged = new Map();
    [...(data.results || []), ...local].forEach(item=>{
      if(!item || !item.at || !item.title) return;
      const key = `${item.title}|${item.at}`;
      if(!merged.has(key)) merged.set(key, item);
    });
    const results = Array.from(merged.values())
      .sort((a,b)=>new Date(b.at).getTime()-new Date(a.at).getTime())
      .slice(0,50);
    localStorage.setItem('mathlvl_mock_results', JSON.stringify(results));

    const remoteKeys = new Set((data.results || []).map(item=>`${item.title}|${item.at}`));
    await Promise.all(local.filter(item=>item?.title && item?.at && !remoteKeys.has(`${item.title}|${item.at}`)).slice(0,20).map(item=>
      fetch('/api/progress?action=mock-history', {
        method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(item)
      }).catch(()=>{})
    ));
  }catch(e){}
}
function saveMockResultToServer(result){
  fetch('/api/progress?action=mock-history', {
    method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify(result)
  }).catch(()=>{});
}

function renderMockMath(el){
  if(!el || typeof renderMathInElement !== 'function') return;
  try{ renderMathInElement(el,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}]}); }catch(e){}
}

function normalizeMockAnswer(v){
  return String(v ?? '').trim().toLowerCase().replace(/\s+/g,'').replace(/,/g,'.');
}
function isMockAnswerCorrect(given, expected){
  const g = normalizeMockAnswer(given);
  const e = normalizeMockAnswer(expected);
  if(!g) return false;
  if(g === e) return true;
  const frac = s => {
    if(/^[-+]?\d+(\.\d+)?\/[-+]?\d+(\.\d+)?$/.test(s)){
      const [a,b] = s.split('/').map(Number);
      return b !== 0 ? a/b : NaN;
    }
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  };
  const gn = frac(g), en = frac(e);
  return Number.isFinite(gn) && Number.isFinite(en) && Math.abs(gn-en) < 1e-9;
}

function mockTotalQuestions(t){ return t.closed.length + t.open.length; }
function mockTotalElements(t){
  return t.closed.length + t.open.reduce((total, question) => total + question.parts.length, 0);
}
function normalizeStoredMock(test){
  if(Array.isArray(test.closed) && Array.isArray(test.open)) return test;
  const closed = Array.isArray(test.questions) ? test.questions : [];
  return { ...test, closed, open:[], closedCount:closed.length, openCount:0 };
}
async function loadMockTests(){
  try{
    const res = await fetch('/api/mocks');
    const data = await res.json();
    if(res.ok && Array.isArray(data.mocks)){
      const byId = new Map(mockTestData.map(test => [test.id, test]));
      data.mocks.map(normalizeStoredMock).forEach(test => {
        if(test && test.id && test.closed.length) byId.set(test.id, test);
      });
      mockTestData = Array.from(byId.values());
    }
  }catch(e){}
  renderMockTestList();
}
function mockAnsweredElements(){
  if(!activeMock) return 0;
  const closed = mockClosedAnswers.filter(v => v !== null).length;
  let open = 0;
  mockOpenAnswers.forEach(row => row.forEach(v => { if(String(v ?? '').trim()) open++; }));
  return closed + open;
}

function renderMockTestList(){
  if(mockTimerId) clearInterval(mockTimerId);
  mockTimerId = null;
  activeMock = null;
  const list = document.getElementById('mocktest-list');
  if(!list) return;
  list.innerHTML = mockTestData.map(t => `
    <div class="mt-card">
      <div class="mt-card-icon" style="background:rgba(61,169,252,.14);color:var(--blue);">π</div>
      <div class="mt-card-body">
        <div class="mt-card-title">${t.title}</div>
        <div class="mt-card-meta">${mockTotalQuestions(t)} ta topshiriq • ${mockTotalElements(t)} ta javob elementi • ${t.minutes} daqiqa</div>
        <div class="mt-card-result">${t.open.length ? `${t.closed.length} ta yopiq + ${t.open.length} ta ochiq (A/B qismlar). BBA formatiga mos mashq varianti.` : `${t.closed.length} ta yopiq savoldan iborat MATHLVL mock testi.`}</div>
      </div>
      <button class="glow-btn mt-card-start" type="button" data-mt-start="${t.id}">Boshlash</button>
    </div>`).join('');
  list.querySelectorAll('[data-mt-start]').forEach(btn => btn.addEventListener('click', () => startMockTest(btn.dataset.mtStart)));
}

function startMockTest(id){
  activeMock = mockTestData.find(t => t.id === id);
  if(!activeMock) return;
  const savedDraft = loadMockDraft(activeMock.id);
  if(savedDraft){
    mockIndex = Math.max(0, Math.min(mockTotalQuestions(activeMock)-1, Number(savedDraft.mockIndex) || 0));
    mockClosedAnswers = Array.isArray(savedDraft.closed) && savedDraft.closed.length === activeMock.closed.length
      ? savedDraft.closed : Array(activeMock.closed.length).fill(null);
    mockOpenAnswers = Array.isArray(savedDraft.open) && savedDraft.open.length === activeMock.open.length
      ? savedDraft.open : activeMock.open.map(q => q.parts.map(() => ''));
    mockSecondsLeft = Math.max(1, Math.min(activeMock.minutes * 60, Number(savedDraft.secondsLeft) || activeMock.minutes * 60));
  }else{
    mockIndex = 0;
    mockClosedAnswers = Array(activeMock.closed.length).fill(null);
    mockOpenAnswers = activeMock.open.map(q => q.parts.map(() => ''));
    mockSecondsLeft = activeMock.minutes * 60;
  }
  if(mockTimerId) clearInterval(mockTimerId);
  mockTimerId = setInterval(() => {
    mockSecondsLeft = Math.max(0, mockSecondsLeft - 1);
    updateMockClock();
    if(mockSecondsLeft > 0 && mockSecondsLeft % 5 === 0) saveMockDraft();
    if(mockSecondsLeft === 0) finishMockTest(true);
  }, 1000);
  renderMockQuestion();
}

function updateMockClock(){
  const el = document.getElementById('mock-clock');
  if(!el) return;
  const h = Math.floor(mockSecondsLeft / 3600);
  const m = Math.floor((mockSecondsLeft % 3600) / 60);
  const s = mockSecondsLeft % 60;
  el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function renderMockQuestion(){
  if(!activeMock) return;
  const list = document.getElementById('mocktest-list');
  const totalQ = mockTotalQuestions(activeMock);
  const isClosed = mockIndex < activeMock.closed.length;
  const localIndex = isClosed ? mockIndex : mockIndex - activeMock.closed.length;
  const q = isClosed ? activeMock.closed[localIndex] : activeMock.open[localIndex];
  const sectionLabel = isClosed ? 'Yopiq test' : 'Ochiq test — A/B qismlar';

  list.innerHTML = `
    <div class="glass-card" style="padding:20px;">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap;">
        <div><b>${activeMock.title}</b><div style="font-size:12px;color:var(--text-dim);margin-top:4px;">${sectionLabel} • ${mockIndex+1}/${totalQ}-topshiriq</div></div>
        <div id="mock-clock" style="color:var(--gold);font-family:var(--font-mono);font-weight:800;"></div>
      </div>
      <div id="mock-question-text" style="font-size:17px;line-height:1.65;font-weight:600;margin:20px 0;"></div>
      <div id="mock-answer-area"></div>
      <div style="font-size:11.5px;color:var(--text-dim);margin-top:18px;">Javob berilgan: ${mockAnsweredElements()}/${mockTotalElements(activeMock)} element</div>
      <div id="mock-nav-grid" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:14px;"></div>
      <div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap;">
        <button class="ghost-btn" id="mock-prev" type="button" ${mockIndex===0?'disabled':''}>← Oldingi</button>
        <button class="glow-btn" id="mock-next" type="button">${mockIndex===totalQ-1?'Yakunlash':'Keyingi →'}</button>
        <button class="ghost-btn" id="mock-exit" type="button" style="margin-left:auto;">Testdan chiqish</button>
      </div>
    </div>`;

  const questionEl = document.getElementById('mock-question-text');
  questionEl.textContent = q.q;
  renderMockMath(questionEl);

  const answerArea = document.getElementById('mock-answer-area');
  if(isClosed){
    answerArea.style.display = 'grid';
    answerArea.style.gap = '10px';
    const letters = ['A','B','C','D'];
    q.o.forEach((text, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ghost-btn';
      btn.style.width = '100%';
      btn.style.textAlign = 'left';
      if(mockClosedAnswers[localIndex] === i){
        btn.style.borderColor = 'var(--blue)';
        btn.style.background = 'var(--blue-soft)';
      }
      const span = document.createElement('span');
      span.textContent = `${letters[i]}) ${text}`;
      btn.appendChild(span);
      renderMockMath(span);
      btn.addEventListener('click', () => { mockClosedAnswers[localIndex] = i; saveMockDraft(); renderMockQuestion(); });
      answerArea.appendChild(btn);
    });
  }else{
    answerArea.innerHTML = q.parts.map((p,pi)=>`
      <div style="margin:12px 0;padding:14px;border:1px solid var(--border-soft);border-radius:12px;">
        <div class="mock-open-label" style="font-weight:700;margin-bottom:8px;">${p.label}) ${p.ask}</div>
        <input type="text" inputmode="decimal" class="mock-open-input" data-open-part="${pi}" placeholder="Qisqa javobni kiriting" value="${escapeHtml(mockOpenAnswers[localIndex][pi] || '')}">
      </div>`).join('');
    answerArea.querySelectorAll('.mock-open-label').forEach(renderMockMath);
    answerArea.querySelectorAll('.mock-open-input').forEach(inp=>{
      inp.addEventListener('input', ()=>{ mockOpenAnswers[localIndex][Number(inp.dataset.openPart)] = inp.value; saveMockDraft(); });
    });
  }

  const nav = document.getElementById('mock-nav-grid');
  for(let i=0;i<totalQ;i++){
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ghost-btn';
    btn.textContent = i + 1;
    btn.style.padding = '7px 10px';
    const answered = i < activeMock.closed.length
      ? mockClosedAnswers[i] !== null
      : mockOpenAnswers[i-activeMock.closed.length].some(v => String(v||'').trim());
    if(i === mockIndex) btn.style.borderColor = 'var(--gold)';
    else if(answered) btn.style.borderColor = 'var(--blue)';
    btn.addEventListener('click', () => { mockIndex = i; saveMockDraft(); renderMockQuestion(); });
    nav.appendChild(btn);
  }

  document.getElementById('mock-prev').addEventListener('click', () => {
    if(mockIndex > 0){ mockIndex--; saveMockDraft(); renderMockQuestion(); }
  });
  document.getElementById('mock-next').addEventListener('click', () => {
    if(mockIndex < totalQ - 1){ mockIndex++; saveMockDraft(); renderMockQuestion(); }
    else if(confirm('Test yakunlansinmi?')) finishMockTest(false);
  });
  document.getElementById('mock-exit').addEventListener('click', () => {
    if(confirm('Testdan chiqilsinmi? Javoblaringiz saqlanadi va keyin davom ettirishingiz mumkin.')){ saveMockDraft(); renderMockTestList(); }
  });
  updateMockClock();
}

function finishMockTest(autoFinish){
  if(!activeMock) return;
  if(mockTimerId) clearInterval(mockTimerId);
  mockTimerId = null;

  let correctClosed = 0;
  activeMock.closed.forEach((q,i) => { if(mockClosedAnswers[i] === q.a) correctClosed++; });
  let correctOpen = 0;
  activeMock.open.forEach((q,qi) => q.parts.forEach((p,pi) => {
    if(isMockAnswerCorrect(mockOpenAnswers[qi][pi], p.ans)) correctOpen++;
  }));
  const correct = correctClosed + correctOpen;
  const totalElements = mockTotalElements(activeMock);
  const answered = mockAnsweredElements();
  const percent = Math.round(correct / totalElements * 100);
  const feedbackItems = [];
  const feedbackLetters = ['A','B','C','D'];
  activeMock.closed.forEach((q,i) => {
    const givenIndex = mockClosedAnswers[i];
    feedbackItems.push({
      label:String(i + 1),
      section:'Yopiq',
      question:q.q,
      given:givenIndex === null ? '' : (q.o[givenIndex] || ''),
      expected:q.o[q.a] || '',
      isCorrect:givenIndex === q.a
    });
  });
  activeMock.open.forEach((q,qi) => q.parts.forEach((part,pi) => {
    const given = mockOpenAnswers[qi][pi] || '';
    feedbackItems.push({
      label:`${activeMock.closed.length + qi + 1}${part.label || ''}`,
      section:'Ochiq A/B',
      question:`${q.q} ${part.label}) ${part.ask}`,
      given,
      expected:part.ans,
      isCorrect:isMockAnswerCorrect(given, part.ans)
    });
  }));
  const mockFeedbackPayload = {
    title:activeMock.title,
    correct,
    total:totalElements,
    answered,
    items:feedbackItems
  };
  const result = {title:activeMock.title,correct,total:totalElements,answered,percent,at:new Date().toISOString()};
  try{
    const history = JSON.parse(localStorage.getItem('mathlvl_mock_results') || '[]');
    history.unshift(result);
    localStorage.setItem('mathlvl_mock_results', JSON.stringify(history.slice(0,20)));
  }catch(e){}
  saveMockResultToServer(result);

  clearMockDraft();
  const list = document.getElementById('mocktest-list');
  list.innerHTML = `
    <div class="glass-card" style="text-align:center;padding:28px;">
      <div style="font-size:42px;">${percent>=70?'🏆':percent>=50?'📈':'📚'}</div>
      <h3>Mashq natijasi: ${correct}/${totalElements}</h3>
      <div style="font-size:30px;font-weight:800;color:var(--blue);">${percent}%</div>
      <div style="color:var(--text-dim);margin:8px 0 8px;">Yopiq: ${correctClosed}/${activeMock.closed.length} • Ochiq A/B: ${correctOpen}/${totalElements-activeMock.closed.length} • Javob berilgan: ${answered}/${totalElements}${autoFinish?' • Vaqt tugadi':''}</div>
      <div style="max-width:650px;margin:0 auto 20px;font-size:12px;line-height:1.55;color:var(--text-dim);">Bu MATHLVL mashq ko‘rsatkichi. Rasmiy Milliy sertifikat natijasi oddiy foiz bilan emas, BBAning statistik baholash usuli (Rash modeli) asosida hisoblanadi.</div>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
        <button class="glow-btn" id="mock-ai-feedback" type="button">✨ Ustoz AI tahlili · PLUS</button>
        <button class="ghost-btn" id="mock-back-list" type="button">Mock testlarga qaytish</button>
      </div>
      <div id="mock-ai-feedback-box" style="display:none;max-width:720px;margin:18px auto 0;text-align:left;padding:18px;border:1px solid var(--border-soft);border-radius:14px;background:rgba(255,255,255,.025);line-height:1.65;"></div>
    </div>`;
  document.getElementById('mock-back-list').addEventListener('click', renderMockTestList);
  document.getElementById('mock-ai-feedback').addEventListener('click', async ()=>{
    const btn = document.getElementById('mock-ai-feedback');
    const box = document.getElementById('mock-ai-feedback-box');
    btn.disabled = true;
    box.style.display = 'block';
    box.textContent = "Ustoz AI natijangizni tahlil qilmoqda...";
    try{
      const plusRes = await fetch('/api/gift?action=status', {credentials:'include', cache:'no-store'});
      const plusData = await plusRes.json().catch(()=>({active:false}));
      if(!plusData.active){
        box.style.display = 'none';
        await openPlanSelect({active:false});
        return;
      }

      const res = await fetch('/api/mock-feedback', {
        method:'POST',
        credentials:'include',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(mockFeedbackPayload)
      });
      const data = await res.json().catch(()=>({}));
      if(res.status === 401){
        box.style.display = 'none';
        if(typeof window.requireMathlvlAuth === 'function') window.requireMathlvlAuth('mock','mocktest');
        return;
      }
      if(res.status === 403){
        box.style.display = 'none';
        await openPlanSelect({active:false});
        return;
      }
      if(!res.ok) throw new Error(data.error || "Tahlilni olib bo‘lmadi");

      box.innerHTML = safeMarkdown(data.feedback || '');
      renderMockMath(box);
    }catch(err){
      box.textContent = err.message || "Ustoz AI tahlilini olishda muammo yuz berdi.";
    }finally{
      btn.disabled = false;
    }
  });
  activeMock = null;
}

const mockResultsBtn = document.getElementById('mocktest-results-btn');
if(mockResultsBtn){
  mockResultsBtn.addEventListener('click', () => {
    let history = [];
    try{ history = JSON.parse(localStorage.getItem('mathlvl_mock_results') || '[]'); }catch(e){}
    const list = document.getElementById('mocktest-list');
    list.innerHTML = `
      <div class="glass-card" style="padding:20px;">
        <h3 style="margin-top:0;">Oxirgi natijalar</h3>
        ${history.length ? history.map(r => `<div style="padding:10px 0;border-bottom:1px solid var(--border-soft);"><b>${r.title}</b><div style="font-size:12px;color:var(--text-dim);">${r.correct}/${r.total} element • ${r.percent}%</div></div>`).join('') : '<div class="empty-note">Hali natija yo‘q.</div>'}
        <button class="ghost-btn" id="mock-results-back" type="button" style="margin-top:16px;">Orqaga</button>
      </div>`;
    document.getElementById('mock-results-back').addEventListener('click', renderMockTestList);
  });
}

loadMockTests();
renderMockTestList();



let teacherMemoryReady = false;
let teacherMemoryLoading = null;
async function restoreTeacherMemory(){
  if(teacherMemoryReady) return;
  if(teacherMemoryLoading) return teacherMemoryLoading;
  teacherMemoryLoading = (async()=>{
    const label = document.getElementById('memory-status');
    label.textContent = 'Suhbat yuklanmoqda…';
    try{
      const response = await fetch('/api/chat?action=memory');
      if(!response.ok) throw new Error('memory');
      const data = await response.json();
      if(!chatHistory.length && Array.isArray(data.messages)){
        chatHistory = data.messages;
        for(const message of chatHistory) appendMsg(message.role === 'assistant' ? 'teacher' : 'user', message.content);
      }
      teacherMemoryReady = true;
      label.textContent = data.isGuest ? 'Mehmon rejimida suhbat xotiraga saqlanmaydi' : 'Oxirgi 20 xabar hisobingizda saqlanadi';
    }catch{ label.textContent = 'Xotira yuklanmadi. Suhbatni davom ettirishingiz mumkin.'; }
    finally{teacherMemoryLoading = null;}
  })();
  return teacherMemoryLoading;
}
document.getElementById('memory-clear').addEventListener('click',async()=>{
  if(chatAbortController || !confirm('Saqlangan suhbatni tozalaysizmi?')) return;
  const button=document.getElementById('memory-clear');button.disabled=true;
  try{
    const response=await fetch('/api/chat?action=memory',{method:'DELETE'});
    if(!response.ok) throw new Error('memory');
    chatHistory=[];teacherMemoryReady=true;
    document.getElementById('chat-window').querySelectorAll('.msg').forEach(el=>el.remove());
    document.getElementById('memory-status').textContent='Yangi suhbat boshlashingiz mumkin';
  }catch{document.getElementById('memory-status').textContent='Tozalab bo‘lmadi. Qayta urinib ko‘ring.';}
  finally{button.disabled=false;}
});
