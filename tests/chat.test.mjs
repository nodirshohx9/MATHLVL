import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {validateChat,outputLimit} from '../lib/chat-limits.js';
const source=readFileSync('assets/app/main.js','utf8');
test('server rejects malformed, excessive and unsupported input',()=>{
 assert.equal(validateChat({messages:[{role:'user',content:'Salom'}]}),null);
 for(const messages of [null,[],Array(21).fill({role:'user',content:'x'}),[{role:'system',content:'x'}],[{role:'user',content:'x'.repeat(12001)}],[{role:'user',content:[{type:'image',source:{media_type:'text/html',data:'AAAA'}}]}]]) assert.ok(validateChat({messages}));
 assert.equal(outputLimit(Infinity),1500);assert.equal(outputLimit(1e9),2500);assert.equal(outputLimit(1e9,true),8000);
});
test('math renderer distinguishes block and inline delimiters',()=>{
 let config;const ctx={safeMarkdown:x=>x,cleanAiText:x=>x,renderMathInElement:(_,c)=>config=c};vm.createContext(ctx);
 vm.runInContext(source.slice(source.indexOf('function renderAiAnswer('),source.indexOf('function getAiTypingPreview(')),ctx);
 ctx.renderAiAnswer({},'$$x^2$$');assert.equal(config.delimiters[0].left,'$$');assert.equal(config.delimiters[1].left,'$');
});
test('book tutor sends successful history and displays chunks before stream ends',async()=>{
 const bubble={classList:{remove(){}},textContent:''};const win={appendChild(){},scrollHeight:10};const send={disabled:false};
 const requests=[];let n=0;
 const ctx={Map,TextDecoder,AbortSignal,setTimeout,clearTimeout,window:{MATHLVL_PLUS_ACTIVE:true},refreshAiUsage(){},activeBook:{id:'book-a',title:'Test'},currentVisiblePage:1,readerNumPages:3,
 document:{getElementById:id=>id==='ai-sheet-send'?send:id==='ai-sheet-chat'?win:null,createElement:()=>({querySelector:()=>bubble})},
 appendAiSheetMsg(){},getCurrentPageText:async()=>'',cleanAiText:x=>x,renderAiAnswer:(el,text)=>el.textContent=text,
 fetch:async(_,opts)=>{requests.push(JSON.parse(opts.body));let i=0;return {ok:true,body:{getReader:()=>({read:async()=>{if(i++===0)return {value:new TextEncoder().encode('data: {"text":"Javob"}\n\n'),done:false};assert.equal(bubble.textContent,'Javob');return {done:true};}})}};}};
 vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('const bookChatHistories'),source.indexOf("document.getElementById('ai-sheet-send').addEventListener")),ctx);
 await ctx.sendAiSheetMessage('Savol');await ctx.sendAiSheetMessage('Nega?');assert.equal(requests[1].messages.length,3);assert.equal(requests[1].messages[1].role,'assistant');assert.equal(send.disabled,false);
 ctx.activeBook={id:'book-b'};await ctx.sendAiSheetMessage('Boshqa');assert.equal(requests[2].messages.length,1);
});
test('free plan cannot send reader tutor requests',async()=>{
 const ctx={window:{MATHLVL_PLUS_ACTIVE:false},openAiSheet:async()=>{ctx.planOpened=(ctx.planOpened||0)+1;},fetch:async()=>{ctx.requested=true;}};
 vm.createContext(ctx);
 vm.runInContext(source.slice(source.indexOf('const bookChatHistories'),source.indexOf("document.getElementById('ai-sheet-send').addEventListener")),ctx);
 await ctx.sendAiSheetMessage('Savol');
 assert.equal(ctx.planOpened,1);
 assert.equal(ctx.requested,undefined);
});
test('library failure is distinguishable from empty successful catalog',async()=>{
 const ctx={AbortSignal,booksCache:[],fetch:async()=>({ok:false})};vm.createContext(ctx);
 vm.runInContext(source.slice(source.indexOf("let booksLoadError ="),source.indexOf('// O‘qish jarayoni')),ctx);
 await ctx.loadBooks();assert.ok(vm.runInContext('booksLoadError',ctx));ctx.fetch=async()=>({ok:true,json:async()=>({books:[]})});await ctx.loadBooks();assert.equal(vm.runInContext('booksLoadError',ctx),'');
});
test('reader renders initial pages and nearby pages on scroll without IntersectionObserver',()=>{
 const rendered=[];const items=Array.from({length:10},(_,i)=>({dataset:{page:String(i+1)},offsetHeight:100}));
 const scroll={scrollTop:0,querySelectorAll:()=>items,addEventListener(){},removeEventListener(){}};
 const ctx={document:{getElementById:()=>scroll},pageObserver:null,getComputedStyle:()=>({marginBottom:'0'}),scheduleMobileReaderPageRender:(_,n)=>rendered.push(n),clearMobileRenderQueue(){},scheduleReaderGarbageCollect(){},currentVisiblePage:1,readerPageNum:1,updatePageIndicator(){},requestAnimationFrame:fn=>{fn();return 1;}};
 vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('function setupPageObserver()'),source.indexOf('// MATHLVL_READER_OBSERVER_RUNTIME_FIX_V4')),ctx);
 ctx.setupPageObserver();assert.deepEqual(rendered,[1,2,3]);scroll.scrollTop=500;scroll.readerScrollHandler();assert.equal(ctx.currentVisiblePage,6);assert.ok(rendered.includes(7));
});
test('teacher tab exits book mode and hides the library while books hide chat',()=>{
 const nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,{classList:{add(){},remove(){},toggle(){}},dataset:{},hidden:false});return nodes.get(id);};
 const ctx={document:{querySelectorAll:()=>[],getElementById:node,querySelector:node,body:node('body')},closeAiSheet(){},refreshAllBookViews(){},window:{scrollTo(){}}};
 vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('function activateTab('),source.indexOf("document.querySelectorAll('.sidebar-nav-item[data-sidebar-tab]').forEach(btn")),ctx);
 ctx.activateTab('teacher');assert.equal(node('book-list-section-outer').hidden,true);assert.equal(node('#teacher-layout .book-col').hidden,true);assert.equal(node('#teacher-layout .chat-col').hidden,false);
 ctx.activateTab('books');assert.equal(node('book-list-section-outer').hidden,false);assert.equal(node('#teacher-layout .chat-col').hidden,true);
});
test('persistent memory excludes image bytes and bounds stored text',async()=>{
 const {memoryMessages}=await import('../lib/memory.js');
 const result=memoryMessages(Array.from({length:30},()=>({role:'user',content:[{type:'image',source:{data:'SECRET_IMAGE'}},{type:'text',text:'x'.repeat(4000)}]})));
 assert.equal(result.length,20);assert.equal(result[0].content.length,2500);assert.ok(!JSON.stringify(result).includes('SECRET_IMAGE'));
});

 test('reader reuses in-flight render instead of cancelling on every scroll',async()=>{
   let finish, calls=0; const state={};
   const ctx={getPageRenderState:()=>state,performPageRender:()=>{calls++;return new Promise(r=>finish=r);}};
   vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('function renderPageInto('),source.indexOf('async function performPageRender(')),ctx);
   const first=ctx.renderPageInto({},1);const second=ctx.renderPageInto({},1);
   assert.equal(first,second);assert.equal(calls,1);finish();await first;assert.equal(state.pending,null);
 });
