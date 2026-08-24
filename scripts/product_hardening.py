from pathlib import Path
import base64
import re

INDEX = Path("index.html")
ADMIN = Path("admin.html")

def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f"{label} anchor not found")
    return text.replace(old, new, 1)

# =========================
# Public app hardening
# =========================
s = INDEX.read_text(encoding="utf-8")

# SEO / social preview
title_anchor = "<title>MATHLVL — matematika platformasi</title>"
if '<meta name="description"' not in s:
    seo = '''<title>MATHLVL — matematika platformasi</title>
<meta name="description" content="MATHLVL — matematika o‘rganish, Ustoz AI, Milliy sertifikat mock testlari va interaktiv kitoblar uchun platforma.">
<link rel="canonical" href="https://mathlvl.com/">
<meta name="theme-color" content="#0A0E1F">
<meta property="og:type" content="website">
<meta property="og:site_name" content="MATHLVL">
<meta property="og:title" content="MATHLVL — matematikani yangi darajada o‘rganing">
<meta property="og:description" content="Ustoz AI, Milliy sertifikat mock testlari va interaktiv matematika kitoblari — barchasi MATHLVL’da.">
<meta property="og:url" content="https://mathlvl.com/">
<meta property="og:image" content="https://mathlvl.com/mathlvl-logo.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="MATHLVL — matematikani yangi darajada o‘rganing">
<meta name="twitter:description" content="Ustoz AI, Milliy sertifikat mock testlari va interaktiv matematika kitoblari.">
<meta name="twitter:image" content="https://mathlvl.com/mathlvl-logo.png">'''
    s = replace_once(s, title_anchor, seo, "SEO title")

# Book file URLs are no longer exposed by the public list. Resolve the URL only at read time.
book_anchor = "function openBookInChat(book){"
if "async function resolveBookForReading(book)" not in s:
    secure_book = r'''async function resolveBookForReading(book){
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

function openBookInChat(book){'''
    s = replace_once(s, book_anchor, secure_book, "book secure resolver")

old_start = "  startBtn.onclick = ()=> startReading(book);"
new_start = r'''  startBtn.onclick = async ()=>{
    const readableBook = await resolveBookForReading(book);
    if(!readableBook) return;
    activeBook = readableBook;
    startReading(readableBook);
  };'''
s = replace_once(s, old_start, new_start, "book start access")

old_dash = "    setTimeout(()=>{ openBookInChat(book); startReading(book); }, 80);"
new_dash = r'''    setTimeout(async ()=>{
      const readableBook = await resolveBookForReading(book);
      if(!readableBook) return;
      openBookInChat(readableBook);
      activeBook = readableBook;
      startReading(readableBook);
    }, 80);'''
s = replace_once(s, old_dash, new_dash, "dashboard book access")

# Individual book purchase uses the same manual payment flow.
cycle_anchor = "let selectedCycle = 'monthly';"
if "let pendingBookPurchase = null;" not in s:
    s = replace_once(s, cycle_anchor, cycle_anchor + "\nlet pendingBookPurchase = null;", "purchase state")

plan_anchor = "async function openPlanSelect(plusData){"
if "async function openBookPurchase(book)" not in s:
    book_purchase = r'''async function openBookPurchase(book){
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
  pendingBookPurchase = null;'''
    s = replace_once(s, plan_anchor, book_purchase, "book purchase function")

old_upload = '''    const blobResult = await window.__blobUpload(file.name, file, {
      access: 'public',
      handleUploadUrl: '/api/upload'
    });'''
new_upload = r'''    const safeName = String(file.name || 'receipt.jpg').replace(/[^a-zA-Z0-9._-]+/g,'-').slice(-100);
    const blobResult = await window.__blobUpload(`payment/${Date.now()}-${safeName}`, file, {
      access: 'public',
      handleUploadUrl: '/api/upload'
    });'''
s = replace_once(s, old_upload, new_upload, "payment upload pathname")

