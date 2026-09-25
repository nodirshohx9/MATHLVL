// Custom authentication: validate the existing signed MATHLVL session with its issuer.
// Never trust an email or owner ID supplied by the caller.
const reply = (data: unknown, status=200) => Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
Deno.serve(async (req: Request) => {
  if(req.method !== 'POST') return reply({error:'Method not allowed'},405);
  const token=req.headers.get('x-mathlvl-session') || '';
  if(!token || token.length>4096 || !/^[A-Za-z0-9_.%-]+$/.test(token)) return reply({error:'Unauthorized'},401);
  try {
    const auth=await fetch('https://mathlvl.com/api/auth',{headers:{Cookie:`nova_session=${token}`},signal:AbortSignal.timeout(8000),redirect:'error'});
    const user=await auth.json();
    if(!auth.ok || user.loggedIn!==true || typeof user.email!=='string') return reply({error:'Unauthorized'},401);
    const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(user.email.toLowerCase()));
    const owner=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
    const raw=await req.text();if(raw.length>100000)return reply({error:'Too large'},413);
    const body=JSON.parse(raw);
    const url=Deno.env.get('SUPABASE_URL')!+'/rest/v1/teacher_memory';
    const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
    const key=keys.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const headers:Record<string,string>={apikey:key,'Content-Type':'application/json'};
    if(!keys.default)headers.Authorization=`Bearer ${key}`;
    let result:Response;
    if(body.action==='read'){
      result=await fetch(url+'?owner_id=eq.'+owner+'&select=messages,updated_at',{headers});
      if(!result.ok)throw Error('database');const rows=await result.json();return reply({messages:rows[0]?.messages || []});
    }else if(body.action==='clear'){
      result=await fetch(url+'?owner_id=eq.'+owner,{method:'DELETE',headers});
    }else if(body.action==='write'){
      if(!Array.isArray(body.messages) || body.messages.length>20)return reply({error:'Invalid history'},400);
      const messages=body.messages.map((m:any)=>{
        if(!m || !['user','assistant'].includes(m.role)||typeof m.content!=='string'||m.content.length>4000)throw Error('invalid');
        return {role:m.role,content:m.content};
      });
      headers.Prefer='resolution=merge-duplicates';
      result=await fetch(url+'?on_conflict=owner_id',{method:'POST',headers,body:JSON.stringify({owner_id:owner,messages,updated_at:new Date().toISOString()})});
    }else return reply({error:'Invalid action'},400);
    if(!result.ok)throw Error('database');return reply({ok:true});
  }catch{return reply({error:'Xotiraga ulanishda xatolik.'},503);}
});
