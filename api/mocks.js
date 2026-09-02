import crypto from 'crypto';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const HASH_KEY = 'nova:mocks';

function parseCookies(header) {
  const cookies = {};
  (header || '').split(';').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    cookies[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
  });
  return cookies;
}

function verifySignedCookie(token, secret) {
  if (!token || !secret) return null;
  const [data, sig] = token.split('.');
  if (!data || !sig) return null;
  const expected = crypto.createHmac('sha256', secret).update(data).digest('hex');
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function isAdmin(req) {
  const cookies = parseCookies(req.headers.cookie);
  const admin = verifySignedCookie(cookies.mathlvl_admin, process.env.SESSION_SECRET);
  return admin?.role === 'admin';
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

function cleanText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function normalizeMock(input, existing = {}) {
  const title = cleanText(input.title ?? existing.title, 140);
  const minutes = Math.max(1, Math.min(300, Number(input.minutes ?? existing.minutes) || 90));
  const rawQuestions = input.questions ?? existing.questions;

  if (title.length < 3) throw new Error('Mock test nomini kiriting');
  if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
    throw new Error('Kamida 1 ta savol kiriting');
  }
  if (rawQuestions.length > 100) throw new Error("Bitta mock testga ko'pi bilan 100 ta savol qo'shish mumkin");

  const questions = rawQuestions.map((item, index) => {
    const q = cleanText(item?.q, 1500);
    const o = Array.isArray(item?.o) ? item.o.slice(0, 4).map(v => cleanText(v, 500)) : [];
    const a = Number(item?.a);
    if (!q) throw new Error(`${index + 1}-savol matni kiritilmagan`);
    if (o.length !== 4 || o.some(option => !option)) {
      throw new Error(`${index + 1}-savolning 4 ta javob varianti to'liq emas`);
    }
    if (!Number.isInteger(a) || a < 0 || a > 3) {
      throw new Error(`${index + 1}-savol uchun to'g'ri javobni belgilang`);
    }
    return { q, o, a };
  });

  return {
    ...existing,
    title,
    minutes,
    questions,
    published: input.published !== undefined ? Boolean(input.published) : (existing.published !== false)
  };
}

export default async function handler(req, res) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(500).json({ error: 'Server sozlanmagan: UPSTASH kalitlar topilmadi' });
  }

  try {
    if (req.method === 'GET') {
      const admin = isAdmin(req);
      const flat = await redisCommand(['HGETALL', HASH_KEY]);
      const mocks = [];
      for (let index = 0; index < flat.length; index += 2) {
        try {
          const mock = JSON.parse(flat[index + 1]);
          if (admin || mock.published !== false) mocks.push(mock);
        } catch {}
      }
      mocks.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      res.setHeader('Cache-Control', admin ? 'private, no-store' : 'public, max-age=15, s-maxage=30');
      return res.status(200).json({ mocks });
    }

    if (!isAdmin(req)) return res.status(401).json({ error: 'Admin ruxsati kerak' });

    if (req.method === 'POST') {
      const now = Date.now();
      const mock = normalizeMock(req.body || {});
      mock.id = now.toString(36) + Math.random().toString(36).slice(2, 7);
      mock.createdAt = now;
      mock.updatedAt = now;
      await redisCommand(['HSET', HASH_KEY, mock.id, JSON.stringify(mock)]);
      return res.status(200).json({ mock });
    }

    if (req.method === 'PUT') {
      const id = cleanText(req.body?.id, 80);
      if (!id) return res.status(400).json({ error: 'id kerak' });
      const raw = await redisCommand(['HGET', HASH_KEY, id]);
      if (!raw) return res.status(404).json({ error: 'Mock test topilmadi' });
      const existing = JSON.parse(raw);
      const mock = normalizeMock(req.body || {}, existing);
      mock.id = id;
      mock.updatedAt = Date.now();
      await redisCommand(['HSET', HASH_KEY, id, JSON.stringify(mock)]);
      return res.status(200).json({ mock });
    }

    if (req.method === 'DELETE') {
      const id = cleanText(req.body?.id, 80);
      if (!id) return res.status(400).json({ error: 'id kerak' });
      await redisCommand(['HDEL', HASH_KEY, id]);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Bu metod qo'llab-quvvatlanmaydi" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
