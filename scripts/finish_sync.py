from pathlib import Path

INDEX = Path('index.html')
s = INDEX.read_text(encoding='utf-8')

def replace_once(old, new, label):
    global s
    if old not in s:
        raise SystemExit(f'{label} anchor not found')
    s = s.replace(old, new, 1)

# =========================
# Account-synced book progress
# =========================
old_get = """function getAllBookProgress(){
  try{ return JSON.parse(localStorage.getItem(BOOK_PROGRESS_KEY) || '{}'); }catch(e){ return {}; }
}"""
new_get = r"""let serverBookProgress = {};
function getAllBookProgress(){
  let local = {};
  try{ local = JSON.parse(localStorage.getItem(BOOK_PROGRESS_KEY) || '{}'); }catch(e){}
  const merged = { ...local };
  Object.entries(serverBookProgress || {}).forEach(([bookId, remote])=>{
    const current = merged[bookId];
    if(!current || Number(remote?.updatedAt || 0) >= Number(current?.updatedAt || 0)) merged[bookId] = remote;
  });
  return merged;
}
async function syncBookProgressFromServer(){
  try{
    const res = await fetch('/api/progress', { credentials:'include', cache:'no-store' });
    if(!res.ok) return getAllBookProgress();
    const data = await res.json();
    const remote = data.progress || {};
    const local = getAllBookProgress();
    const merged = { ...local };
    Object.entries(remote).forEach(([bookId, item])=>{
      if(!merged[bookId] || Number(item?.updatedAt || 0) >= Number(merged[bookId]?.updatedAt || 0)) merged[bookId] = item;
    });
    serverBookProgress = merged;
    try{ localStorage.setItem(BOOK_PROGRESS_KEY, JSON.stringify(merged)); }catch(e){}

    // If this device has a newer local record, push it to the account too.
    await Promise.all(Object.entries(merged).map(async ([bookId, item])=>{
      const remoteItem = remote[bookId];
      if(remoteItem && Number(remoteItem.updatedAt || 0) >= Number(item?.updatedAt || 0)) return;
      try{
        await fetch('/api/progress', {
          method:'POST', credentials:'include',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({ bookId, ...item })
        });
      }catch(e){}
    }));
    return merged;
  }catch(e){
    return getAllBookProgress();
  }
}"""
replace_once(old_get, new_get, 'book progress getter')

old_save = """function saveBookProgress(bookId, currentPage, totalPages, pageOffset){
  try{
    const all = getAllBookProgress();
    all[bookId] = {
      currentPage, totalPages, pageOffset: pageOffset || 0,
      progressPercent: Math.round((currentPage / totalPages) * 100), updatedAt: Date.now()
    };
    localStorage.setItem(BOOK_PROGRESS_KEY, JSON.stringify(all));
  }catch(e){}
}"""
new_save = r"""function saveBookProgress(bookId, currentPage, totalPages, pageOffset){
  const record = {
    currentPage, totalPages, pageOffset: pageOffset || 0,
    progressPercent: Math.round((currentPage / totalPages) * 100), updatedAt: Date.now()
  };
  try{
    const all = getAllBookProgress();
    all[bookId] = record;
    serverBookProgress[bookId] = record;
    localStorage.setItem(BOOK_PROGRESS_KEY, JSON.stringify(all));
  }catch(e){}
  fetch('/api/progress', {
    method:'POST', credentials:'include',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({ bookId, ...record })
  }).catch(()=>{});
}"""
replace_once(old_save, new_save, 'book progress save')

old_boot = """(async ()=>{
  await loadBooks();
  refreshDashboard();
})();"""
new_boot = """(async ()=>{
  await loadBooks();
  await syncBookProgressFromServer();
  refreshDashboard();
  if(document.getElementById('profile-dashboard')?.style.display !== 'none') renderMyBooks();
})();"""
replace_once(old_boot, new_boot, 'dashboard progress sync')

# =========================
# Mock test draft autosave / resume
# =========================
mock_state_anchor = "let mockTimerId = null;"
mock_helpers = r"""let mockTimerId = null;
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
}"""
replace_once(mock_state_anchor, mock_helpers, 'mock draft helpers')

