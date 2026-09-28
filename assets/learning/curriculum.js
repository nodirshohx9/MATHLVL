// Original foundational practice; not an official SAT test or score predictor.
export const TOPICS = [
  {id:'linear', name:'Chiziqli tenglamalar', en:'Linear equations', domain:'Algebra', lesson:'Tenglamaning ikki tomoniga bir xil amal qo‘llang. ax + b = c bo‘lsa, x = (c − b) / a. Masalan, 3x + 4 = 19 → 3x = 15 → x = 5.', lessonEn:'Apply the same operation to both sides. If ax + b = c, then x = (c − b) / a. For example, 3x + 4 = 19 gives 3x = 15, so x = 5.'},
  {id:'systems', name:'Tenglamalar sistemasi', en:'Systems of equations', domain:'Algebra', lesson:'Qo‘shish yoki almashtirish usulidan foydalaning. x + y = 10 va x − y = 4 ni qo‘shsak, 2x = 14. Demak, x = 7 va y = 3.', lessonEn:'Use substitution or elimination. Adding x + y = 10 and x − y = 4 gives 2x = 14, so x = 7 and y = 3.'},
  {id:'quadratic', name:'Kvadrat tenglamalar', en:'Quadratic equations', domain:'Advanced Math', lesson:'Ko‘paytma nol bo‘lsa, kamida bitta ko‘paytuvchi nol. x² − 7x + 12 = (x − 3)(x − 4) = 0. Ildizlar: 3 va 4.', lessonEn:'If a product is zero, at least one factor is zero. x² − 7x + 12 = (x − 3)(x − 4) = 0 has roots 3 and 4.'},
  {id:'exponential', name:'Darajalar va o‘sish', en:'Exponential growth', domain:'Advanced Math', lesson:'Har bosqichda bir xil songa ko‘payadigan miqdor eksponensial o‘sadi. Boshlang‘ich miqdor A har soatda 2 baravar bo‘lsa, t soatdan keyin A · 2ᵗ bo‘ladi.', lessonEn:'Repeated multiplication produces exponential growth. If an initial amount A doubles every hour, after t hours the amount is A · 2ᵗ.'},
  {id:'percent', name:'Foizlar va nisbatlar', en:'Percentages and ratios', domain:'Problem-Solving and Data Analysis', lesson:'p% = p/100. Narx 20% chegirilsa, yangi narx eski narxning 80% iga teng: 150 · 0.8 = 120.', lessonEn:'p% means p/100. After a 20% discount, the new price is 80% of the original: 150 · 0.8 = 120.'},
  {id:'statistics', name:'Statistika va ehtimollik', en:'Statistics and probability', domain:'Problem-Solving and Data Analysis', lesson:'O‘rta arifmetik — yig‘indini qiymatlar soniga bo‘lish. 4, 7, 10 sonlarining o‘rtachasi (4 + 7 + 10)/3 = 7. Teng imkoniyatli holatlarda ehtimollik = qulay holatlar / jami holatlar.', lessonEn:'The mean is the sum divided by the number of values. The mean of 4, 7, 10 is 21/3 = 7. For equally likely outcomes, probability = favorable outcomes / total outcomes.'},
  {id:'geometry', name:'Geometriya', en:'Geometry', domain:'Geometry and Trigonometry', lesson:'Uchburchak yuzi S = asos · balandlik / 2. To‘g‘ri burchakli uchburchakda a² + b² = c²; c — gipotenuza.', lessonEn:'Triangle area = base × height / 2. In a right triangle, a² + b² = c², where c is the hypotenuse.'},
  {id:'trig', name:'Trigonometriya', en:'Trigonometry', domain:'Geometry and Trigonometry', lesson:'To‘g‘ri burchakli uchburchakda sin θ = qarshi katet / gipotenuza, cos θ = yon katet / gipotenuza, tan θ = qarshi katet / yon katet.', lessonEn:'In a right triangle, sin θ = opposite / hypotenuse, cos θ = adjacent / hypotenuse, and tan θ = opposite / adjacent.'}
];
export const TERMS = [
  ['slope','qiyalik','To‘g‘ri chiziq uchun m = (y₂ − y₁)/(x₂ − x₁).'],
  ['at least','kamida','x is at least 5 → x ≥ 5.'],
  ['at most','ko‘pi bilan','x is at most 5 → x ≤ 5.'],
  ['integer','butun son','Masalan: −2, −1, 0, 1, 2.'],
  ['intercept','o‘q bilan kesishish qiymati','y = mx + b da b — y-intercept.'],
  ['mean','o‘rta arifmetik','Qiymatlar yig‘indisi / qiymatlar soni.'],
  ['solution','yechim','Tenglamani rost qiladigan qiymat.'],
  ['consecutive','ketma-ket','Consecutive integers: 3, 4, 5.'],
  ['hypotenuse','gipotenuza','To‘g‘ri burchakka qarshi tomon.'],
  ['equivalent','teng kuchli','2(x + 3) va 2x + 6 — equivalent expressions.']
];
function q(topic, i, uz, en, answer, solution, solutionEn) {
  return {id:`${topic}-${i}`,topic,uz,en,answer,solution,solutionEn};
}
// Twelve variants per topic, alternating task types where useful.
export const QUESTIONS = TOPICS.flatMap(({id}) => Array.from({length:12},(_,i) => {
  const n=i+1;
  if(id==='linear') {
    const a=2+i%4, x=n+2, b=n+3, c=a*x+b;
    return q(id,i,`${a}x + ${b} = ${c}. x ni toping.`,`If ${a}x + ${b} = ${c}, what is the value of x?`,x,`x = (${c} − ${b}) / ${a} = ${x}.`,`Subtract ${b} and divide by ${a}: x = ${x}.`);
  }
  if(id==='systems') {
    const x=n+4,y=n+1;
    return q(id,i,`x + y = ${x+y} va 2x − y = ${2*x-y}. x ni toping.`,`If x + y = ${x+y} and 2x − y = ${2*x-y}, what is x?`,x,`Ikki tenglamani qo‘shamiz: 3x = ${3*x}. x = ${x}.`,`Add the equations: 3x = ${3*x}, so x = ${x}.`);
  }
  if(id==='quadratic') {
    const a=n+1,b=n+4;
    return q(id,i,`x² − ${a+b}x + ${a*b} = 0. Kattaroq ildizni toping.`,`What is the greater solution of x² − ${a+b}x + ${a*b} = 0?`,b,`(x − ${a})(x − ${b}) = 0. Ildizlar ${a} va ${b}; kattasi ${b}.`,`Factor: (x − ${a})(x − ${b}) = 0. The greater root is ${b}.`);
  }
  if(id==='exponential') {
    const a=10*(n+1),t=2+i%3,ans=a*2**t;
    return q(id,i,`Bakteriyalar soni ${a} ta. Har soatda 2 baravar bo‘ladi. ${t} soatdan keyin nechta bo‘ladi?`,`A population of ${a} bacteria doubles every hour. How many bacteria will there be after ${t} hours?`,ans,`${a} · 2^${t} = ${ans}.`,`${a} × 2^${t} = ${ans}.`);
  }
  if(id==='percent') {
    const price=100+20*n,p=10*(1+i%4),ans=price*(100-p)/100;
    return q(id,i,`Narxi ${price} bo‘lgan mahsulotga ${p}% chegirma berildi. Yangi narx qancha?`,`An item costs $${price}. Its price is reduced by ${p}%. What is the sale price in dollars?`,ans,`${price} · (1 − ${p}/100) = ${ans}.`,`${price} × (1 − ${p}/100) = ${ans}.`);
  }
  if(id==='statistics') {
    if(i%2===0) return q(id,i,`${n}, ${n+3}, ${n+6}, ${n+9} sonlarining o‘rta arifmetigi qancha?`,`What is the mean of ${n}, ${n+3}, ${n+6}, and ${n+9}?`,n+4.5,`(${n} + ${n+3} + ${n+6} + ${n+9}) / 4 = ${n+4.5}.`,`Sum the four values and divide by 4: ${n+4.5}.`);
    return q(id,i,`Qopda ${n} qizil va ${3*n} ko‘k shar bor. Tasodifiy bitta shar tanlansa, qizil bo‘lish ehtimoli qancha?`,`A bag contains ${n} red and ${3*n} blue balls. One ball is selected at random. What is the probability it is red?`,0.25,`${n} / (${n} + ${3*n}) = 1/4 = 0.25.`,`${n} / ${4*n} = 1/4 = 0.25.`);
  }
  if(id==='geometry') {
    const base=2*n+4,height=n+3,ans=base*height/2;
    return q(id,i,`Uchburchak asosi ${base} sm, balandligi ${height} sm. Yuzi necha sm²?`,`A triangle has a base of ${base} cm and a height of ${height} cm. What is its area in square centimeters?`,ans,`S = ${base} · ${height} / 2 = ${ans}.`,`Area = ${base} × ${height} / 2 = ${ans}.`);
  }
  const triples=[[3,4,5],[5,12,13],[8,15,17]], [a,b,c]=triples[i%3],scale=1+Math.floor(i/3),isSin=i%2===0;
  return q(id,i,`To‘g‘ri burchakli uchburchakda θ ga qarshi katet ${a*scale}, yon katet ${b*scale}, gipotenuza ${c*scale}. ${isSin?'sin':'tan'} θ ni kasr ko‘rinishida yozing.`,`In a right triangle, the side opposite θ is ${a*scale}, the adjacent side is ${b*scale}, and the hypotenuse is ${c*scale}. What is ${isSin?'sin':'tan'} θ? Give a fraction.`,a/(isSin?c:b),`${isSin?'sin':'tan'} θ = ${a*scale}/${(isSin?c:b)*scale} = ${a}/${isSin?c:b}.`,`${isSin?'sin θ = opposite / hypotenuse':'tan θ = opposite / adjacent'} = ${a}/${isSin?c:b}.`);
}));
export const QUESTION_MAP = new Map(QUESTIONS.map(question=>[question.id,question]));
export function numericAnswer(input) {
  const text=String(input??'').trim().replace(/−/g,'-').replace(/,/g,'.');
  const number='[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)';
  if(new RegExp(`^${number}$`).test(text)) return Number(text);
  if(new RegExp(`^${number}\\s*/\\s*${number}$`).test(text)) {
    const [a,b]=text.split('/').map(Number); return b===0?NaN:a/b;
  }
  return NaN;
}
export function isCorrect(question,input) {
  const value=numericAnswer(input);
  return Number.isFinite(value)&&Math.abs(value-question.answer)<1e-6;
}
export function emptyTrack() {return {settings:{minutes:15,date:'',target:'',language:'uz'},diagnostic:null,answers:{},mistakes:[],days:[],sessions:[],lessons:[]};}
export function emptyState() {return {version:1,tracks:{sat:emptyTrack(),national:emptyTrack()}};}
export function mastery(track,topic) {
  const entries=Object.entries(track.answers).filter(([id])=>QUESTION_MAP.get(id)?.topic===topic);
  if(!entries.length) return null;
  return Math.round(entries.filter(([,correct])=>correct).length/entries.length*100);
}
export function orderedTopics(track) {
  return [...TOPICS].sort((a,b)=>{
    const score=id=>{const m=mastery(track,id);return m===null?50:m;};
    return score(a.id)-score(b.id);
  });
}
export function chooseQuestions(track,mode,topic) {
  if(mode==='diagnostic') return TOPICS.flatMap(t=>QUESTIONS.filter(q=>q.topic===t.id).slice(0,2));
  if(mode==='review') return track.mistakes.map(id=>QUESTION_MAP.get(id)).filter(Boolean).slice(0,8);
  return QUESTIONS.filter(q=>q.topic===topic).sort((a,b)=>{
    const rank=q=>track.answers[q.id]===undefined?0:track.answers[q.id]?2:1;
    return rank(a)-rank(b);
  }).slice(0,Math.min(8,Math.max(3,Math.floor(track.settings.minutes/3))));
}
export function dayKey(now=new Date()) {return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tashkent',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export function streak(days,now=new Date()) {
  const set=new Set(days);let count=0,date=new Date(`${dayKey(now)}T12:00:00Z`);
  if(!set.has(dayKey(date)))date.setUTCDate(date.getUTCDate()-1);
  while(set.has(dayKey(date))){count++;date.setUTCDate(date.getUTCDate()-1);}
  return count;
}
