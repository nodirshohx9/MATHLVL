import crypto from 'crypto';

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

function verifySession(cookieVal, secret) {
  if (!cookieVal || !secret) return null;
  const [data, sig] = cookieVal.split('.');
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
  const response = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command)
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

function userKey(email) {
  const hash = crypto.createHash('sha256').update(String(email).toLowerCase()).digest('hex').slice(0, 32);
  return `mathlvl:mock-history:${hash}`;
}

function cleanResult(body) {
  const title = String(body?.title || '').trim().slice(0, 140);
  const correct = Math.max(0, Math.floor(Number(body?.correct) || 0));
  const total = Math.max(1, Math.min(200, Math.floor(Number(body?.total) || 1)));
  const answered = Math.max(0, Math.min(total, Math.floor(Number(body?.answered) || 0)));
  const atDate = new Date(body?.at || Date.now());
  if (!title || Number.isNaN(atDate.getTime())) return null;
  const cappedCorrect = Math.min(correct, total);
  return {
    title,
    correct: cappedCorrect,
    total,
    answered,
    percent: Math.round(cappedCorrect / total * 100),
    at: atDate.toISOString()
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');

  if (!REDIS_URL || !REDIS_TOKEN || !process.env.SESSION_SECRET) {
    return res.status(500).json({ error: 'Server sozlanmagan' });
  }

  const session = verifySession(parseCookies(req.headers.cookie).nova_session, process.env.SESSION_SECRET);
  if (!session) return res.status(401).json({ error: 'not_logged_in' });
  const key = userKey(session.email);

  try {
    if (req.method === 'GET') {
      const flat = await redisCommand(['HGETALL', key]);
      const results = [];
      for (let i = 0; i < (flat || []).length; i += 2) {
        try { results.push(JSON.parse(flat[i + 1])); } catch {}
      }
      results.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
      return res.status(200).json({ results: results.slice(0, 50) });
    }

    if (req.method === 'POST') {
      const result = cleanResult(req.body);
      if (!result) return res.status(400).json({ error: 'Natija noto‘g‘ri' });
      const id = crypto.createHash('sha256').update(`${result.title}|${result.at}`).digest('hex').slice(0, 24);
      await redisCommand(['HSET', key, id, JSON.stringify({ id, ...result })]);

      // Keep storage bounded: when it grows, remove the oldest records.
      const flat = await redisCommand(['HGETALL', key]);
      if ((flat || []).length / 2 > 60) {
        const rows = [];
        for (let i = 0; i < flat.length; i += 2) {
          try { rows.push({ id: flat[i], ...JSON.parse(flat[i + 1]) }); } catch {}
        }
        rows.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
        for (const old of rows.slice(50)) await redisCommand(['HDEL', key, old.id]);
      }
      return res.status(201).json({ ok: true, result: { id, ...result } });
    }

    return res.status(405).json({ error: "Bu metod qo'llab-quvvatlanmaydi" });
  } catch (err) {
    console.error('MOCK_HISTORY_XATO:', err);
    return res.status(500).json({ error: 'Mock tarixini saqlashda xatolik' });
  }
}
