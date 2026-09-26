import crypto from 'crypto';
import { checkGuestRateLimit } from '../lib/guest-limits.js';

const SESSION_MS=12*60*60*1000;
function parseCookies(header){
  const cookies={};
  (header||'').split(';').forEach(pair=>{
    const idx=pair.indexOf('=');
    if(idx===-1)return;
    try{cookies[pair.slice(0,idx).trim()]=decodeURIComponent(pair.slice(idx+1).trim())}catch{}
  });
  return cookies;
}
function verifySession(cookieVal,secret){
  if(!cookieVal||!secret)return null;
  const [data,sig]=cookieVal.split('.');
  if(!data||!sig)return null;
  const expected=crypto.createHmac('sha256',secret).update(data).digest('hex');
  if(sig.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return null;
  try{
    const payload=JSON.parse(Buffer.from(data,'base64url').toString());
    return payload.email&&payload.exp&&payload.exp>Date.now()?payload:null;
  }catch{return null}
}
function sameOrigin(req){
  const origin=String(req.headers.origin||'').trim();
  const host=String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim().toLowerCase();
  if(!origin||!host)return false;
  try{return new URL(origin).host.toLowerCase()===host}catch{return false}
}
export default async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('Pragma','no-cache');
  if(req.method!=='POST')return res.status(405).json({error:'Faqat POST so‘rovlar qabul qilinadi.'});
  if(!sameOrigin(req))return res.status(403).json({error:'Bu amal faqat MATHLVL saytidan bajariladi.'});
  const secret=process.env.SESSION_SECRET;
  if(!secret)return res.status(503).json({error:'Mehmon rejimi hozircha sozlanmagan.'});
  const existing=verifySession(parseCookies(req.headers.cookie).nova_session,secret);
  if(existing)return res.status(200).json({ok:true,isGuest:!!existing.guest,name:existing.guest?'Mehmon (sinov)':existing.name});
  let limit;
  try{limit=await checkGuestRateLimit(req,{scope:'session',perMinute:6,perDay:60,message:'Bugun mehmon rejimi ko‘p marta ishga tushirildi. Keyinroq qayta urinib ko‘ring.'})}
  catch{return res.status(503).json({error:'Mehmon sessiyasini yaratib bo‘lmadi. Keyinroq urinib ko‘ring.'})}
  if(!limit.ok)return res.status(limit.status).json({error:limit.message});
  const session={email:`guest-${crypto.randomUUID()}@guest.mathlvl.invalid`,name:'Mehmon (sinov)',guest:true,exp:Date.now()+SESSION_MS};
  const data=Buffer.from(JSON.stringify(session)).toString('base64url');
  const sig=crypto.createHmac('sha256',secret).update(data).digest('hex');
  res.setHeader('Set-Cookie',`nova_session=${data}.${sig}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${Math.floor(SESSION_MS/1000)}`);
  return res.status(200).json({ok:true,isGuest:true,name:session.name});
}