old_submit = "      body: JSON.stringify({ action:'submit-payment', plan: selectedCycle, screenshotUrl: blobResult.url })"
new_submit = r'''      body: JSON.stringify(
        pendingBookPurchase
          ? { action:'submit-payment', kind:'book', bookId:pendingBookPurchase.id, screenshotUrl:blobResult.url }
          : { action:'submit-payment', kind:'plus', plan:selectedCycle, screenshotUrl:blobResult.url }
      )'''
s = replace_once(s, old_submit, new_submit, "payment submit payload")

# Mock result: collect mistakes for PLUS-only Ustoz AI feedback.
result_anchor = "  const result = {title:activeMock.title,correct,total:totalElements,answered,percent,at:new Date().toISOString()};"
if "const mockFeedbackPayload=" not in s:
    feedback_payload = r'''  const feedbackWrong = [];
  activeMock.closed.forEach((q,i) => {
    if(mockClosedAnswers[i] !== q.a){
      const givenIndex = mockClosedAnswers[i];
      feedbackWrong.push({
        section:'Yopiq',
        question:q.q,
        given:givenIndex === null ? '' : (q.o[givenIndex] || ''),
        expected:q.o[q.a] || ''
      });
    }
  });
  activeMock.open.forEach((q,qi) => q.parts.forEach((p,pi) => {
    if(!isMockAnswerCorrect(mockOpenAnswers[qi][pi], p.ans)){
      feedbackWrong.push({
        section:'Ochiq A/B',
        question:`${q.q} ${p.label}) ${p.ask}`,
        given:mockOpenAnswers[qi][pi] || '',
        expected:p.ans
      });
    }
  }));
  const mockFeedbackPayload = { title:activeMock.title, correct, total:totalElements, wrong:feedbackWrong };
  const result = {title:activeMock.title,correct,total:totalElements,answered,percent,at:new Date().toISOString()};'''
    s = replace_once(s, result_anchor, feedback_payload, "mock feedback payload")

old_result_btn = '      <button class="glow-btn" id="mock-back-list" type="button">Mock testlarga qaytish</button>'
new_result_btn = r'''      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
        <button class="glow-btn" id="mock-ai-feedback" type="button">✨ Ustoz AI tahlili · PLUS</button>
        <button class="ghost-btn" id="mock-back-list" type="button">Mock testlarga qaytish</button>
      </div>
      <div id="mock-ai-feedback-box" style="display:none;max-width:720px;margin:18px auto 0;text-align:left;padding:18px;border:1px solid var(--border-soft);border-radius:14px;background:rgba(255,255,255,.025);line-height:1.65;"></div>'''
s = replace_once(s, old_result_btn, new_result_btn, "mock feedback result button")

mock_bind_anchor = "  document.getElementById('mock-back-list').addEventListener('click', renderMockTestList);"
if "document.getElementById('mock-ai-feedback').addEventListener" not in s:
    mock_bind = r'''  document.getElementById('mock-back-list').addEventListener('click', renderMockTestList);
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

      box.innerHTML = (window.marked && marked.parse) ? marked.parse(data.feedback || '') : (data.feedback || '');
      renderMockMath(box);
    }catch(err){
      box.textContent = err.message || "Ustoz AI tahlilini olishda muammo yuz berdi.";
    }finally{
      btn.disabled = false;
    }
  });'''
    s = replace_once(s, mock_bind_anchor, mock_bind, "mock feedback binding")

# Update help claims only when those strings exist.
help_replacements = {
    "Javoblaringiz test davomida avtomatik saqlanadi.": "Test yakunida natijangiz ushbu qurilmada saqlanadi.",
    "Natijada xatolaringiz tahlili ko'rsatiladi.": "MATHLVL Plus bilan testdan keyin Ustoz AI xatolaringizni tahlil qiladi.",
    "Ustoz AI’da yuqoriroq limit": "Mock testdan keyingi Ustoz AI tahlili",
    "Ustoz AI'da yuqoriroq limit": "Mock testdan keyingi Ustoz AI tahlili",
}
for old, new in help_replacements.items():
    s = s.replace(old, new)

