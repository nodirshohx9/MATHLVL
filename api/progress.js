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
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command)
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

function userHash(email) {
  return crypto.createHash('sha256').update(String(email).toLowerCase()).digest('hex').slice(0, 32);
}
function progressKey(email) { return `mathlvl:book-progress:${userHash(email)}`; }
function mockKey(email) { return `mathlvl:mock-history:${userHash(email)}`; }

function cleanProgress(input) {
  const bookId = String(input?.bookId || '').trim();
  const currentPage = Math.max(1, Math.floor(Number(input?.currentPage) || 1));
  const totalPages = Math.max(currentPage, Math.floor(Number(input?.totalPages) || currentPage));
  const pageOffset = Math.max(0, Math.min(1, Number(input?.pageOffset) || 0));
  const progressPercent = Math.max(0, Math.min(100, Math.round(Number(input?.progressPercent) || (currentPage / totalPages * 100))));
  const updatedAt = Math.max(0, Math.floor(Number(input?.updatedAt) || Date.now()));
  if (!bookId || bookId.length > 160) return null;
  return { bookId, currentPage, totalPages, pageOffset, progressPercent, updatedAt };
}

function cleanMockResult(input) {
  const title = String(input?.title || '').trim().slice(0, 140);
  const total = Math.max(1, Math.min(200, Math.floor(Number(input?.total) || 1)));
  const correct = Math.max(0, Math.min(total, Math.floor(Number(input?.correct) || 0)));
  const answered = Math.max(0, Math.min(total, Math.floor(Number(input?.answered) || 0)));
  const atDate = new Date(input?.at || Date.now());
  if (!title || Number.isNaN(atDate.getTime())) return null;
  return { title, correct, total, answered, percent: Math.round(correct / total * 100), at: atDate.toISOString() };
}

async function getMockHistory(email) {
  const key = mockKey(email);
  const flat = await redisCommand(['HGETALL', key]);
  const results = [];
  for (let i = 0; i < (flat || []).length; i += 2) {
    try { results.push(JSON.parse(flat[i + 1])); } catch {}
  }
  results.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return results.slice(0, 50);
}

async function saveMockHistory(email, input) {
  const result = cleanMockResult(input);
  if (!result) return null;
  const key = mockKey(email);
  const id = crypto.createHash('sha256').update(`${result.title}|${result.at}`).digest('hex').slice(0, 24);
  await redisCommand(['HSET', key, id, JSON.stringify({ id, ...result })]);

  const flat = await redisCommand(['HGETALL', key]);
  if ((flat || []).length / 2 > 60) {
    const rows = [];
    for (let i = 0; i < flat.length; i += 2) {
      try { rows.push({ id: flat[i], ...JSON.parse(flat[i + 1]) }); } catch {}
    }
    rows.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    for (const old of rows.slice(50)) await redisCommand(['HDEL', key, old.id]);
  }
  return { id, ...result };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');

  if (!REDIS_URL || !REDIS_TOKEN || !process.env.SESSION_SECRET) {
    return res.status(500).json({ error: 'Server sozlanmagan' });
  }

  const session = verifySession(parseCookies(req.headers.cookie).nova_session, process.env.SESSION_SECRET);
  if (!session) return res.status(401).json({ error: 'not_logged_in' });

  const action = String(req.query?.action || 'books');

  try {
    if (action === 'mock-history') {
      if (req.method === 'GET') return res.status(200).json({ results: await getMockHistory(session.email) });
      if (req.method === 'POST') {
        const result = await saveMockHistory(session.email, req.body);
        if (!result) return res.status(400).json({ error: 'Natija noto‘g‘ri' });
        return res.status(201).json({ ok: true, result });
      }
      return res.status(405).json({ error: "Bu metod qo'llab-quvvatlanmaydi" });
    }

    const key = progressKey(session.email);
    if (req.method === 'GET') {
      const flat = await redisCommand(['HGETALL', key]);
      const progress = {};
      for (let i = 0; i < (flat || []).length; i += 2) {
        try {
          const value = JSON.parse(flat[i + 1]);
          const clean = cleanProgress({ ...value, bookId: flat[i] });
          if (clean) progress[clean.bookId] = clean;
        } catch {}
      }
      return res.status(200).json({ progress });
    }

    if (req.method === 'POST') {
      const clean = cleanProgress(req.body);
      if (!clean) return res.status(400).json({ error: 'notogri_progress' });
      await redisCommand(['HSET', key, clean.bookId, JSON.stringify(clean)]);
      return res.status(200).json({ ok: true, progress: clean });
    }

    if (req.method === 'DELETE') {
      const bookId = String(req.body?.bookId || '').trim();
      if (!bookId) return res.status(400).json({ error: 'bookId kerak' });
      await redisCommand(['HDEL', key, bookId]);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Bu metod qo'llab-quvvatlanmaydi" });
  } catch (err) {
    console.error('PROGRESS_XATO:', err);
    return res.status(500).json({ error: 'Progressni saqlashda xatolik' });
  }
}
