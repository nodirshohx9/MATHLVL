import crypto from 'crypto';

export const config = { maxDuration: 30 };

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const HASH_KEY = 'nova:books';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

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

function aiSafeBook(book) {
  return {
    id: book.id,
    title: book.title || '',
    author: book.author || '',
    subject: book.subject || '',
    grade: book.grade || '',
    category: book.category || '',
    bookType: book.bookType || '',
    accessType: book.accessType || 'FREE',
    price: Number(book.price) || 0,
    coverUrl: book.coverUrl || ''
  };
}

function parseAiJson(text, fallback) {
  if (!text) return fallback;
  const cleaned = String(text)
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try { return JSON.parse(cleaned); } catch {}
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first >= 0 && last > first) {
    try { return JSON.parse(cleaned.slice(first, last + 1)); } catch {}
  }
  return fallback;
}

async function callGeminiForBooks(parts, maxOutputTokens = 700) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY topilmadi');

  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      maxOutputTokens,
      temperature: 0.1,
      thinkingConfig: { thinkingBudget: 0 }
    }
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || 'Gemini API xatoligi');
  return (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
}

async function loadAllStoredBooks() {
  const flat = await redisCommand(['HGETALL', HASH_KEY]);
  const books = [];
  for (let i = 0; i < flat.length; i += 2) {
    try {
      const book = JSON.parse(flat[i + 1]);
      if (book?.id) books.push(book);
    } catch {}
  }
  return books;
}

async function shortlistTopicBooks(query, books) {
  const catalog = books.map(book => ({
    id: book.id,
    title: book.title || '',
    author: book.author || '',
    subject: book.subject || '',
    grade: book.grade || '',
    category: book.category || '',
    bookType: book.bookType || ''
  }));

  const prompt = `
Siz MATHLVL kutubxonasi qidiruv yordamchisisiz.
Foydalanuvchi izlayotgan matematika mavzusi yoki savoli: "${query}"

Quyidagi REAL katalogdan shu mavzu bo'lish ehtimoli eng yuqori ko'pi bilan 3 ta kitobni tanlang.
Faqat katalogdagi ID lardan foydalaning, yangi kitob o'ylab topmang.
Sinf, fan, kitob nomi va muallif metadata sini hisobga oling.
Faqat JSON qaytaring: {"ids":["id1","id2"]}

KATALOG:
${JSON.stringify(catalog)}
`;

  const raw = await callGeminiForBooks([{ text: prompt }], 300);
  const parsed = parseAiJson(raw, { ids: [] });
  const allowed = new Set(books.map(book => String(book.id)));
  const ids = Array.isArray(parsed.ids)
    ? parsed.ids.map(String).filter(id => allowed.has(id)).slice(0, 3)
    : [];

  return ids.length ? ids : books.slice(0, 3).map(book => String(book.id));
}

async function fetchPdfForGemini(book, remainingBytes) {
  if (!book.fileUrl || remainingBytes < 200000) return null;
  try {
    const response = await fetch(book.fileUrl, { redirect: 'follow' });
    if (!response.ok) return null;

    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (!contentType.includes('pdf') && !String(book.fileUrl).toLowerCase().includes('.pdf')) return null;

    const declared = Number(response.headers.get('content-length') || 0);
    if (declared && declared > remainingBytes) return null;

    const buffer = await response.arrayBuffer();
    if (!buffer.byteLength || buffer.byteLength > remainingBytes) return null;

    return {
      bytes: buffer.byteLength,
      part: {
        inline_data: {
          mime_type: 'application/pdf',
          data: Buffer.from(buffer).toString('base64')
        }
      }
    };
  } catch {
    return null;
  }
}

async function verifyTopicInsideBooks(query, candidates) {
  const parts = [{
    text: `
Quyidagi MATHLVL kitob PDF larini tekshiring.
Foydalanuvchi izlayotgan mavzu: "${query}"

Har bir PDF ichida shu mavzu haqiqatan bor-yo'qligini tekshiring.
Mavzu aynan bir xil nom bilan yozilmagan bo'lsa ham, mazmunan mos bo'lsa found=true qiling.
Faqat JSON qaytaring:
{"matches":[{"id":"BOOK_ID","found":true,"confidence":"high|medium|low","reason":"qisqa sabab"}]}
Faqat berilgan BOOK_ID lardan foydalaning.
`
  }];

  let remaining = 14 * 1024 * 1024;
  const attachedIds = [];

  for (const book of candidates) {
    const pdf = await fetchPdfForGemini(book, remaining);
    if (!pdf) continue;
    parts.push({
      text: `\nBOOK_ID: ${book.id}\nTITLE: ${book.title || ''}\nGRADE: ${book.grade || ''}\nSUBJECT: ${book.subject || ''}\nPDF:`
    });
    parts.push(pdf.part);
    remaining -= pdf.bytes;
    attachedIds.push(String(book.id));
    if (attachedIds.length >= 3 || remaining < 300000) break;
  }

  if (!attachedIds.length) return null;

  const raw = await callGeminiForBooks(parts, 700);
  const parsed = parseAiJson(raw, { matches: [] });
  const allowed = new Set(attachedIds);
  const matches = Array.isArray(parsed.matches)
    ? parsed.matches.filter(item => allowed.has(String(item.id)) && item.found === true).slice(0, 3)
    : [];

  return { matches };
}

async function searchBooksByTopic(query) {
  const cacheHash = crypto.createHash('sha256').update(query.toLowerCase()).digest('hex').slice(0, 24);
  const cacheKey = `mathlvl:book-topic:${cacheHash}`;

  const cached = await redisCommand(['GET', cacheKey]).catch(() => null);
  if (cached) {
    try { return JSON.parse(cached); } catch {}
  }

  const books = await loadAllStoredBooks();
  if (!books.length) return { matches: [], verified: false };

  const ids = await shortlistTopicBooks(query, books);
  const candidates = ids.map(id => books.find(book => String(book.id) === String(id))).filter(Boolean);

  let resultBooks = candidates;
  let verification = [];
  let verified = false;

  try {
    const scan = await verifyTopicInsideBooks(query, candidates);
    if (scan?.matches?.length) {
      const foundIds = new Set(scan.matches.map(item => String(item.id)));
      resultBooks = candidates.filter(book => foundIds.has(String(book.id)));
      verification = scan.matches;
      verified = true;
    }
  } catch {}

  const payload = {
    matches: resultBooks.slice(0, 3).map(book => {
      const info = verification.find(item => String(item.id) === String(book.id));
      return {
        ...aiSafeBook(book),
        verified: !!info,
        confidence: info?.confidence || 'metadata',
        reason: info?.reason || ''
      };
    }),
    verified
  };

  await redisCommand(['SET', cacheKey, JSON.stringify(payload), 'EX', '3600']).catch(() => null);
  return payload;
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
        // This response can contain the real PDF URL, so never let a browser/CDN cache it.
        res.setHeader('Cache-Control', 'private, no-store, max-age=0');
        res.setHeader('Pragma', 'no-cache');

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

    if (req.method === 'POST' && req.query.action === 'topic-search') {
      const auth = getAuth(req);
      if (!auth.user) return res.status(401).json({ error: 'Ustoz AI uchun avval tizimga kiring.' });

      const query = String(req.body?.query || '').trim().slice(0, 500);
      if (query.length < 2) return res.status(400).json({ error: 'Mavzuni yozing' });

      const payload = await searchBooksByTopic(query);
      res.setHeader('Cache-Control', 'private, no-store');
      return res.status(200).json(payload);
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
