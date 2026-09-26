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
 const ctx={Map,TextDecoder,AbortSignal,window:{MATHLVL_PLUS_ACTIVE:true},refreshAiUsage(){},activeBook:{id:'book-a',title:'Test'},currentVisiblePage:1,readerNumPages:3,
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
