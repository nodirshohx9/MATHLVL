from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

anchor = '''function clearMockDraft(){
  try{ localStorage.removeItem(MOCK_DRAFT_KEY); }catch(e){}
}'''
addition = r'''function clearMockDraft(){
  try{ localStorage.removeItem(MOCK_DRAFT_KEY); }catch(e){}
}
async function syncMockHistoryFromServer(){
  try{
    const res = await fetch('/api/mock-history', {credentials:'include',cache:'no-store'});
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

    // Migrate older device-local results into the signed-in account.
    const remoteKeys = new Set((data.results || []).map(item=>`${item.title}|${item.at}`));
    await Promise.all(local.filter(item=>item?.title && item?.at && !remoteKeys.has(`${item.title}|${item.at}`)).slice(0,20).map(item=>
      fetch('/api/mock-history', {
        method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(item)
      }).catch(()=>{})
    ));
  }catch(e){}
}
function saveMockResultToServer(result){
  fetch('/api/mock-history', {
    method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify(result)
  }).catch(()=>{});
}'''
if anchor not in s:
    raise SystemExit('mock draft helper anchor not found')
s = s.replace(anchor, addition, 1)

history_anchor = '''  try{
    const history = JSON.parse(localStorage.getItem('mathlvl_mock_results') || '[]');
    history.unshift(result);
    localStorage.setItem('mathlvl_mock_results', JSON.stringify(history.slice(0,20)));
  }catch(e){}'''
if history_anchor not in s:
    raise SystemExit('mock result local history anchor not found')
s = s.replace(history_anchor, history_anchor + '\n  saveMockResultToServer(result);', 1)

boot_anchor = '''  await loadBooks();
  await syncBookProgressFromServer();
  refreshDashboard();'''
if boot_anchor not in s:
    raise SystemExit('dashboard boot anchor not found')
s = s.replace(boot_anchor, '''  await loadBooks();
  await Promise.all([syncBookProgressFromServer(), syncMockHistoryFromServer()]);
  refreshDashboard();''', 1)

for token in ('/api/mock-history', 'syncMockHistoryFromServer', 'saveMockResultToServer(result)'):
    if token not in s:
        raise SystemExit(f'mock history sync missing: {token}')

p.write_text(s, encoding='utf-8')
