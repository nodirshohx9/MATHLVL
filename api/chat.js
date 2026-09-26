import {memoryRequest} from '../lib/memory.js';
import { validateChat, outputLimit } from '../lib/chat-limits.js';
import { checkGuestRateLimit } from '../lib/guest-limits.js';
import { teacherSystem } from '../lib/teacher.js';
import crypto from 'crypto';

export const config = { maxDuration: 60 };

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const GEMINI_FALLBACK_MODELS = [...new Set([
  GEMINI_MODEL,
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash'
])];
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

function parseCookies(header) {
  const cookies = {};
  (header || '').split(';').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    try { try { cookies[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim()); } catch {} } catch {}
  });
  return cookies;
}

function verifySession(req) {
  const token = parseCookies(req.headers.cookie).nova_session;
  const secret = process.env.SESSION_SECRET;
  if (!token || !secret) return null;
  const [data, sig] = token.split('.');
  if (!data || !sig) return null;
  const expected = crypto.createHmac('sha256', secret).update(data).digest('hex');
  if (!/^[a-f0-9]{64}$/i.test(sig)) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (!payload.email || !payload.exp || payload.exp < Date.now() || payload.guest) return null;
    return payload;
  } catch {
    return null;
  }
}

async function redisCommand(command) {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  const r = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command)
  });
  const data = await r.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

async function checkRateLimit(email) {
  if (!REDIS_URL || !REDIS_TOKEN) return { ok: true };
  const id = crypto.createHash('sha256').update(email.toLowerCase()).digest('hex').slice(0, 24);
  const minuteBucket = Math.floor(Date.now() / 60000);
  const dayBucket = new Date().toISOString().slice(0, 10);
  const minuteKey = `mathlvl:ai:min:${id}:${minuteBucket}`;
  const dayKey = `mathlvl:ai:day:${id}:${dayBucket}`;
  const minuteCount = Number(await redisCommand(['INCR', minuteKey]));
  if (minuteCount === 1) await redisCommand(['EXPIRE', minuteKey, 120]);
  const dayCount = Number(await redisCommand(['INCR', dayKey]));
  if (dayCount === 1) await redisCommand(['EXPIRE', dayKey, 172800]);
  if (minuteCount > 15) return { ok: false, message: "Juda ko'p so'rov yuborildi. Bir ozdan keyin urinib ko'ring." };
  if (dayCount > 100) return { ok: false, message: 'Bugungi Ustoz AI limiti tugadi.' };
  return { ok: true };
}

async function readUsage(req, session) {
  if (!REDIS_URL || !REDIS_TOKEN) throw new Error('Redis sozlanmagan');
  const emailId = crypto.createHash('sha256').update(String(session.email).toLowerCase()).digest('hex').slice(0,24);
  const now = Date.now();
  const minuteBucket = Math.floor(now / 60000);
  const dayBucket = new Date(now).toISOString().slice(0,10);
  const keys = [
    `mathlvl:ai:min:${emailId}:${minuteBucket}`,
    `mathlvl:ai:day:${emailId}:${dayBucket}`
  ];
  let minuteLimit = 15, dayLimit = 100;
  if (session.guest) {
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
      || String(req.headers['x-real-ip'] || '').trim() || req.socket?.remoteAddress || '';
    if (!ip) throw new Error('Mehmon IP topilmadi');
    const ipId = crypto.createHash('sha256').update(ip).digest('hex').slice(0,24);
    keys.push(`mathlvl:guest:ai:min:${ipId}:${minuteBucket}`, `mathlvl:guest:ai:day:${ipId}:${dayBucket}`);
    minuteLimit = 6; dayLimit = 40;
  }
  const counts = await Promise.all(keys.map(async key => Number(await redisCommand(['GET',key])) || 0));
  const minuteUsed = Math.max(counts[0], session.guest ? counts[2] : 0);
  const dayUsed = Math.max(counts[1], session.guest ? counts[3] : 0);
  const today = new Date(now);
  const resetsAt = new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),today.getUTCDate()+1));
  return { isGuest:!!session.guest, dailyLimit:dayLimit, dailyUsed:dayUsed, dailyRemaining:Math.max(0,dayLimit-dayUsed), minuteLimit, minuteUsed, minuteRemaining:Math.max(0,minuteLimit-minuteUsed), resetsAt:resetsAt.toISOString(), intervalHours:24 };
}
function toGeminiParts(content) {
  if (typeof content === 'string') return [{ text: content }];
  if (Array.isArray(content)) {
    return content.map(block => block.type === 'image'
      ? { inline_data: { mime_type: block.source.media_type, data: block.source.data } }
      : { text: block.text || '' });
  }
  return [{ text: String(content || '') }];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryableGeminiStatus(status) {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

async function requestGeminiWithFallback(apiKey, body) {
  let last = null;

  for (let modelIndex = 0; modelIndex < GEMINI_FALLBACK_MODELS.length; modelIndex++) {
    const model = GEMINI_FALLBACK_MODELS[modelIndex];
    const attempts = modelIndex === 0 ? 2 : 1;

    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(12000)
        });
        const data = await response.json().catch(() => ({}));

        if (response.ok) {
          return { response, data, model };
        }

        last = { response, data, model };

        if (!isRetryableGeminiStatus(response.status)) {
          return last;
        }

        // High-demand / temporary capacity errors are usually short lived.
        await sleep(350 + (modelIndex * 180) + (attempt * 300));
      } catch (error) {
        last = { response: null, data: { error: { message: error.message } }, model };
        await sleep(300 + (modelIndex * 150));
      }
    }
  }

  return last;
}