# Extract large inline PNGs to real static assets to reduce HTML payload.
pattern = re.compile(r"data:image/png;base64,[A-Za-z0-9+/=]+")
matches = list(dict.fromkeys(pattern.findall(s)))
asset_index = 0
for uri in matches:
    if len(uri) < 5000:
        continue
    asset_index += 1
    filename = "mathlvl-logo.png" if asset_index == 1 else f"mathlvl-inline-{asset_index}.png"
    try:
        raw = base64.b64decode(uri.split(",", 1)[1], validate=True)
    except Exception:
        continue
    Path(filename).write_bytes(raw)
    s = s.replace(uri, "/" + filename)

# Never ship Apple sign-in after cleanup.
for forbidden in ('/api/auth-apple-start', 'mathlvl-auth-apple', 'id="apple-btn"'):
    if forbidden in s:
        raise SystemExit(f"Apple auth unexpectedly present after cleanup: {forbidden}")

# Build assertions for access/payment hardening.
required_index = [
    "async function resolveBookForReading(book)",
    "/api/books?action=open&id=",
    "payment/${Date.now()}-${safeName}",
    "kind:'book'",
    'id="mock-ai-feedback"',
    "/api/mock-feedback",
]
for token in required_index:
    if token not in s:
        raise SystemExit(f"Product hardening missing from index: {token}")

INDEX.write_text(s, encoding="utf-8")

# =========================
# Admin hardening
# =========================
a = ADMIN.read_text(encoding="utf-8")

safe_anchor = "function escapeHtml(str){ const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }"
if "function safePaymentImageUrl(url)" not in a:
    safe_helper = safe_anchor + r'''
function safePaymentImageUrl(url){
  try{
    const u = new URL(String(url || ''));
    const ok = u.protocol === 'https:' &&
      (u.hostname === 'public.blob.vercel-storage.com' ||
       u.hostname.endsWith('.public.blob.vercel-storage.com'));
    return ok && u.pathname.startsWith('/payment/') ? u.href : '';
  }catch(_e){
    return '';
  }
}'''
    a = replace_once(a, safe_anchor, safe_helper, "admin safe payment helper")

# Password is used once to establish the HttpOnly admin cookie; don't keep it in JS.
a = a.replace("      adminPassword = val;", "      adminPassword = '';")

# Privileged routes now authenticate exclusively with the signed HttpOnly cookie.
a = re.sub(r"\s*password:\s*adminPassword,\s*", "\n        ", a)
a = re.sub(r",\s*password:\s*adminPassword\b", "", a)
a = a.replace("{ headers: { 'x-admin-password': adminPassword } }", "{ credentials:'same-origin', cache:'no-store' }")
a = re.sub(
    r"\{\s*headers:\s*\{\s*['\"]x-admin-password['\"]\s*:\s*adminPassword\s*\}\s*\}",
    "{ credentials:'same-origin', cache:'no-store' }",
    a
)

old_plan_label = "function paymentPlanLabel(plan){ return plan === 'monthly' ? 'Oylik' : 'Yillik'; }"
new_plan_label = r'''function paymentPlanLabel(plan,payment){
  if(payment && payment.kind === 'book') return `Kitob: ${escapeHtml(payment.bookTitle || payment.bookId || '')}`;
  return plan === 'monthly' ? 'Oylik Plus' : 'Yillik Plus';
}'''
a = replace_once(a, old_plan_label, new_plan_label, "admin payment plan label")
a = a.replace("${paymentPlanLabel(p.plan)}", "${paymentPlanLabel(p.plan,p)}")

# Never render arbitrary legacy URL values into href/src.
a = a.replace('${p.screenshotUrl}', '${safePaymentImageUrl(p.screenshotUrl)}')

for forbidden in ("password: adminPassword", "'x-admin-password'", '"x-admin-password"', "${p.screenshotUrl}"):
    if forbidden in a:
        raise SystemExit(f"Admin hardening failed; found {forbidden}")

ADMIN.write_text(a, encoding="utf-8")

print("Applied MATHLVL product/security hardening")
