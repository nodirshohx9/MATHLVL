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

function getAuth(req) {
  const cookies = parseCookies(req.headers.cookie);
  const secret = process.env.SESSION_SECRET;
  const admin = verifySignedCookie(cookies.mathlvl_admin, secret);
  const user = verifySignedCookie(cookies.nova_session, secret);
  return {
    isAdmin: admin?.role === 'admin',
    user: user?.email ? user : null
  };
}

function verifyAdmin(req) {
  return getAuth(req).isAdmin;
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

function publicBook(book, includeFile = false) {
  const safe = { ...book };
  if (!includeFile) delete safe.fileUrl;
  return safe;
}

async function hasActivePlus(email) {
  if (!email) return false;
  const raw = await redisCommand(['GET', `nova:plus:${email}`]);
  if (!raw) return false;
  try {
    const plus = JSON.parse(raw);
    return Number(plus.expiresAt) > Date.now();
  } catch {
    return false;
  }
}

async function hasBookPurchase(email, bookId) {
  if (!email || !bookId) return false;
  const raw = await redisCommand(['GET', `nova:book-purchase:${email}:${bookId}`]);
  if (!raw) return false;
  if (raw === '1' || raw === 'true') return true;
  try {
    const purchase = JSON.parse(raw);
    return purchase.active !== false && (!purchase.expiresAt || Number(purchase.expiresAt) > Date.now());
  } catch {
    return false;
  }
}

async function canOpenBook(book, auth) {
  if (auth.isAdmin) return { ok: true };
  if (!auth.user) return { ok: false, status: 401, error: 'not_logged_in' };

  const access = book.accessType || 'FREE';
  if (access === 'FREE') return { ok: true };

  const email = auth.user.email;
  if (access === 'PLUS') {
    return (await hasActivePlus(email))
      ? { ok: true }
      : { ok: false, status: 403, error: 'plus_required' };
  }

  if (access === 'PURCHASE') {
    return (await hasBookPurchase(email, book.id))
      ? { ok: true }
      : { ok: false, status: 403, error: 'purchase_required' };
  }

  if (access === 'PLUS_OR_PURCHASE') {
    const [plus, purchased] = await Promise.all([
      hasActivePlus(email),
      hasBookPurchase(email, book.id)
    ]);
    return (plus || purchased)
      ? { ok: true }
      : { ok: false, status: 403, error: 'plus_or_purchase_required' };
  }

  return { ok: false, status: 403, error: 'access_denied' };
}

export default async function handler(req, res) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(500).json({ error: 'Server sozlanmagan: UPSTASH kalitlar topilmadi' });
  }

  try {
    if (req.method === 'GET') {
      const auth = getAuth(req);
      const action = req.query.action;

      if (action === 'open') {
        const id = String(req.query.id || '');
        if (!id) return res.status(400).json({ error: 'id kerak' });

        const raw = await redisCommand(['HGET', HASH_KEY, id]);
        if (!raw) return res.status(404).json({ error: 'Kitob topilmadi' });

        const book = JSON.parse(raw);
        const access = await canOpenBook(book, auth);
        if (!access.ok) return res.status(access.status).json({ error: access.error });

        return res.status(200).json({
          book: publicBook(book, true),
          fileUrl: book.fileUrl
        });
      }

      const flat = await redisCommand(['HGETALL', HASH_KEY]);
      const books = [];
      for (let i = 0; i < flat.length; i += 2) {
        try {
          const book = JSON.parse(flat[i + 1]);
          books.push(publicBook(book, auth.isAdmin));
        } catch {}
      }
      books.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      res.setHeader('Cache-Control', auth.isAdmin ? 'private, no-store' : 'public, max-age=30, s-maxage=60');
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