export default async function handler(req, res) {
  if(req.query?.action === 'usage'){
    res.setHeader('Cache-Control','private, no-store, max-age=0');
    res.setHeader('Pragma','no-cache');
    if(req.method !== 'GET') return res.status(405).json({error:'Faqat GET so‘rovi qabul qilinadi'});
    const session = verifySession(req);
    if(!session) return res.status(401).json({error:'Hisob yoki mehmon sessiyasi topilmadi.'});
    try { return res.status(200).json(await readUsage(req,session)); }
    catch(error) { console.error('CHAT_USAGE_ERROR:',error); return res.status(503).json({error:'Limit ma’lumoti vaqtincha olinmadi.'}); }
  }
  if(req.query?.action === 'memory'){
    res.setHeader('Cache-Control','private, no-store');
    if(!['GET','DELETE'].includes(req.method))return res.status(405).json({error:'Method not allowed'});
    const session=verifySession(req);
    if(!session)return res.status(401).json({error:'Hisobingizga kiring.'});
    if(req.method==='DELETE'&&req.headers.origin&&req.headers.origin!==`https://${req.headers.host}`)return res.status(403).json({error:'Forbidden'});
    if(session.guest)return res.status(200).json({messages:[],isGuest:true});
    try{return res.status(200).json(await memoryRequest(req.headers.cookie,req.method==='GET'?'read':'clear'));}
    catch{return res.status(503).json({error:'Suhbat xotirasi hozir mavjud emas.'});}
  }

  if (req.method !== 'POST') return res.status(405).json({ error: "Faqat POST so'rovlar qabul qilinadi" });

  const session = verifySession(req);
  if (!session) return res.status(401).json({ error: 'Ustoz AI uchun avval tizimga kiring.' });

  let limit;
  try { limit = await checkRateLimit(session.email); } catch { return res.status(503).json({error:'AI vaqtincha band. Qayta urinib ko‘ring.'}); }
  if (!limit.ok) return res.status(429).json({ error: limit.message });
  if (session.guest) {
    let guestLimit;
    try { guestLimit=await checkGuestRateLimit(req,{scope:'ai',perMinute:6,perDay:40}); }
    catch { return res.status(503).json({error:'Mehmon rejimidagi AI vaqtincha ishlamayapti.'}); }
    if (!guestLimit.ok) return res.status(guestLimit.status).json({error:guestLimit.message});
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server sozlanmagan: GEMINI_API_KEY topilmadi' });

  try {
    const invalid = validateChat(req.body);
    if(invalid) return res.status(400).json({error:invalid});
    const { system, messages = [], tools, max_tokens, mode } = req.body || {};
    const contents = messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: toGeminiParts(m.content) }));
    const isSolve = mode === 'solve';

    const generationConfig = {
      maxOutputTokens: outputLimit(max_tokens, isSolve),
      temperature: isSolve ? 0.1 : 0.35,
      thinkingConfig: {
        // Solver gets real reasoning budget; ordinary non-stream calls stay fast.
        thinkingLevel: isSolve ? 'high' : 'low'
      }
    };

    if (isSolve) {
      // Gemini JSON mode prevents LaTeX backslashes/newlines from breaking JSON.
      generationConfig.responseMimeType = 'application/json';
    }

    const geminiBody = {
      contents,
      generationConfig
    };
    const effectiveSystem = isSolve ? system : teacherSystem(system);
    if (effectiveSystem) geminiBody.systemInstruction = { parts: [{ text: effectiveSystem }] };
    if (Array.isArray(tools) && tools.some(t => t.type === 'web_search_20250305')) geminiBody.tools = [{ google_search: {} }];

    const upstream = await requestGeminiWithFallback(apiKey, geminiBody);
    if (!upstream?.response?.ok) {
      const status = upstream?.response?.status || 503;
      const raw = upstream?.data?.error?.message || '';

      if (status === 429) {
        return res.status(429).json({ error: 'AI hozir band. Bir necha soniyadan keyin qayta urinib ko‘ring.' });
      }
      if (status >= 500) {
        return res.status(503).json({ error: 'AI serveri vaqtincha band. Qayta urinib ko‘ring.' });
      }
      return res.status(status).json({ error: raw || 'AI xizmatida xatolik yuz berdi.' });
    }

    const data = upstream.data;
    const candidate = data.candidates?.[0];
    const text = (candidate?.content?.parts || []).map(p => p.text || '').join('');
    if (!text) {
      return res.status(502).json({ error: 'AI bo‘sh javob qaytardi' });
    }

    const finishReason = candidate?.finishReason || '';
    if (isSolve && finishReason === 'MAX_TOKENS') {
      return res.status(502).json({ error: 'Masala yechimi juda uzun bo‘lib ketdi. Qayta urinib ko‘ring.' });
    }

    return res.status(200).json({
      content: [{ type: 'text', text }],
      finishReason,
      model: upstream.model
    });
  } catch (err) {
    console.error('CHAT_API_ERROR:', err);
    return res.status(500).json({ error: 'Ustoz AI vaqtincha javob bera olmadi. Qayta urinib ko‘ring.' });
  }
}


