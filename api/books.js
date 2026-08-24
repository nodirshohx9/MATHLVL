import crypto from 'crypto';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const HASH_KEY = 'nova:books';

function parseCookies(header) {
  const cookies = {};
  (header || '').split(';').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    cookies[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
  });
  return cookies;
}

function verifyAdmin(req) {
  const token = parseCookies(req.headers.cookie).mathlvl_admin;
  const secret = process.env.SESSION_SECRET;
  if (!token || !secret) return false;
  const [data, sig] = token.split('.');
  if (!data || !sig) return false;
  const expected = crypto.createHmac('sha256', secret).update(data).digest('hex');
  if (sig.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    return payload.role === 'admin' && payload.exp > Date.now();
  } catch {
    return false;
  }
}

async function redisCommand(command) {
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command)
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

export default async function handler(req, res) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(500).json({ error: 'Server sozlanmagan: UPSTASH kalitlar topilmadi' });
  }

  try {
    if (req.method === 'GET') {
      const flat = await redisCommand(['HGETALL', HASH_KEY]);
      const books = [];
      for (let i = 0; i < flat.length; i += 2) {
        try { books.push(JSON.parse(flat[i + 1])); } catch {}
      }
      books.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      return res.status(200).json({ books });
    }

    if (!verifyAdmin(req)) {
      return res.status(401).json({ error: 'Admin ruxsati kerak' });
    }

    if (req.method === 'POST') {
      const { title, author, fileUrl, coverUrl, bookType, subject, grade, category, accessType, price } = req.body || {};
      if (!title || !fileUrl) return res.status(400).json({ error: 'title va fileUrl kerak' });
      const book = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        title, author: author || '', fileUrl, coverUrl: coverUrl || '',
        bookType: bookType || 'TEXTBOOK', subject: subject || '', grade: grade || '', category: category || '',
        accessType: accessType || 'FREE', price: Number(price) || 0,
        createdAt: Date.now(), updatedAt: Date.now()
      };
      await redisCommand(['HSET', HASH_KEY, book.id, JSON.stringify(book)]);
      return res.status(200).json({ book });
    }

    if (req.method === 'PUT') {
      const { id, title, author, fileUrl, coverUrl, bookType, subject, grade, category, accessType, price } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id kerak' });
      const existingRaw = await redisCommand(['HGET', HASH_KEY, id]);
      if (!existingRaw) return res.status(404).json({ error: 'Kitob topilmadi' });
      const existing = JSON.parse(existingRaw);
      const updated = {
        ...existing,
        title: title || existing.title,
        author: author !== undefined ? author : existing.author,
        fileUrl: fileUrl || existing.fileUrl,
        coverUrl: coverUrl !== undefined ? coverUrl : existing.coverUrl,
        bookType: bookType || existing.bookType,
        subject: subject !== undefined ? subject : existing.subject,
        grade: grade !== undefined ? grade : existing.grade,
        category: category !== undefined ? category : existing.category,
        accessType: accessType || existing.accessType,
        price: price !== undefined ? (Number(price) || 0) : existing.price,
        updatedAt: Date.now()
      };
      await redisCommand(['HSET', HASH_KEY, id, JSON.stringify(updated)]);
      return res.status(200).json({ book: updated });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id kerak' });
      await redisCommand(['HDEL', HASH_KEY, id]);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Bu metod qo'llab-quvvatlanmaydi" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
