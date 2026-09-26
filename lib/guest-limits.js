import crypto from 'crypto';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

function readHeader(headers, name) {
  if (typeof headers?.get === 'function') return String(headers.get(name) || '');
  return String(headers?.[name] || headers?.[name.toLowerCase()] || '');
}
function requestIp(req) {
  const forwarded = readHeader(req.headers, 'x-forwarded-for').split(',')[0].trim();
  return forwarded || readHeader(req.headers, 'x-real-ip').trim() || req.socket?.remoteAddress || '';
}
async function redisCommand(command) {
  const response = await fetch(REDIS_URL, {
    method:'POST',
    headers:{Authorization:`Bearer ${REDIS_TOKEN}`,'Content-Type':'application/json'},
    body:JSON.stringify(command),
    signal:AbortSignal.timeout(5000)
  });
  const data = await response.json().catch(()=>({}));
  if (!response.ok || data.error) throw new Error(data.error || 'Redis xatoligi');
  return data.result;
}
async function incrementWithTtl(key, ttlSeconds) {
  const count = Number(await redisCommand(['INCR',key]));
  if (count === 1) await redisCommand(['EXPIRE',key,ttlSeconds]);
  if (!Number.isFinite(count) || count < 1) throw new Error('Redis hisoblagichi noto‘g‘ri');
  return count;
}
export async function checkGuestRateLimit(req, {
  scope='default', perMinute=5, perDay=40,
  message='Mehmon rejimidagi vaqtinchalik limit tugadi. Keyinroq qayta urinib ko‘ring.'
}={}) {
  if (!REDIS_URL || !REDIS_TOKEN) return {ok:false,status:503,message:'Mehmon rejimi hozircha ishlamayapti.'};
  const ip=requestIp(req);
  if (!ip) return {ok:false,status:503,message:'Mehmon sessiyasini yaratib bo‘lmadi.'};
  const safeScope=String(scope).replace(/[^a-z0-9_-]/gi,'').slice(0,32)||'default';
  const ipKey=crypto.createHash('sha256').update(ip).digest('hex').slice(0,24);
  const minuteBucket=Math.floor(Date.now()/60000);
  const dayBucket=new Date().toISOString().slice(0,10);
  const minuteKey=`mathlvl:guest:${safeScope}:min:${ipKey}:${minuteBucket}`;
  const dayKey=`mathlvl:guest:${safeScope}:day:${ipKey}:${dayBucket}`;
  const [minuteCount,dayCount]=await Promise.all([
    incrementWithTtl(minuteKey,120), incrementWithTtl(dayKey,172800)
  ]);
  if (minuteCount>perMinute || dayCount>perDay) return {ok:false,status:429,message};
  return {ok:true};
}
