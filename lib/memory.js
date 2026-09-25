const MEMORY_URL='https://nbpqyodesukgbznzgfek.supabase.co/functions/v1/teacher-memory';
export async function memoryRequest(cookie, action, messages) {
  const token=(cookie || '').split(';').map(p=>p.trim()).find(p=>p.startsWith('nova_session='))?.slice(13);
  if(!token) throw new Error('Hisobingizga kiring.');
  const response=await fetch(MEMORY_URL,{method:'POST',headers:{'Content-Type':'application/json','x-mathlvl-session':token},body:JSON.stringify({action,messages}),signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new Error('Xotirani yuklab bo‘lmadi.');
  return response.json();
}
export function memoryMessages(messages) {
  return messages.slice(-20).map(m=>({role:m.role,content:(typeof m.content==='string'?m.content:(m.content || []).filter(b=>b.type==='text').map(b=>b.text).join('\n')).slice(0,2500)}));
}
