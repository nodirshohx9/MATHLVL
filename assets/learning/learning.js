import {TOPICS,TERMS,QUESTIONS,emptyState,mastery,orderedTopics,chooseQuestions,isCorrect,numericAnswer,dayKey,streak} from './curriculum.js';
const root=document.getElementById('learning-dashboard');
const satRoot=document.getElementById('sat-dashboard');
const dialog=document.getElementById('learning-dialog');
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state=emptyState(),trackId='sat',loaded=false,loading=false,loadError='',account='',epoch=0,termIndex=0,session=null,busy=false,language='uz';
const endpoint='/api/progress?action=learning';
const button=(label,action,primary=false,extra='')=>`<button type="button" class="learning-btn${primary?' primary':''}" data-learning-action="${action}" ${extra}>${label}</button>`;
const track=()=>state.tracks[trackId];
const loggedIn=()=>!!window.MATHLVL_AUTH_STATE?.loggedIn;
function authorized(){return window.requireMathlvlAuth?.('generic',document.getElementById('panel-sat').classList.contains('active')?'sat':'learning')===true;}
function ready(){if(!authorized())return false;if(!loaded){load();return false}return true;}
function statusMarkup(){
  if(loading)return '<div class="learning-notice" role="status">Rejangiz yuklanmoqda…</div>';
  if(loadError)return `<div class="learning-notice" role="alert">${esc(loadError)} ${button('Qayta urinish','reload')}</div>`;
  if(!loggedIn())return `<div class="learning-notice">Shaxsiy reja va natijalarni saqlash uchun hisobga kiring. ${button('Kirish','login')}</div>`;
  return '';
}
function render(){
  const t=track(),ordered=t.diagnostic?orderedTopics(t):TOPICS,next=ordered[0];
  const completed=TOPICS.filter(topic=>mastery(t,topic.id)>=80&&Object.keys(t.answers).filter(id=>id.startsWith(topic.id+'-')).length>=3).length;
  const progress=Math.round(completed/TOPICS.length*100),todaySessions=t.sessions.filter(s=>dayKey(new Date(s.at))===dayKey());
  const practiceToday=todaySessions.some(s=>s.mode==='practice'),reviewToday=todaySessions.some(s=>s.mode==='review');
  const term=TERMS[termIndex%TERMS.length];
  root.innerHTML=`<div class="learning-head"><div><h1>Shaxsiy o‘quv yo‘lingiz</h1><p>Maqsadingiz sari har kuni bir qadam.</p></div><span class="learning-streak">🔥 ${streak(t.days)} kun</span></div>
    <div class="learning-tabs" aria-label="Tayyorgarlik yo‘nalishi"><button type="button" data-learning-action="national" aria-pressed="${trackId==='national'}">Milliy sertifikat</button><button type="button" data-learning-action="sat" aria-pressed="${trackId==='sat'}">SAT Math</button></div>
    ${statusMarkup()}<div class="learning-grid"><div class="learning-main">
    <article class="learning-card learning-hero"><div class="learning-hero-copy"><span class="learning-eyebrow">${t.diagnostic?'BUGUNGI DARS':'BIRINCHI QADAM'}</span><h2>${t.diagnostic?esc(next.name):'Sizga mos yo‘lni topamiz'}</h2><p>${t.diagnostic?`${t.settings.minutes} daqiqa · ${chooseQuestions(t,'practice',next.id).length} ta mashq`:'16 ta savol orqali kuchli va zaif mavzularingizni aniqlang.'}</p>${button(t.diagnostic?'Darsni boshlash →':'Diagnostikani boshlash →',t.diagnostic?'start':'diagnostic',true)}</div><div class="learning-orbit" aria-hidden="true">ƒ(x)</div></article>
    <section class="learning-card"><div class="learning-card-heading"><h2>Sizning o‘quv yo‘lingiz</h2><span class="learning-small">${completed} / ${TOPICS.length} mavzu</span></div><div class="learning-topic-list">${ordered.map((topic,i)=>{
      const m=mastery(t,topic.id),count=Object.keys(t.answers).filter(id=>id.startsWith(topic.id+'-')).length,done=m>=80&&count>=3;
      return `<button type="button" class="learning-topic ${i===0?'is-next ':''}${done?'is-done':''}" data-learning-topic="${topic.id}"><span class="learning-topic-number">${done?'✓':i+1}</span><span class="learning-topic-copy"><strong>${esc(topic.name)}</strong><small>${trackId==='sat'?esc(topic.en):'Asosiy ko‘nikmalar'}</small></span><span class="learning-topic-state">${m===null?'Boshlash →':`${m}% · ${count} savol`} ${m===null?'':`<progress max="100" value="${m}" aria-label="${esc(topic.name)}: ${m}% to‘g‘ri"></progress>`}</span></button>`;
    }).join('')}</div><p class="learning-small">${t.diagnostic?'Zaif mavzular avval ko‘rsatiladi.':'Diagnostikadan so‘ng tartib natijangizga moslashadi.'} Mavzu belgisi: kamida 3 xil savol, 80% to‘g‘ri javob.</p></section>
    <section class="learning-card learning-review"><div><h2>Xatolar ustida ishlash</h2><p>${t.mistakes.length?`Takrorlash uchun ${t.mistakes.length} ta mashq`:'Hozircha takrorlash uchun xatolar yo‘q.'}</p></div>${button('Takrorlash →','review',false,t.mistakes.length?'':'disabled')}</section>
    </div><aside class="learning-aside"><section class="learning-card"><h2>Maqsadim</h2><div class="learning-goal-row"><div><h3>${trackId==='sat'?'SAT Math':'Milliy sertifikat'}</h3><div class="learning-small">${t.settings.target?`Maqsad: ${esc(t.settings.target)}`:'Maqsadingizni belgilang'}</div></div><div class="learning-ring" style="--progress:${progress}%" aria-label="${completed} ta mavzu yakunlandi"><strong>${progress}%</strong></div></div><p class="learning-small">${t.settings.date?`Imtihon: ${esc(t.settings.date)} · `:''}Kuniga ${t.settings.minutes} daqiqa</p>${button('Rejani sozlash','settings')}</section>
    <section class="learning-card"><h2>Bugungi reja</h2><ul class="learning-checks"><li class="${practiceToday?'done':''}"><span class="learning-checkmark">${practiceToday?'✓':'○'}</span><div>${t.diagnostic?'Mavzu va mashqlar':'Diagnostika'}<small>${t.diagnostic?esc(next.name):'16 ta qisqa savol'}</small></div></li><li class="${practiceToday?'done':''}"><span class="learning-checkmark">${practiceToday?'✓':'○'}</span><div>${chooseQuestions(t,'practice',next.id).length} ta mashq<small>Mavzuni mustahkamlash</small></div></li><li class="${reviewToday?'done':''}"><span class="learning-checkmark">${reviewToday?'✓':'○'}</span><div>Xatolarni takrorlash<small>${t.mistakes.length?`${Math.min(8,t.mistakes.length)} ta savol`:'Xato ishlangan savollar shu yerga tushadi'}</small></div></li></ul></section>
    <section class="learning-card learning-vocabulary"><h2>Matematik ingliz tili</h2><div class="learning-term"><strong>${esc(term[0])}</strong> — ${esc(term[1])}<small>${esc(term[2])}</small></div>${button('Keyingi atama →','term')}</section></aside></div>
    <p class="learning-footer-note">Boshlang‘ich mashqlar to‘plami: ${TOPICS.length} mavzu, ${QUESTIONS.length} savol. Foizlar shu mashqlardagi natijangizni bildiradi; rasmiy imtihon bali emas.</p>`;
  const sat=state.tracks.sat,domains=[...new Set(TOPICS.map(t=>t.domain))];
  satRoot.innerHTML=`<div class="learning-head"><div><span class="learning-eyebrow">MATHLVL • SAT</span><h1>SAT Math</h1><p>Inglizcha savollar. Tushunarli yechimlar. Shaxsiy reja.</p></div><span class="learning-streak">${QUESTIONS.length} savol</span></div>${statusMarkup()}
    <article class="learning-card learning-hero"><div class="learning-hero-copy"><span class="learning-eyebrow">O‘Z DARAJANGIZDAN BOSHLANG</span><h2>SAT Math sari<br>birinchi qadam</h2><p>Asosiy ko‘nikmalarni tekshiring va sizga mos mavzular bo‘yicha mashq qiling.</p>${button(sat.diagnostic?'O‘quv yo‘limni ochish →':'Diagnostikani boshlash →',sat.diagnostic?'open-path':'sat-diagnostic',true)}</div><div class="learning-orbit" aria-hidden="true">x²</div></article>
    <div class="learning-card-heading" style="margin-top:28px"><h2>Mavzular bo‘yicha tayyorlaning</h2><span class="learning-small">4 yo‘nalish</span></div><div class="learning-domains">${domains.map((domain,i)=>`<section class="learning-card learning-domain"><span class="learning-eyebrow">0${i+1}</span><h3>${esc(domain)}</h3><p>${TOPICS.filter(t=>t.domain===domain).map(t=>esc(t.name)).join(' · ')}</p>${TOPICS.filter(t=>t.domain===domain).map(t=>button(esc(t.name)+' →','sat-topic',false,`data-topic="${t.id}"`)).join(' ')}</section>`).join('')}</div>
    <p class="learning-footer-note">MATHLVL yaratgan mustaqil boshlang‘ich mashqlar. Bu to‘liq adaptiv SAT sinovi emas; College Board bilan hamkorlikni anglatmaydi. <a href="https://satsuite.collegeboard.org/sat/whats-on-the-test/math/overview" target="_blank" rel="noopener noreferrer">Rasmiy SAT Math ma’lumoti ↗</a></p>`;
}
async function load(){
  if(!loggedIn()||loading)return;
  const version=epoch;loading=true;loadError='';render();
  try{const res=await fetch(endpoint,{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000)});const data=await res.json();if(!res.ok)throw new Error(data.error||'Yuklash amalga oshmadi');if(version!==epoch)return;state=data.state;loaded=true;}
  catch{if(version===epoch)loadError='Rejangizni yuklab bo‘lmadi. Qayta urinib ko‘ring.';}
  finally{if(version===epoch){loading=false;render();}}
}
async function send(event){
  const version=epoch;
  const res=await fetch(endpoint,{method:'POST',credentials:'same-origin',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json'},body:JSON.stringify(event)});
  const data=await res.json();
  if(version!==epoch)throw new Error('Hisob o‘zgardi. Qayta kiring.');
  if(!res.ok)throw new Error(data.error||'Saqlash amalga oshmadi');
  state=data.state;loaded=true;render();return data.state;
}
function showDialog(html){dialog.innerHTML=html;if(!dialog.open)dialog.showModal();}
function closeDialog(){if(busy)return;dialog.close();session=null;}
function settings(){
  if(!ready())return;
  const s=track().settings,targets=trackId==='sat'?['500+','600+','650+','700+','750+']:['C','C+','B','B+','A','A+'];
  showDialog(`<div class="learning-dialog-head"><span>SHAXSIY REJA</span>${button('Yopish','close')}</div><h2 id="learning-dialog-title">Maqsadingizni belgilang</h2><form id="learning-settings-form"><div class="learning-form-grid"><div><label for="learning-target">${trackId==='sat'?'SAT Math maqsadi':'Sertifikat maqsadi'}</label><select id="learning-target"><option value="">Tanlang</option>${targets.map(v=>`<option ${v===s.target?'selected':''}>${v}</option>`).join('')}</select></div><div><label for="learning-minutes">Kunlik vaqt</label><select id="learning-minutes">${[10,15,20,30,45,60].map(v=>`<option value="${v}" ${v===s.minutes?'selected':''}>${v} daqiqa</option>`).join('')}</select></div></div><label for="learning-date">Imtihon sanasi (ixtiyoriy)</label><input id="learning-date" type="date" min="${dayKey()}" value="${esc(s.date)}"><label for="learning-language">Yechim tili</label><select id="learning-language"><option value="uz" ${s.language==='uz'?'selected':''}>O‘zbekcha</option><option value="en" ${s.language==='en'?'selected':''}>English</option></select><p class="learning-small">Kunlik vaqt mashqlar sonini belgilaydi. Sana rejangizda ko‘rsatiladi; maqsad bali natija kafolati emas.</p><p id="learning-save-error" role="alert" class="learning-error"></p><div class="learning-dialog-actions"><button class="learning-btn primary" type="submit">Rejani saqlash</button></div></form>`);
}
function begin(mode,topic){
  if(!ready())return;
  const questions=chooseQuestions(track(),mode,topic);
  if(!questions.length)return;
  language=track().settings.language;
  session={id:crypto.randomUUID(),track:trackId,mode,topic,questions,index:0,answers:[],feedback:false,saved:false};
  if(mode==='practice') {
    const t=TOPICS.find(t=>t.id===topic);
    showDialog(`<div class="learning-dialog-head"><span>QISQA DARS</span>${button('Yopish','close')}</div><h2 id="learning-dialog-title">${esc(t.name)}</h2><p>${esc(language==='en'?t.lessonEn:t.lesson)}</p><p class="learning-small">${questions.length} ta mashq bilan mustahkamlang.</p>${button('Mashqlarga o‘tish →','questions',true)}`);
  }else questionView();
}
function questionView(){
  const s=session;if(!s)return;const q=s.questions[s.index];
  showDialog(`<div class="learning-dialog-head"><span>${s.mode==='diagnostic'?'DIAGNOSTIKA':s.mode==='review'?'XATOLARNI TAKRORLASH':'MASHQ'} · ${s.index+1} / ${s.questions.length}</span>${button('Yopish','close')}</div><progress value="${s.index}" max="${s.questions.length}" aria-label="Mashq jarayoni"></progress><h2 id="learning-dialog-title">${esc(s.track==='sat'?q.en:q.uz)}</h2><form id="learning-answer-form"><label for="learning-answer">Javobingiz</label><input id="learning-answer" type="text" inputmode="text" autocomplete="off" maxlength="50" placeholder="Masalan: 12, 0.25 yoki 1/4" required><p class="learning-small">Son yoki kasr kiriting. Kasr uchun / belgisidan foydalaning.</p><p class="learning-error" id="learning-answer-error" role="alert"></p><div class="learning-dialog-actions"><button class="learning-btn primary" type="submit">${s.mode==='diagnostic'?'Davom etish →':'Tekshirish'}</button>${button('Bilmayman','skip')}</div></form><div id="learning-answer-feedback" aria-live="polite"></div>`);
  document.getElementById('learning-answer').focus();
}
function answer(skip=false){
  const s=session;if(!s||s.feedback)return;
  const input=document.getElementById('learning-answer');const value=skip?'':input.value.trim();
  if(!skip&&!Number.isFinite(numericAnswer(value))){document.getElementById('learning-answer-error').textContent='To‘g‘ri son yoki kasr kiriting, masalan 0.5 yoki 1/2.';return;}
  const q=s.questions[s.index];s.answers.push({id:q.id,value});s.feedback=true;
  if(s.mode==='diagnostic'){next();return;}
  document.querySelectorAll('#learning-answer-form button, #learning-answer-form input').forEach(el=>el.disabled=true);
  const ok=isCorrect(q,value);
  document.getElementById('learning-answer-feedback').innerHTML=`<div class="learning-feedback ${ok?'':'wrong'}"><strong>${ok?'To‘g‘ri!':skip?'Birga tushunamiz':'Hali to‘g‘ri emas'}</strong><p>${esc(language==='en'?q.solutionEn:q.solution)}</p></div><div class="learning-dialog-actions">${button(s.index+1===s.questions.length?'Natijani ko‘rish →':'Keyingi savol →','next',true)}</div>`;
  document.querySelector('[data-learning-action="next"]').focus();
}
function next(){
  if(!session)return;
  session.index++;session.feedback=false;
  if(session.index>=session.questions.length){resultView();saveResult();}else questionView();
}
function resultView(error=''){
  const s=session;if(!s)return;const correct=s.answers.filter((a,i)=>isCorrect(s.questions[i],a.value)).length;
  showDialog(`<div class="learning-dialog-head"><span>MASHQ YAKUNLANDI</span>${button('Yopish','close',false,busy?'disabled':'')}</div><h2 id="learning-dialog-title">${s.mode==='diagnostic'?'Shaxsiy yo‘lingiz tayyor':'Bugun yana bir qadam!'}</h2><div class="learning-result-score">${correct} <span class="learning-small">/ ${s.questions.length} to‘g‘ri</span></div><p>${s.mode==='diagnostic'?'Rejangiz zaif mavzularni avval tavsiya qiladi.':'Xato savollarni keyin qayta ishlashingiz mumkin.'}</p><p class="learning-small">Bu mashq natijasi; rasmiy imtihon bali emas.</p><p role="status" class="${error?'learning-error':'learning-small'}">${error?esc(error):s.saved?'✓ Natijangiz hisobingizga saqlandi.':'Natijangiz saqlanmoqda…'}</p><div class="learning-dialog-actions">${error?button('Qayta saqlash','retry-save',true):button('O‘quv yo‘limga qaytish →','finish',true,s.saved?'':'disabled')}</div>`);
}
async function saveResult(){
  if(busy||!session||session.saved)return;
  const s=session;busy=true;resultView();
  try{await send({kind:'attempt',id:s.id,track:s.track,mode:s.mode,answers:s.answers});if(session===s)s.saved=true;}
  catch(err){if(session===s){busy=false;resultView(`Saqlanmadi: ${err.message}. Natijani yo‘qotmaslik uchun qayta saqlang.`);}return;}
  finally{busy=false;}
  if(session===s)resultView();
}
function openPath(){window.activateTab('learning');render();}
function action(name,el){
  if(busy)return;
  if(name==='close'){closeDialog();return;}
  if(name==='login'){authorized();return;}
  if(name==='reload'){load();return;}
  if(name==='sat'||name==='national'){trackId=name;render();return;}
  if(name==='term'){termIndex++;render();return;}
  if(name==='settings'){settings();return;}
  if(name==='sat-diagnostic'){trackId='sat';begin('diagnostic');return;}
  if(name==='diagnostic'){begin('diagnostic');return;}
  if(name==='start'){begin('practice',orderedTopics(track())[0].id);return;}
  if(name==='review'){begin('review');return;}
  if(name==='sat-topic'){trackId='sat';begin('practice',el.dataset.topic);return;}
  if(name==='open-path'){trackId='sat';openPath();return;}
  if(name==='questions'){questionView();return;}
  if(name==='skip'){answer(true);return;}
  if(name==='next'){next();return;}
  if(name==='retry-save'){saveResult();return;}
  if(name==='finish'){trackId=session.track;closeDialog();openPath();}
}
for(const el of [root,satRoot,dialog])el.addEventListener('click',event=>{
  const target=event.target.closest('[data-learning-action],[data-learning-topic]');if(!target)return;
  if(target.dataset.learningTopic){begin('practice',target.dataset.learningTopic);return;}
  action(target.dataset.learningAction,target);
});
dialog.addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;
  if(event.target.id==='learning-answer-form'){answer();return;}
  if(event.target.id==='learning-settings-form'){
    const form=event.target,settings={target:form.querySelector('#learning-target').value,minutes:Number(form.querySelector('#learning-minutes').value),date:form.querySelector('#learning-date').value,language:form.querySelector('#learning-language').value};
    busy=true;const submit=form.querySelector('[type=submit]');submit.disabled=true;
    try{await send({kind:'settings',track:trackId,settings});busy=false;closeDialog();}
    catch(err){if(form.isConnected){form.querySelector('#learning-save-error').textContent=err.message;submit.disabled=false;}}
    finally{busy=false;}
  }
});
dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
dialog.addEventListener('close',()=>{session=null;});
function authChanged(data){
  const identity=data?.loggedIn&&!data.isGuest?data.email||data.name||'authenticated':'';
  if(identity===account){if(identity&&!loaded&&!loading)load();return;}
  account=identity;epoch++;state=emptyState();loaded=false;loading=false;loadError='';busy=false;session=null;dialog.close();render();if(identity)load();
}
window.addEventListener('mathlvl:authchange',event=>authChanged(event.detail));
render();
if(window.MATHLVL_AUTH_STATE?.ready)authChanged(window.MATHLVL_AUTH_STATE.user);
