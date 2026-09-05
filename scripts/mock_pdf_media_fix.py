from pathlib import Path

ADMIN_MARKER = 'MATHLVL_MOCK_PDF_MEDIA_FIX_V1'
INDEX_MARKER = 'MATHLVL_MOCK_MEDIA_RENDER_V1'

admin_path = Path('admin.html')
admin = admin_path.read_text(encoding='utf-8')

if ADMIN_MARKER not in admin:
    deps = r'''
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/contrib/auto-render.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
'''
    if 'pdf.js/3.11.174/pdf.min.js' not in admin:
        if '</head>' not in admin:
            raise SystemExit('admin </head> not found')
        admin = admin.replace('</head>', deps + '\n</head>', 1)

    needle = "mockDraft.sourcePdfUrl = blobResult.url;\n    mockImportWarnings = Array.isArray(data.draft.warnings) ? data.draft.warnings : [];"
    replacement = "mockDraft.sourcePdfUrl = blobResult.url;\n    mockImportWarnings = Array.isArray(data.draft.warnings) ? data.draft.warnings : [];\n    await attachMockVisualsFromPdf(file, mockDraft, status);"
    if needle not in admin:
        raise SystemExit('mock PDF analyze hook not found')
    admin = admin.replace(needle, replacement, 1)

    addon = r'''
<style id="mathlvl-mock-pdf-media-fix-style">
/* MATHLVL_MOCK_PDF_MEDIA_FIX_V1 */
.mock-live-preview{border:1px solid rgba(120,150,255,.18);background:rgba(61,169,252,.035);border-radius:13px;padding:14px 15px;margin-bottom:15px}
.mock-live-preview-label{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--blue);margin-bottom:9px}
.mock-live-preview-body{font-size:15px;line-height:1.65;color:var(--text);overflow-wrap:anywhere}
.mock-live-preview-body .preview-option{margin-top:7px;padding:8px 10px;border:1px solid var(--border-soft);border-radius:9px;font-size:13px}
.mock-live-preview-body .preview-open-part{margin-top:8px;color:var(--text-dim);font-size:13px}
.mock-question-media{margin:13px 0 4px;border:1px solid var(--border);border-radius:13px;padding:12px;background:rgba(255,255,255,.018)}
.mock-question-media img{display:block;max-width:min(100%,720px);max-height:440px;object-fit:contain;margin:0 auto;border-radius:9px;background:#fff}
.mock-question-media-empty{padding:16px;text-align:center;color:var(--text-dim);font-size:11.5px;border:1px dashed var(--border);border-radius:9px}
.mock-media-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;align-items:center}
.mock-media-actions button,.mock-media-actions label{font-size:11px!important;padding:7px 11px!important}
.mock-media-file{display:none}
.mock-media-note{font-size:10.5px;color:var(--text-dim);margin-top:8px;line-height:1.5}
@media(max-width:760px){.mock-question-media img{max-height:320px}.mock-live-preview-body{font-size:14px}}
</style>
<script id="mathlvl-mock-pdf-media-fix-runtime">
(function(){
  if(typeof window.pdfjsLib !== 'undefined'){
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  function esc(value){
    return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  function renderMathPreview(el){
    if(!el || typeof window.renderMathInElement !== 'function') return;
    try{
      window.renderMathInElement(el,{
        delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}],
        throwOnError:false
      });
    }catch(_e){}
  }

  function getSelectedMockItem(){
    if(typeof allMockItems !== 'function' || !mockDraft) return null;
    const items = allMockItems();
    return items[mockSelectedIndex] || items[0] || null;
  }

  function buildPreviewHtml(item){
    if(!item) return '';
    const q = item.data || {};
    let html = '<div>' + esc(q.q || '') + '</div>';
    if(item.kind === 'closed'){
      const letters = ['A','B','C','D'];
      html += (q.o || []).map((opt,i)=>'<div class="preview-option"><b>'+letters[i]+')</b> '+esc(opt||'')+'</div>').join('');
    }else{
      html += (q.parts || []).map((part,i)=>'<div class="preview-open-part"><b>'+(i===0?'A':'B')+')</b> '+esc(part.ask||'')+'</div>').join('');
    }
    return html;
  }

  function refreshEditorPreview(){
    const item = getSelectedMockItem();
    const body = document.querySelector('#mock-question-editor .mock-live-preview-body');
    if(!item || !body) return;
    body.innerHTML = buildPreviewHtml(item);
    renderMathPreview(body);
  }

  async function uploadQuestionImage(file, q, number){
    if(!file || !q) return;
    if(!/^image\/(png|jpeg|webp)$/i.test(file.type || '')) throw new Error('PNG, JPG yoki WebP rasm tanlang');
    if(file.size > 10*1024*1024) throw new Error('Rasm 10 MB dan katta bo‘lmasin');
    const uploaded = await window.__blobUpload('mock-assets/q-'+number+'-'+Date.now()+'-'+file.name, file, {access:'public',handleUploadUrl:'/api/upload'});
    q.imageUrl = uploaded.url;
    q.imageAlt = q.imageAlt || ('Mock '+number+'-savol rasmi');
    q.visual = {...(q.visual||{}), present:true};
  }

  function canvasToBlob(canvas){
    return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Rasm yaratilmadi')),'image/png'));
  }

  async function loadPdfDoc(source){
    if(typeof window.pdfjsLib === 'undefined') throw new Error('PDF renderer yuklanmadi');
    let bytes;
    if(source instanceof Blob){
      bytes = new Uint8Array(await source.arrayBuffer());
    }else{
      const response = await fetch(String(source||''), {cache:'no-store'});
      if(!response.ok) throw new Error('Manba PDFni ochib bo‘lmadi');
      bytes = new Uint8Array(await response.arrayBuffer());
    }
    return window.pdfjsLib.getDocument({data:bytes}).promise;
  }

  async function renderPdfPage(pdfDoc, pageNumber, cache){
    const key = String(pageNumber);
    if(cache && cache.has(key)) return cache.get(key);
    const page = await pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({scale:2.2});
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d', {alpha:false});
    ctx.fillStyle = '#fff';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    await page.render({canvasContext:ctx,viewport}).promise;
    if(cache) cache.set(key,canvas);
    return canvas;
  }

  function validBbox(raw){
    if(!Array.isArray(raw) || raw.length!==4) return null;
    const n = raw.map(Number);
    if(n.some(v=>!Number.isFinite(v))) return null;
    const [y1,x1,y2,x2] = n.map(v=>Math.max(0,Math.min(1000,v)));
    if(y2<=y1+8 || x2<=x1+8) return null;
    return [y1,x1,y2,x2];
  }

  async function cropAndUploadVisual(pdfDoc, q, number, cache){
    const visual = q?.visual || {};
    const bbox = validBbox(visual.bbox);
    const pageNumber = Number(visual.page || q.sourcePage || 0);
    if(!bbox || !Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > pdfDoc.numPages) return false;
    const source = await renderPdfPage(pdfDoc, pageNumber, cache);
    const [y1,x1,y2,x2] = bbox;
    const pad = 18;
    const sx = Math.max(0, Math.floor(source.width*x1/1000)-pad);
    const sy = Math.max(0, Math.floor(source.height*y1/1000)-pad);
    const ex = Math.min(source.width, Math.ceil(source.width*x2/1000)+pad);
    const ey = Math.min(source.height, Math.ceil(source.height*y2/1000)+pad);
    const sw = ex-sx, sh = ey-sy;
    if(sw < 45 || sh < 45) return false;
    const out = document.createElement('canvas');
    out.width = sw; out.height = sh;
    const outCtx = out.getContext('2d', {alpha:false});
    outCtx.fillStyle = '#fff'; outCtx.fillRect(0,0,sw,sh);
    outCtx.drawImage(source,sx,sy,sw,sh,0,0,sw,sh);
    const blob = await canvasToBlob(out);
    const file = new File([blob], 'mock-q'+number+'-visual.png', {type:'image/png'});
    const uploaded = await window.__blobUpload('mock-assets/q-'+number+'-'+Date.now()+'.png', file, {access:'public',handleUploadUrl:'/api/upload'});
    q.imageUrl = uploaded.url;
    q.imageAlt = q.imageAlt || visual.kind || ('Mock '+number+'-savol chizmasi');
    return true;
  }

  window.attachMockVisualsFromPdf = async function(file, draft, statusEl){
    const items = [
      ...(draft?.closed || []).map((q,i)=>({q,number:i+1})),
      ...(draft?.open || []).map((q,i)=>({q,number:(draft?.closed||[]).length+i+1}))
    ].filter(item=>item.q?.visual?.present && validBbox(item.q.visual.bbox) && !item.q.imageUrl);
    if(!items.length) return;
    let pdfDoc;
    try{
      if(statusEl) statusEl.textContent = '3/3 PDFdagi rasm va chizmalar ajratilmoqda...';
      pdfDoc = await loadPdfDoc(file);
      const cache = new Map();
      let done = 0;
      for(const item of items){
        try{
          const ok = await cropAndUploadVisual(pdfDoc,item.q,item.number,cache);
          if(!ok) mockImportWarnings.push(item.number+'-savol: rasmni avtomatik kesib bo‘lmadi — qo‘lda biriktiring.');
        }catch(err){
          mockImportWarnings.push(item.number+'-savol: rasm yuklanmadi — '+err.message);
        }
        done++;
        if(statusEl) statusEl.textContent = '3/3 Rasm/chizmalar: '+done+'/'+items.length;
      }
    }catch(err){
      mockImportWarnings.push('PDFdagi rasmlarni avtomatik ajratib bo‘lmadi: '+err.message);
    }finally{
      try{ await pdfDoc?.destroy?.(); }catch(_e){}
    }
  };

  async function recropCurrentVisual(q, number, status){
    const source = mockDraft?.sourcePdfUrl;
    if(!source) throw new Error('Manba PDF topilmadi');
    const pdfDoc = await loadPdfDoc(source);
    try{
      const ok = await cropAndUploadVisual(pdfDoc,q,number,new Map());
      if(!ok) throw new Error('Rasm hududi aniqlanmagan. Rasmni qo‘lda yuklang');
    }finally{
      try{ await pdfDoc.destroy?.(); }catch(_e){}
    }
    if(status) status.textContent = 'Rasm PDFdan qayta olindi.';
  }

  function enhanceMockEditor(){
    const host = document.getElementById('mock-question-editor');
    const card = host?.querySelector('.mock-editor-card');
    const item = getSelectedMockItem();
    if(!card || !item) return;
    const q = item.data;

    const head = card.querySelector('.mock-editor-head');
    const preview = document.createElement('div');
    preview.className = 'mock-live-preview';
    preview.innerHTML = '<div class="mock-live-preview-label">Savolning saytdagi ko‘rinishi</div><div class="mock-live-preview-body"></div>';
    head?.insertAdjacentElement('afterend', preview);
    refreshEditorPreview();

    const media = document.createElement('div');
    media.className = 'mock-question-media';
    const visualExists = Boolean(q.visual?.present);
    const cropReady = Boolean(validBbox(q.visual?.bbox));
    media.innerHTML =
      (q.imageUrl
        ? '<img src="'+esc(q.imageUrl)+'" alt="'+esc(q.imageAlt||'Savol rasmi')+'">'
        : '<div class="mock-question-media-empty">'+(visualExists?'PDFda rasm/chizma aniqlangan, lekin hali biriktirilmagan.':'Bu savolda alohida rasm/chizma aniqlanmagan.')+'</div>') +
      '<div class="mock-media-actions">' +
        (visualExists && cropReady ? '<button class="ghost-btn" type="button" data-recrop-visual>↻ PDFdan rasmni olish</button>' : '') +
        '<label class="ghost-btn" for="mock-manual-media-input">🖼 Rasmni qo‘lda tanlash</label>' +
        '<input class="mock-media-file" id="mock-manual-media-input" type="file" accept="image/png,image/jpeg,image/webp">' +
        (q.imageUrl ? '<button class="ghost-btn mock-danger" type="button" data-remove-visual>Rasmni olib tashlash</button>' : '') +
      '</div>' +
      '<div class="mock-media-note">AI rasm hududini PDFdan avtomatik kesadi. Noto‘g‘ri kesilgan bo‘lsa shu yerda almashtirishingiz mumkin.</div>';
    const lastField = card.querySelector('.row') || card.lastElementChild;
    card.appendChild(media);

    card.querySelectorAll('textarea,[data-mock-option],[data-part-ask]').forEach(el=>el.addEventListener('input',refreshEditorPreview));

    const fileInput = media.querySelector('#mock-manual-media-input');
    fileInput?.addEventListener('change', async ()=>{
      const file = fileInput.files?.[0];
      if(!file) return;
      const status = document.getElementById('mock-status');
      try{
        status.classList.remove('err','ok');
        status.textContent = 'Rasm yuklanmoqda...';
        await uploadQuestionImage(file,q,item.number);
        status.textContent = 'Rasm savolga biriktirildi.';
        status.classList.add('ok');
        renderMockReview();
      }catch(err){
        status.textContent = 'Xatolik: '+err.message;
        status.classList.add('err');
      }
    });

    media.querySelector('[data-remove-visual]')?.addEventListener('click',()=>{
      q.imageUrl = '';
      renderMockReview();
    });

    media.querySelector('[data-recrop-visual]')?.addEventListener('click', async e=>{
      const btn = e.currentTarget;
      const status = document.getElementById('mock-status');
      try{
        btn.disabled = true;
        status.classList.remove('err','ok');
        status.textContent = 'PDFdan rasm olinmoqda...';
        await recropCurrentVisual(q,item.number,status);
        status.classList.add('ok');
        renderMockReview();
      }catch(err){
        status.textContent = 'Xatolik: '+err.message;
        status.classList.add('err');
      }finally{btn.disabled=false;}
    });
  }

  if(typeof renderMockEditor === 'function'){
    const originalRenderMockEditor = renderMockEditor;
    renderMockEditor = function(){
      originalRenderMockEditor();
      enhanceMockEditor();
    };
  }
})();
</script>
'''
    if '</body>' not in admin:
        raise SystemExit('admin </body> not found')
    admin = admin.replace('</body>', addon + '\n</body>', 1)
    admin_path.write_text(admin, encoding='utf-8')