test('account menu follows auth events, never unrelated Plus text',()=>{
 const nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',hidden:false});return nodes.get(id)};
 const events={};const auth=node('auth'),out=node('out');
 const ctx={window:{MATHLVL_CURRENT_SESSION:{loggedIn:true,name:'Learner'},MATHLVL_PLUS_ACTIVE:true,addEventListener:(name,fn)=>events[name]=fn},document:{getElementById:node,querySelectorAll:selector=>selector.includes('data-auth-only')?[auth]:[out]}};
 vm.createContext(ctx);vm.runInContext(readFileSync('assets/app/part-04.js','utf8'),ctx);
 assert.equal(node('sidebar-footer-name').textContent,'Learner');assert.equal(auth.hidden,false);assert.equal(out.hidden,true);
 events['mathlvl:authchange']({detail:{loggedIn:false}});
 assert.equal(auth.hidden,true);assert.equal(out.hidden,false);assert.equal(node('sidebar-footer-plan').textContent,'Akkauntga kiring');
 events['mathlvl:authchange']({detail:{loggedIn:true,name:'Learner'}});
 assert.equal(auth.hidden,false);assert.equal(node('sidebar-footer-name').textContent,'Learner');
});
test('subscription dates use Uzbek month names at Tashkent midnight',()=>{
 const ctx={Intl,Date};vm.createContext(ctx);
 vm.runInContext(source.slice(source.indexOf('function formatUzDate('),source.indexOf('function renderSubscriptionCard(')),ctx);
 assert.equal(ctx.formatUzDate('2026-10-26T20:00:00Z'),'27-oktabr');
 assert.equal(ctx.formatUzDate('2026-11-21T20:00:00Z'),'22-noyabr');
 assert.equal(ctx.formatUzDate('invalid'),'');
});
test('QR close clears the stopped scanner even after its global reference is reset',async()=>{
 let cleared=0,resolveStop;const stopped=new Promise(resolve=>resolveStop=resolve);
 const ctx={qrGeneration:0,qrStarting:false,document:{getElementById:()=>({style:{}})},qrScannerInstance:{stop:()=>stopped,clear:()=>cleared++}};
 vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('function stopQrScanner()'),source.indexOf("document.getElementById('qr-scan-close-btn')")),ctx);
 ctx.stopQrScanner();assert.equal(ctx.qrScannerInstance,null);resolveStop();await stopped;await Promise.resolve();assert.equal(cleared,1);
});
test('free teacher reaches quota validation while reader tutoring still requires Plus',async()=>{
 const stream=readFileSync('api/chat-stream.js','utf8');let quotaChecks=0;
 const ctx={process:{env:{GEMINI_API_KEY:'test-only'}},verifySession:async()=>({email:'qa@example.test'}),validateChat:()=>null,hasPlus:async()=>false,consumeAiUsage:async()=>{quotaChecks++;return {ok:false,status:429,message:'test quota'}},jsonResponse:(body,status)=>({body,status})};
 vm.createContext(ctx);vm.runInContext(stream.slice(stream.indexOf('export default async function handler')).replace('export default ',''),ctx);
 const request=scope=>({method:'POST',json:async()=>({memory_scope:scope,messages:[{role:'user',content:'2+2'}]})});
 assert.equal((await ctx.handler(request('teacher'))).status,429);assert.equal(quotaChecks,1);
 assert.equal((await ctx.handler(request(undefined))).status,403);assert.equal(quotaChecks,1);
 assert.equal((await ctx.handler(request('reader'))).status,403);
 ctx.verifySession=async()=>null;assert.equal((await ctx.handler(request('teacher'))).status,401);
});
function giftHarness(){
 const nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,{disabled:false,value:'CODE',textContent:'',classList:{add(){},remove(){}}});return nodes.get(id)};
 const calls=[];const ctx={AbortSignal,document:{getElementById:node},renderSubscriptionCard:data=>calls.push(['plan',data]),refreshAiUsage(){},window:{},fetch:async()=>{throw new Error('unexpected network')}};
 vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('const giftErrors ='),source.indexOf('async function refreshAuthState()')),ctx);
 ctx.plusDialog=async()=>true;ctx.showPlusSuccess=async data=>calls.push(['success',data]);return {ctx,node,calls};
}
test('gift activation ignores duplicate submits and celebrates only confirmed success',async()=>{
 const {ctx,node,calls}=giftHarness();let release;const preview=new Promise(r=>release=r);let requests=0;
 ctx.giftRequest=async body=>{requests++;if(body.action==='preview')return preview;return {durationDays:30,expiresAt:123};};
 const pending=ctx.redeemGift('CODE');await ctx.redeemGift('CODE');assert.equal(requests,1);
 release({durationDays:30});await pending;
 assert.equal(requests,2);assert.equal(calls[0][0],'plan');assert.equal(calls[0][1].active,true);assert.equal(calls[1][0],'success');assert.equal(node('manual-redeem-btn').disabled,false);
});
test('cancelled gift confirmation never redeems',async()=>{
 const {ctx,calls}=giftHarness();let requests=0;ctx.giftRequest=async()=>{requests++;return {durationDays:30}};ctx.plusDialog=async()=>false;
 await ctx.redeemGift('CODE');assert.equal(requests,1);assert.equal(calls.length,0);
});
test('gift timeout unlocks retry and never shows false success',async()=>{
 const {ctx,node,calls}=giftHarness();ctx.giftRequest=async()=>{const error=new Error('timeout');error.name='TimeoutError';throw error;};
 await ctx.redeemGift('CODE');assert.equal(node('manual-redeem-btn').disabled,false);assert.match(node('manual-redeem-status').textContent,/Javob kechikdi/);assert.equal(calls.length,0);
});
test('QR repeated decode callback initiates only one activation',async()=>{
 const nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,{style:{},classList:{add(){},remove(){}},addEventListener(_,fn){this.click=fn}});return nodes.get(id)};
 let decode,activations=0,cleared=0;
 const ctx={setTimeout,clearTimeout,document:{getElementById:node},giftBusy:false,qrScannerInstance:null,extractRedeemCode:x=>x,redeemGift:()=>activations++,Html5Qrcode:class{async start(a,b,fn){decode=fn}async stop(){}clear(){cleared++}}};
 vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('let qrGeneration ='),source.indexOf("document.getElementById('qr-scan-close-btn')")),ctx);
 await node('qr-scan-btn').click();decode('CODE');decode('CODE');await Promise.resolve();assert.equal(activations,1);assert.equal(cleared,1);
});