old_start = """  mockIndex = 0;
  mockClosedAnswers = Array(activeMock.closed.length).fill(null);
  mockOpenAnswers = activeMock.open.map(q => q.parts.map(() => ''));
  mockSecondsLeft = activeMock.minutes * 60;"""
new_start = r"""  const savedDraft = loadMockDraft(activeMock.id);
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
  }"""
replace_once(old_start, new_start, 'mock start resume')

old_tick = """    mockSecondsLeft = Math.max(0, mockSecondsLeft - 1);
    updateMockClock();
    if(mockSecondsLeft === 0) finishMockTest(true);"""
new_tick = """    mockSecondsLeft = Math.max(0, mockSecondsLeft - 1);
    updateMockClock();
    if(mockSecondsLeft > 0 && mockSecondsLeft % 5 === 0) saveMockDraft();
    if(mockSecondsLeft === 0) finishMockTest(true);"""
replace_once(old_tick, new_tick, 'mock timer autosave')

replace_once(
    "btn.addEventListener('click', () => { mockClosedAnswers[localIndex] = i; renderMockQuestion(); });",
    "btn.addEventListener('click', () => { mockClosedAnswers[localIndex] = i; saveMockDraft(); renderMockQuestion(); });",
    'closed answer autosave'
)
replace_once(
    "inp.addEventListener('input', ()=>{ mockOpenAnswers[localIndex][Number(inp.dataset.openPart)] = inp.value; });",
    "inp.addEventListener('input', ()=>{ mockOpenAnswers[localIndex][Number(inp.dataset.openPart)] = inp.value; saveMockDraft(); });",
    'open answer autosave'
)
replace_once(
    "btn.addEventListener('click', () => { mockIndex = i; renderMockQuestion(); });",
    "btn.addEventListener('click', () => { mockIndex = i; saveMockDraft(); renderMockQuestion(); });",
    'mock nav autosave'
)
replace_once(
    "if(mockIndex > 0){ mockIndex--; renderMockQuestion(); }",
    "if(mockIndex > 0){ mockIndex--; saveMockDraft(); renderMockQuestion(); }",
    'mock prev autosave'
)
replace_once(
    "if(mockIndex < totalQ - 1){ mockIndex++; renderMockQuestion(); }",
    "if(mockIndex < totalQ - 1){ mockIndex++; saveMockDraft(); renderMockQuestion(); }",
    'mock next autosave'
)
replace_once(
    "if(confirm('Testdan chiqilsinmi? Kiritilgan javoblar saqlanmaydi.')) renderMockTestList();",
    "if(confirm('Testdan chiqilsinmi? Javoblaringiz saqlanadi va keyin davom ettirishingiz mumkin.')){ saveMockDraft(); renderMockTestList(); }",
    'mock exit copy'
)

finish_anchor = "  const list = document.getElementById('mocktest-list');\n  list.innerHTML = `"
if finish_anchor not in s:
    raise SystemExit('mock finish result anchor not found')
# The first matching result list after history save is inside finishMockTest. Clear draft just before rendering it.
finish_pos = s.find(finish_anchor, s.find('function finishMockTest'))
if finish_pos < 0:
    raise SystemExit('mock finish function result anchor not found')
s = s[:finish_pos] + "  clearMockDraft();\n" + s[finish_pos:]

# Help copy now matches the real autosave behavior.
s = s.replace(
    'Natija test yakunida ushbu qurilmada saqlanadi.',
    'Test davomida javoblaringiz ushbu qurilmada avtomatik saqlanadi va keyin davom ettirishingiz mumkin.'
)

required = [
    "fetch('/api/progress'",
    "async function syncBookProgressFromServer()",
    "const MOCK_DRAFT_KEY = 'mathlvl_mock_draft_v1'",
    "saveMockDraft();",
    "clearMockDraft();",
]
for token in required:
    if token not in s:
        raise SystemExit(f'finish sync missing: {token}')

INDEX.write_text(s, encoding='utf-8')
