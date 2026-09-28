import { TOPICS, QUESTION_MAP, emptyState, isCorrect, dayKey } from '../assets/learning/curriculum.js';

export function applyLearningEvent(previous, input, now=new Date()) {
  const state=structuredClone(previous||emptyState());
  if(!['sat','national'].includes(input?.track)) throw new Error('Yo‘nalish noto‘g‘ri');
  const track=state.tracks[input.track];
  if(input.kind==='settings') {
    const s=input.settings;
    if(!s || ![10,15,20,30,45,60].includes(s.minutes) || !['uz','en'].includes(s.language)) throw new Error('Reja sozlamalari noto‘g‘ri');
    if(typeof s.date!=='string'||(s.date&&(!/^\d{4}-\d{2}-\d{2}$/.test(s.date)||Number.isNaN(Date.parse(s.date))||new Date(s.date).toISOString().slice(0,10)!==s.date||s.date<dayKey(now)))) throw new Error('Kelajakdagi sanani tanlang');
    const allowed=input.track==='sat'?['','500+','600+','650+','700+','750+']:['','C','C+','B','B+','A','A+'];
    if(!allowed.includes(s.target)) throw new Error('Maqsad noto‘g‘ri');
    track.settings={minutes:s.minutes,language:s.language,date:s.date,target:s.target};
    return state;
  }
  if(input.kind!=='attempt'||!/^[a-zA-Z0-9-]{16,80}$/.test(input.id||''))throw new Error('Mashq identifikatori noto‘g‘ri');
  if(track.sessions.some(s=>s.id===input.id))return state;
  if(!['diagnostic','practice','review'].includes(input.mode))throw new Error('Mashq turi noto‘g‘ri');
  const answers=input.answers;
  if(!Array.isArray(answers)||answers.length<1||answers.length>16||new Set(answers.map(a=>a?.id)).size!==answers.length)throw new Error('Javoblar noto‘g‘ri');
  if(answers.some(a=>!QUESTION_MAP.has(a?.id)||typeof a.value!=='string'||a.value.length>50))throw new Error('Savol yoki javob noto‘g‘ri');
  if(input.mode==='diagnostic'&&(answers.length!==16||TOPICS.some(t=>answers.filter(a=>QUESTION_MAP.get(a.id).topic===t.id).length!==2)))throw new Error('Diagnostika uchun har mavzudan 2 ta javob kerak');
  if(input.mode==='practice'&&new Set(answers.map(a=>QUESTION_MAP.get(a.id).topic)).size!==1)throw new Error('Bitta mavzuni tanlang');
  let correct=0;const mistakes=new Set(track.mistakes);
  for(const a of answers){
    const ok=isCorrect(QUESTION_MAP.get(a.id),a.value);
    track.answers[a.id]=ok;
    if(ok){correct++;mistakes.delete(a.id)}else mistakes.add(a.id);
  }
  track.mistakes=[...mistakes];
  const result={id:input.id,mode:input.mode,correct,total:answers.length,at:now.toISOString()};
  track.sessions=[...track.sessions,result].slice(-200);
  track.days=[...new Set([...track.days,dayKey(now)])].slice(-400);
  if(input.mode==='diagnostic')track.diagnostic=result;
  if(input.mode==='practice')track.lessons=[...new Set([...track.lessons,QUESTION_MAP.get(answers[0].id).topic])];
  return state;
}

export async function handleLearning(req,res,redis,key) {
  if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return res.status(405).json({error:'Metod qo‘llab-quvvatlanmaydi'});}
  if(req.method==='GET') {
    const raw=await redis(['GET',key]);
    return res.status(200).json({state:raw?JSON.parse(raw):emptyState()});
  }
  if(!req.headers['content-type']?.includes('application/json'))return res.status(415).json({error:'JSON kerak'});
  if(req.headers['sec-fetch-site']==='cross-site')return res.status(403).json({error:'Ruxsat berilmadi'});
  if(JSON.stringify(req.body||{}).length>12000)return res.status(413).json({error:'So‘rov juda katta'});
  // Compare-and-set prevents concurrent tabs from overwriting each other's progress.
  for(let retry=0;retry<4;retry++) {
    const raw=await redis(['GET',key]);let state;
    try{state=applyLearningEvent(raw?JSON.parse(raw):null,req.body)}catch(err){return res.status(400).json({error:err.message});}
    const saved=await redis(['EVAL',"local v=redis.call('GET',KEYS[1]); if (v or '')==ARGV[1] then redis.call('SET',KEYS[1],ARGV[2]); return 1 else return 0 end",1,key,raw||'',JSON.stringify(state)]);
    if(saved===1)return res.status(200).json({ok:true,state});
  }
  return res.status(409).json({error:'Natija yangilandi. Qayta saqlang.'});
}