test('mock card decorators settle without repeatedly mutating the observed list',()=>{
 const modern=readFileSync(new URL('../assets/app/mathlvl-mock-modern-runtime.js',import.meta.url),'utf8');
 const review=readFileSync(new URL('../assets/app/mathlvl-mock-learning-review-runtime.js',import.meta.url),'utf8');
 let writes=0;
 const tracked=(initial={})=>{const node={...initial};for(const key of ['textContent','innerHTML']){let value=initial[key]||'';Object.defineProperty(node,key,{get:()=>value,set:v=>{value=v;writes++;}});}return node;};
 const btn=tracked({dataset:{mtStart:'one'},textContent:'Boshlash'});
 const badge=tracked({textContent:'✓ Ishlangan'});
 const row=tracked();
 const body={querySelector:s=>s==='.mock-status-row'?row:null};
 const card={classList:{toggle(){}},querySelector:s=>s==='[data-mt-start]'?btn:s==='.mt-card-title'?{textContent:'Mock'}:body};
 const list={querySelectorAll:s=>s==='.mt-card'?[card]:s==='.mock-status-badge.done'?[badge]:[]};
 const ctx={list,readHistory:()=>[{title:'Mock',percent:80}],readDraft:()=>null};vm.createContext(ctx);
 vm.runInContext(modern.slice(modern.indexOf('  function enhanceCards()'),modern.indexOf('  function enhanceRun()')),ctx);
 vm.runInContext(review.slice(review.indexOf('  function cleanMockCards()'),review.indexOf('  function enhance(){')),ctx);
 ctx.enhanceCards();ctx.cleanMockCards();assert.ok(writes>0);
 writes=0;for(let i=0;i<5;i++){ctx.enhanceCards();ctx.cleanMockCards();}
 assert.equal(writes,0,'unchanged cards must not schedule another observer pass');
 assert.equal(btn.textContent,'Qayta ishlash');assert.ok(!row.innerHTML.includes('mock-best-score'));
});

