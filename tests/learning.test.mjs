import test from 'node:test';
import assert from 'node:assert/strict';
import {TOPICS,QUESTIONS,QUESTION_MAP,isCorrect,numericAnswer,emptyState,chooseQuestions,orderedTopics,dayKey,streak} from '../assets/learning/curriculum.js';
import {applyLearningEvent,handleLearning} from '../lib/learning-progress.js';
const now=new Date('2026-09-28T09:00:00Z');
const attempt=(id='test-attempt-00000001',answers=[{id:'linear-0',value:'3'}])=>({kind:'attempt',track:'sat',mode:'practice',id,answers});
test('question bank has unique IDs, finite answers and two diagnostic questions per domain topic',()=>{
 assert.equal(QUESTIONS.length,96);assert.equal(QUESTION_MAP.size,96);
 assert.ok(QUESTIONS.every(q=>Number.isFinite(q.answer)&&q.uz&&q.en&&q.solution&&q.solutionEn));
 const chosen=chooseQuestions(emptyState().tracks.sat,'diagnostic');assert.equal(chosen.length,16);
 for(const t of TOPICS)assert.equal(chosen.filter(q=>q.topic===t.id).length,2);
});
test('representative original math answers are correct',()=>{
 for(const [id,value] of [['linear-0','3'],['linear-11','14'],['systems-0','5'],['quadratic-0','5'],['exponential-0','80'],['percent-0','108'],['statistics-0','5.5'],['statistics-1','1/4'],['geometry-0','12'],['trig-0','3/5'],['trig-1','5/12']])assert.ok(isCorrect(QUESTION_MAP.get(id),value),id);
});
test('answer parser accepts fractions and decimal commas but rejects expressions and empty input',()=>{
 assert.equal(numericAnswer(' 1 / 4 '),.25);assert.equal(numericAnswer('−1,5'),-1.5);
 for(const s of ['', '0/0','1/0','Infinity','2+2','<script>','1e5','0x10'])assert.ok(Number.isNaN(numericAnswer(s)));
 assert.equal(isCorrect(QUESTION_MAP.get('linear-0'),'30'),false);
});
test('server grades answers and replay does not duplicate sessions',()=>{
 const s=applyLearningEvent(null,attempt(),now);assert.equal(s.tracks.sat.sessions[0].correct,1);
 assert.equal(s.tracks.sat.answers['linear-0'],true);assert.deepEqual(s.tracks.national,emptyState().tracks.national);
 assert.deepEqual(applyLearningEvent(s,attempt(),now),s);
});
test('wrong answers enter review and are removed only when answered correctly',()=>{
 const wrong=applyLearningEvent(null,attempt('test-attempt-00000002',[{id:'linear-0',value:'99'}]),now);
 assert.deepEqual(wrong.tracks.sat.mistakes,['linear-0']);assert.equal(orderedTopics(wrong.tracks.sat)[0].id,'linear');
 const fixed=applyLearningEvent(wrong,{...attempt('test-attempt-00000003'),mode:'review'},now);
 assert.deepEqual(fixed.tracks.sat.mistakes,[]);
});
test('rejects unknown tracks, duplicate/unknown questions, incomplete diagnostic and invalid settings',()=>{
 const bad=[{...attempt(),track:'__proto__'},{...attempt(),answers:[{id:'unknown',value:'1'}]},{...attempt(),answers:[{id:'linear-0',value:'3'},{id:'linear-0',value:'3'}]},{...attempt(),mode:'diagnostic'}, {kind:'settings',track:'sat',settings:{minutes:15,language:'uz',date:'2027-02-30',target:'750+'}}, {kind:'settings',track:'sat',settings:{minutes:999,language:'uz',date:'',target:'750+'}}];
 for(const event of bad)assert.throws(()=>applyLearningEvent(null,event,now));
});
test('diagnostic produces saved plan and selects unseen practice first',()=>{
 const answers=chooseQuestions(emptyState().tracks.sat,'diagnostic').map(q=>({id:q.id,value:String(q.answer)}));
 const s=applyLearningEvent(null,{...attempt(),mode:'diagnostic',answers},now);
 assert.equal(s.tracks.sat.diagnostic.correct,16);assert.equal(chooseQuestions(s.tracks.sat,'practice','linear')[0].id,'linear-2');
});
test('streak respects Tashkent midnight and yesterday continuity',()=>{
 assert.equal(dayKey(new Date('2026-09-28T20:01:00Z')),'2026-09-29');
 assert.equal(streak(['2026-09-26','2026-09-27'],now),2);assert.equal(streak(['2026-09-25'],now),0);
});
function response(){return {statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v},status(v){this.statusCode=v;return this},json(v){this.body=v;return this}};}
test('API retries concurrent updates and returns a merged state',async()=>{
 let raw=null,conflict=true;
 const redis=async cmd=>{
  if(cmd[0]==='GET')return raw;
  if(cmd[0]==='EVAL'){
   if(conflict){conflict=false;raw=JSON.stringify(applyLearningEvent(null,{...attempt('other-attempt-00000001'),track:'national'},now));return 0;}
   assert.equal(cmd[4],raw);raw=cmd[5];return 1;
  }
 };
 const res=response();await handleLearning({method:'POST',headers:{'content-type':'application/json'},body:attempt()},res,redis,'test');
 assert.equal(res.statusCode,200);assert.equal(res.body.state.tracks.sat.sessions.length,1);assert.equal(res.body.state.tracks.national.sessions.length,1);
});
test('API blocks cross-site writes and unsupported methods',async()=>{
 let calls=0;const redis=async()=>{calls++;};
 for(const [req,status] of [[{method:'POST',headers:{'content-type':'application/json','sec-fetch-site':'cross-site'},body:attempt()},403],[{method:'DELETE',headers:{}},405],[{method:'POST',headers:{}},415]]){
  const res=response();await handleLearning(req,res,redis,'test');assert.equal(res.statusCode,status);
 }assert.equal(calls,0);
});
