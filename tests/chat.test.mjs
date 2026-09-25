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
 const ctx={Map,TextDecoder,AbortSignal,activeBook:{id:'book-a',title:'Test'},currentVisiblePage:1,readerNumPages:3,
 document:{getElementById:id=>id==='ai-sheet-send'?send:id==='ai-sheet-chat'?win:null,createElement:()=>({querySelector:()=>bubble})},
 appendAiSheetMsg(){},getCurrentPageText:async()=>'',cleanAiText:x=>x,renderAiAnswer:(el,text)=>el.textContent=text,
 fetch:async(_,opts)=>{requests.push(JSON.parse(opts.body));let i=0;return {ok:true,body:{getReader:()=>({read:async()=>{if(i++===0)return {value:new TextEncoder().encode('data: {"text":"Javob"}\n\n'),done:false};assert.equal(bubble.textContent,'Javob');return {done:true};}})}};}};
 vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('const bookChatHistories'),source.indexOf("document.getElementById('ai-sheet-send').addEventListener")),ctx);
 await ctx.sendAiSheetMessage('Savol');await ctx.sendAiSheetMessage('Nega?');assert.equal(requests[1].messages.length,3);assert.equal(requests[1].messages[1].role,'assistant');assert.equal(send.disabled,false);
 ctx.activeBook={id:'book-b'};await ctx.sendAiSheetMessage('Boshqa');assert.equal(requests[2].messages.length,1);
});
test('library failure is distinguishable from empty successful catalog',async()=>{
 const ctx={AbortSignal,booksCache:[],fetch:async()=>({ok:false})};vm.createContext(ctx);
 vm.runInContext(source.slice(source.indexOf("let booksLoadError ="),source.indexOf('// O‘qish jarayoni')),ctx);
 await ctx.loadBooks();assert.ok(vm.runInContext('booksLoadError',ctx));ctx.fetch=async()=>({ok:true,json:async()=>({books:[]})});await ctx.loadBooks();assert.equal(vm.runInContext('booksLoadError',ctx),'');
});
test('reader renders initial pages and nearby pages on scroll without IntersectionObserver',()=>{
 const rendered=[];const items=Array.from({length:10},(_,i)=>({dataset:{page:String(i+1)},offsetHeight:100}));
 const scroll={scrollTop:0,querySelectorAll:()=>items,addEventListener(){},removeEventListener(){}};
 const ctx={document:{getElementById:()=>scroll},pageObserver:null,getComputedStyle:()=>({marginBottom:'0'}),renderPageInto:(_,n)=>rendered.push(n),currentVisiblePage:1,readerPageNum:1,updatePageIndicator(){},requestAnimationFrame:fn=>{fn();return 1;}};
 vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('function setupPageObserver()'),source.indexOf('// MATHLVL_READER_OBSERVER_RUNTIME_FIX_V4')),ctx);
 ctx.setupPageObserver();assert.deepEqual(rendered,[1,2,3]);scroll.scrollTop=500;scroll.readerScrollHandler();assert.equal(ctx.currentVisiblePage,6);assert.ok(rendered.includes(7));
});