test('unavailable teacher memory backs off across focus events and recovers',async()=>{
 let now=1000,calls=0,healthy=false;
 const label={textContent:''};
 const ctx={Date:{now:()=>now},AbortSignal,document:{getElementById:()=>label},chatHistory:[],appendMsg(){},fetch:async()=>{calls++;return {ok:healthy,json:async()=>({messages:[]})};}};
 vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('let teacherMemoryReady'),source.indexOf("document.getElementById('memory-clear').addEventListener")),ctx);
 await ctx.restoreTeacherMemory();
 for(let i=0;i<8;i++)await ctx.restoreTeacherMemory();
 assert.equal(calls,1);assert.match(label.textContent,/davom ettirishingiz/);
 now+=60001;healthy=true;await ctx.restoreTeacherMemory();
 assert.equal(calls,2);assert.match(label.textContent,/saqlanadi/);
 await ctx.restoreTeacherMemory();assert.equal(calls,2);
});


test('auth refresh coalesces requests and preserves session on network failure',async()=>{
 let calls=0, resolveFetch, signedOut=0;
 const session={loggedIn:true};
 const ctx={AbortSignal,Date,window:{MATHLVL_CURRENT_SESSION:session,dispatchEvent(){},addEventListener(){}},CustomEvent:class{},
 showSignedInUI(){},showSignedOutUI(){signedOut++;},restoreTeacherMemory(){},
 fetch:()=>{calls++;return new Promise(resolve=>{resolveFetch=resolve;});}};
 vm.createContext(ctx);
 vm.runInContext(source.slice(source.indexOf('let authRefreshPending'),source.indexOf("document.getElementById('google-btn')")),ctx);
 const first=ctx.refreshAuthState(),second=ctx.refreshAuthState();
 assert.equal(calls,1);
 resolveFetch({ok:false});await Promise.all([first,second]);
 assert.equal(signedOut,0);assert.equal(ctx.window.MATHLVL_CURRENT_SESSION,session);
 ctx.fetch=async()=>({ok:true,json:async()=>({loggedIn:false})});
 await ctx.refreshAuthState();assert.equal(signedOut,1);assert.equal(ctx.window.MATHLVL_CURRENT_SESSION.loggedIn,false);
});


