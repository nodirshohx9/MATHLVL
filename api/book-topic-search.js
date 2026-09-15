import crypto from 'crypto';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
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
    if (!payload.email || !payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

async function redisCommand(command) {
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command)
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

function safeBook(book) {
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

function parseJson(text, fallback) {
  if (!text) return fallback;
  const cleaned = String(text)
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try { return JSON.parse(cleaned); } catch {}
  const firstObj = cleaned.indexOf('{');
  const lastObj = cleaned.lastIndexOf('}');
  if (firstObj >= 0 && lastObj > firstObj) {
    try { return JSON.parse(cleaned.slice(firstObj, lastObj + 1)); } catch {}
  }
  return fallback;
}

async function callGemini(parts, maxOutputTokens = 900) {
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
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || 'Gemini API xatoligi');

  return (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
}

async function loadBooks() {
  const flat = await redisCommand(['HGETALL', HASH_KEY]);
  const books = [];
  for (let i = 0; i < flat.length; i += 2) {
    try {
      const b = JSON.parse(flat[i + 1]);
      if (b && b.id) books.push(b);
    } catch {}
  }
  return books;
}

async function shortlistBooks(query, books) {
  const catalog = books.map(b => ({
    id: b.id,
    title: b.title || '',
    author: b.author || '',
    subject: b.subject || '',
    grade: b.grade || '',
    category: b.category || '',
    bookType: b.bookType || ''
  }));

  const prompt = `
Siz MATHLVL kutubxonasi uchun qidiruv yordamchisisiz.
Foydalanuvchi mavzu so'radi: "${query}"

Quyidagi REAL katalogdan shu mavzu bo'lish ehtimoli eng yuqori bo'lgan ko'pi bilan 3 ta kitob ID sini tanlang.
Faqat katalogdagi ID lardan foydalaning. Hech qanday yangi kitob o'ylab topmang.
Agar aniq mavzu bir sinf darsligiga tegishli bo'lsa, sinf/fan metadata asosida eng mosini tanlang.
Faqat JSON qaytaring: {"ids":["id1","id2"]}

KATALOG:
${JSON.stringify(catalog)}
`;

  const raw = await callGemini([{ text: prompt }], 300);
  const parsed = parseJson(raw, { ids: [] });
  const allowed = new Set(books.map(b => b.id));
  const ids = Array.isArray(parsed.ids) ? parsed.ids.filter(id => allowed.has(id)).slice(0, 3) : [];
  return ids.length ? ids : books.slice(0, 3).map(b => b.id);
}

async function fetchPdfPart(book, remainingBytes) {
  if (!book.fileUrl || remainingBytes < 200000) return null;
  try {
    const res = await fetch(book.fileUrl, { redirect: 'follow' });
    if (!res.ok) return null;
    const type = (res.headers.get('content-type') || '').toLowerCase();
    if (!type.includes('pdf') && !book.fileUrl.toLowerCase().includes('.pdf')) return null;

    const declared = Number(res.headers.get('content-length') || 0);
    if (declared && declared > remainingBytes) return null;

    const ab = await res.arrayBuffer();
    if (!ab.byteLength || ab.byteLength > remainingBytes) return null;

    return {
      bytes: ab.byteLength,
      part: {
        inline_data: {
          mime_type: 'application/pdf',
          data: Buffer.from(ab).toString('base64')
        }
      }
    };
  } catch {
    return null;
  }
}

async function verifyTopicInPdfs(query, candidates) {
  const parts = [{
    text: `
Quyidagi MATHLVL kitob PDF larini tekshiring.
Foydalanuvchi izlayotgan mavzu: "${query}"

Har bir kitob uchun mavzu haqiqatan kitob ichida bor-yo'qligini aniqlang.
Mavzu nomi aynan bir xil yozilmagan bo'lsa ham, mazmunan shu mavzu bo'lsa "found": true qiling.
Faqat JSON qaytaring:
{"matches":[{"id":"BOOK_ID","found":true,"confidence":"high|medium|low","reason":"juda qisqa sabab"}]}
Faqat berilgan BOOK_ID lardan foydalaning.
`
  }];

  let remaining = 14 * 1024 * 1024;
  const attached = [];

  for (const book of candidates) {
    const fetched = await fetchPdfPart(book, remaining);
    if (!fetched) continue;
    parts.push({ text: `\nBOOK_ID: ${book.id}\nTITLE: ${book.title || ''}\nGRADE: ${book.grade || ''}\nSUBJECT: ${book.subject || ''}\nPDF:` });
    parts.push(fetched.part);
    remaining -= fetched.bytes;
    attached.push(book.id);
    if (attached.length >= 3 || remaining < 300000) break;
  }

  if (!attached.length) return null;

  const raw = await callGemini(parts, 700);
  const parsed = parseJson(raw, { matches: [] });
  const allowed = new Set(attached);
  const matches = Array.isArray(parsed.matches)
    ? parsed.matches.filter(m => allowed.has(m.id) && m.found === true).slice(0, 3)
    : [];

  return { attached, matches };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Faqat POST so'rovi qabul qilinadi" });
  }
  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(500).json({ error: 'Kutubxona serveri sozlanmagan' });
  }

  const session = verifySignedCookie(parseCookies(req.headers.cookie).nova_session, process.env.SESSION_SECRET);
  if (!session) return res.status(401).json({ error: 'Avval tizimga kiring' });

  const query = String(req.body?.query || '').trim().slice(0, 500);
  if (query.length < 2) return res.status(400).json({ error: 'Mavzuni yozing' });

  try {
    const cacheHash = crypto.createHash('sha256').update(query.toLowerCase()).digest('hex').slice(0, 24);
    const cacheKey = `mathlvl:book-topic:${cacheHash}`;
    const cached = await redisCommand(['GET', cacheKey]).catch(() => null);
    if (cached) {
      try { return res.status(200).json(JSON.parse(cached)); } catch {}
    }

    const books = await loadBooks();
    if (!books.length) return res.status(200).json({ matches: [], verified: false });

    const ids = await shortlistBooks(query, books);
    const candidates = ids.map(id => books.find(b => b.id === id)).filter(Boolean);

    let resultBooks = candidates;
    let verified = false;
    let verification = [];

    try {
      const scan = await verifyTopicInPdfs(query, candidates);
      if (scan && scan.matches.length) {
        const idsFound = new Set(scan.matches.map(m => m.id));
        resultBooks = candidates.filter(b => idsFound.has(b.id));
        verification = scan.matches;
        verified = true;
      }
    } catch {}

    const payload = {
      matches: resultBooks.slice(0, 3).map(book => {
        const info = verification.find(v => v.id === book.id);
        return {
          ...safeBook(book),
          verified: !!info,
          confidence: info?.confidence || 'metadata',
          reason: info?.reason || ''
        };
      }),
      verified
    };

    await redisCommand(['SET', cacheKey, JSON.stringify(payload), 'EX', '3600']).catch(() => null);
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json(payload);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Kitob qidirishda xatolik' });
  }
}
