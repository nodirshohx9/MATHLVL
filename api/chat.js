import crypto from 'crypto';

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

function parseCookies(header) {
  const cookies = {};
  (header || '').split(';').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    cookies[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
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
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (!payload.email || !payload.exp || payload.exp < Date.now()) return null;
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

function toGeminiParts(content) {
  if (typeof content === 'string') return [{ text: content }];
  if (Array.isArray(content)) {
    return content.map(block => block.type === 'image'
      ? { inline_data: { mime_type: block.source.media_type, data: block.source.data } }
      : { text: block.text || '' });
  }
  return [{ text: String(content || '') }];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: "Faqat POST so'rovlar qabul qilinadi" });

  const session = verifySession(req);
  if (!session) return res.status(401).json({ error: 'Ustoz AI uchun avval tizimga kiring.' });

  const limit = await checkRateLimit(session.email);
  if (!limit.ok) return res.status(429).json({ error: limit.message });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server sozlanmagan: GEMINI_API_KEY topilmadi' });

  try {
    const { system, messages = [], tools, max_tokens } = req.body || {};
    const contents = messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: toGeminiParts(m.content) }));
    const geminiBody = {
      contents,
      generationConfig: { maxOutputTokens: Math.max(max_tokens || 1000, 1500), thinkingConfig: { thinkingBudget: 0 } }
    };
    if (system) geminiBody.systemInstruction = { parts: [{ text: system }] };
    if (Array.isArray(tools) && tools.some(t => t.type === 'web_search_20250305')) geminiBody.tools = [{ google_search: {} }];

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
    const geminiRes = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(geminiBody) });
    const data = await geminiRes.json();
    if (!geminiRes.ok) return res.status(geminiRes.status).json({ error: data.error?.message || 'Gemini API xatoligi' });
    const text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
    return res.status(200).json({ content: [{ type: 'text', text }] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