test('background mock refresh preserves active question, answers and timer',()=>{
 const attempt={id:'ongoing'};let cleared=0,writes=0;
 const list={set innerHTML(v){writes++;},querySelectorAll:()=>[]};
 const ctx={activeMock:attempt,mockTimerId:42,clearInterval(){cleared++;},document:{getElementById:()=>list},mockTestData:[]};
 vm.createContext(ctx);
 vm.runInContext(source.slice(source.indexOf('function renderMockTestList('),source.indexOf('function startMockTest(')),ctx);
 ctx.renderMockTestList({background:true});
 assert.equal(ctx.activeMock,attempt);assert.equal(ctx.mockTimerId,42);assert.equal(cleared,0);assert.equal(writes,0);
 ctx.renderMockTestList();assert.equal(ctx.activeMock,null);assert.equal(cleared,1);assert.equal(writes,1);
 assert.match(source,/renderMockTestList\(\{background:true\}\)/);
});


test('open A/B question earns one point only when all parts are correct',()=>{
 const block=source.slice(source.indexOf('  let correctClosed = 0;',source.indexOf('function finishMockTest')),source.indexOf('  const feedbackItems =',source.indexOf('function finishMockTest')));
 const activeMock={closed:Array.from({length:35},()=>({a:0})),open:Array.from({length:10},()=>({parts:[{ans:'2'},{ans:'3'}]}))};
 const ctx={activeMock,mockClosedAnswers:Array(35).fill(0),mockOpenAnswers:Array.from({length:10},()=>['2','3']),isMockAnswerCorrect:(a,b)=>a===b,mockTotalQuestions:t=>t.closed.length+t.open.length,mockAnsweredQuestions:()=>45};
 const grade=()=>vm.runInNewContext(block+';({correct,totalElements,percent})',{...ctx});
 assert.equal(grade().correct,45);assert.equal(grade().totalElements,45);assert.equal(grade().percent,100);
 ctx.mockOpenAnswers[0]=['2','wrong'];assert.equal(grade().correct,44);assert.equal(grade().percent,98);
 ctx.mockOpenAnswers[0]=['',''];assert.equal(grade().correct,44);
});
