import crypto from 'crypto';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

function parseCookies(header) {
  const cookies = {};
  (header || '').split(';').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx < 0) return;
    try { cookies[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim()); } catch {}
  });
  return cookies;
}
function verifySession(req) {
  const token = parseCookies(req.headers.cookie).nova_session;
  const secret = process.env.SESSION_SECRET;
  if (!token || !secret) return null;
  const [data, sig] = token.split('.');
  if (!data || !sig || !/^[a-f0-9]{64}$/i.test(sig)) return null;
  const expected = crypto.createHmac('sha256', secret).update(data).digest();
  const supplied = Buffer.from(sig, 'hex');
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (!payload.email || !payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch { return null; }
}
function requestIp(req) {
  return String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || String(req.headers['x-real-ip'] || '').trim()
    || req.socket?.remoteAddress || '';
}
async function redisGet(key) {
  const response = await fetch(REDIS_URL, {
    method:'POST',
    headers:{Authorization:`Bearer ${REDIS_TOKEN}`,'Content-Type':'application/json'},
    body:JSON.stringify(['GET', key]),
    signal:AbortSignal.timeout(5000)
  });
  const data = await response.json().catch(()=>({}));
  if (!response.ok || data.error) throw new Error(data.error || 'Redis xatoligi');
  return Number(data.result) || 0;
}
function remaining(limit, count) { return Math.max(0, limit - count); }

export default async function handler(req, res) {
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('Pragma','no-cache');
  if (req.method !== 'GET') return res.status(405).json({error:'Faqat GET so‘rovi qabul qilinadi'});
  if (!REDIS_URL || !REDIS_TOKEN || !process.env.SESSION_SECRET) return res.status(503).json({error:'Limit ma’lumoti vaqtincha mavjud emas.'});
  const session = verifySession(req);
  if (!session) return res.status(401).json({error:'Hisob yoki mehmon sessiyasi topilmadi.'});

  try {
    const emailId = crypto.createHash('sha256').update(String(session.email).toLowerCase()).digest('hex').slice(0,24);
    const now = Date.now();
    const minuteBucket = Math.floor(now / 60000);
    const dayBucket = new Date(now).toISOString().slice(0,10);
    const emailMinuteKey = `mathlvl:ai:min:${emailId}:${minuteBucket}`;
    const emailDayKey = `mathlvl:ai:day:${emailId}:${dayBucket}`;
    let minuteLimit = 15;
    let dayLimit = 100;
    const keys = [emailMinuteKey, emailDayKey];

    if (session.guest) {
      const ip = requestIp(req);
      if (!ip) return res.status(503).json({error:'Mehmon limiti vaqtincha mavjud emas.'});
      const ipId = crypto.createHash('sha256').update(ip).digest('hex').slice(0,24);
      keys.push(`mathlvl:guest:ai:min:${ipId}:${minuteBucket}`, `mathlvl:guest:ai:day:${ipId}:${dayBucket}`);
      minuteLimit = 6;
      dayLimit = 40;
    }

    const counts = await Promise.all(keys.map(redisGet));
    const minuteUsed = Math.max(counts[0], session.guest ? counts[2] : 0);
    const dayUsed = Math.max(counts[1], session.guest ? counts[3] : 0);
    const nextDay = new Date(Date.UTC(now ? new Date(now).getUTCFullYear() : 0, new Date(now).getUTCMonth(), new Date(now).getUTCDate()+1));
    return res.status(200).json({
      isGuest:!!session.guest,
      dailyLimit:dayLimit,
      dailyUsed:dayUsed,
      dailyRemaining:remaining(dayLimit,dayUsed),
      minuteLimit,
      minuteUsed,
      minuteRemaining:remaining(minuteLimit,minuteUsed),
      resetsAt:nextDay.toISOString(),
      intervalHours:24
    });
  } catch (error) {
    console.error('CHAT_USAGE_ERROR:',error);
    return res.status(503).json({error:'Limit ma’lumoti vaqtincha olinmadi.'});
  }
}