index_path = Path('index.html')
index = index_path.read_text(encoding='utf-8')
if INDEX_MARKER not in index:
    addon = r'''
<style id="mathlvl-mock-media-render-style">
/* MATHLVL_MOCK_MEDIA_RENDER_V1 */
.mock-question-visual{margin:0 0 18px;text-align:center}
.mock-question-visual img{display:block;max-width:min(100%,760px);max-height:480px;object-fit:contain;margin:0 auto;border-radius:12px;border:1px solid var(--border);background:#fff}
@media(max-width:600px){.mock-question-visual img{max-height:330px;border-radius:10px}}
</style>
<script id="mathlvl-mock-media-render-runtime">
(function(){
  if(typeof renderMockQuestion !== 'function') return;
  const originalRenderMockQuestion = renderMockQuestion;
  renderMockQuestion = function(){
    originalRenderMockQuestion();
    if(!activeMock) return;
    const isClosed = mockIndex < activeMock.closed.length;
    const localIndex = isClosed ? mockIndex : mockIndex - activeMock.closed.length;
    const q = isClosed ? activeMock.closed[localIndex] : activeMock.open[localIndex];
    if(!q?.imageUrl) return;
    const questionEl = document.getElementById('mock-question-text');
    if(!questionEl || document.getElementById('mock-question-visual')) return;
    const visual = document.createElement('div');
    visual.id = 'mock-question-visual';
    visual.className = 'mock-question-visual';
    const img = document.createElement('img');
    img.src = q.imageUrl;
    img.alt = q.imageAlt || 'Savol rasmi yoki chizmasi';
    img.loading = 'eager';
    visual.appendChild(img);
    questionEl.insertAdjacentElement('afterend', visual);
  };
})();
</script>
'''
    if '</body>' not in index:
        raise SystemExit('index </body> not found')
    index = index.replace('</body>', addon + '\n</body>', 1)
    index_path.write_text(index, encoding='utf-8')

print('Mock PDF media fixed: formula preview + PDF visual crop + frontend image render.')
