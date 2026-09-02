import crypto from 'crypto';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const HASH_KEY = 'nova:mocks';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
const MAX_PDF_BYTES = 18 * 1024 * 1024;

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
  return String(value ?? '').trim().slice(0, maxLength);
}

function cleanTopic(value) {
  return cleanText(value || 'Mavzu aniqlanmagan', 100);
}

function cleanPage(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 && n < 10000 ? n : null;
}

function normalizeClosed(item, index, strictAnswers) {
  const q = cleanText(item?.q, 3000);
  const o = Array.isArray(item?.o) ? item.o.slice(0, 4).map(v => cleanText(v, 800)) : [];
  const rawAnswer = item?.a;
  const a = rawAnswer === null || rawAnswer === undefined || rawAnswer === '' ? null : Number(rawAnswer);
  if (!q) throw new Error(`${index + 1}-yopiq savol matni kiritilmagan`);
  if (o.length !== 4 || o.some(option => !option)) {
    throw new Error(`${index + 1}-yopiq savolning 4 ta javob varianti to'liq emas`);
  }
  if (strictAnswers && (!Number.isInteger(a) || a < 0 || a > 3)) {
    throw new Error(`${index + 1}-yopiq savol uchun to'g'ri javobni belgilang`);
  }
  return {
    q,
    o,
    a: Number.isInteger(a) && a >= 0 && a <= 3 ? a : null,
    topic: cleanTopic(item?.topic),
    sourcePage: cleanPage(item?.sourcePage),
    confidence: Math.max(0, Math.min(1, Number(item?.confidence) || 0)),
    needsReview: Boolean(item?.needsReview)
  };
}

function normalizeOpen(item, index, strictAnswers) {
  const q = cleanText(item?.q, 3000);
  if (!q) throw new Error(`${index + 36}-ochiq savol matni kiritilmagan`);
  const rawParts = Array.isArray(item?.parts) ? item.parts.slice(0, 2) : [];
  if (rawParts.length !== 2) throw new Error(`${index + 36}-ochiq savolda A va B qismlar bo'lishi kerak`);
  const parts = rawParts.map((part, partIndex) => {
    const label = partIndex === 0 ? 'A' : 'B';
    const ask = cleanText(part?.ask, 1500);
    const ans = cleanText(part?.ans, 300);
    if (!ask) throw new Error(`${index + 36}-savol ${label} qismi matni kiritilmagan`);
    if (strictAnswers && !ans) throw new Error(`${index + 36}-savol ${label} qismi javobi kiritilmagan`);
    return {
      label,
      ask,
      ans,
      confidence: Math.max(0, Math.min(1, Number(part?.confidence) || 0)),
      needsReview: Boolean(part?.needsReview)
    };
  });
  return {
    q,
    parts,
    topic: cleanTopic(item?.topic),
    sourcePage: cleanPage(item?.sourcePage),
    confidence: Math.max(0, Math.min(1, Number(item?.confidence) || 0)),
    needsReview: Boolean(item?.needsReview)
  };
}

function normalizeMock(input, existing = {}) {
  const title = cleanText(input.title ?? existing.title, 140);
  const minutes = Math.max(1, Math.min(300, Number(input.minutes ?? existing.minutes) || 150));
  const published = input.published !== undefined ? Boolean(input.published) : (existing.published !== false);

  if (title.length < 3) throw new Error('Mock test nomini kiriting');

  let rawClosed = input.closed ?? existing.closed;
  let rawOpen = input.open ?? existing.open;

  // Old admin mocks are kept compatible and become closed-only drafts/tests.
  if (!Array.isArray(rawClosed) && Array.isArray(input.questions ?? existing.questions)) {
    rawClosed = input.questions ?? existing.questions;
    rawOpen = [];
  }
  if (!Array.isArray(rawClosed)) rawClosed = [];
  if (!Array.isArray(rawOpen)) rawOpen = [];

  const officialFormat = input.format === 'national_certificate' || existing.format === 'national_certificate' || rawOpen.length > 0;
  if (!rawClosed.length && !rawOpen.length) throw new Error('Kamida 1 ta savol kiriting');
  if (rawClosed.length > 100 || rawOpen.length > 50) throw new Error("Mock testdagi savollar soni juda ko'p");

  if (published && officialFormat) {
    if (rawClosed.length !== 35 || rawOpen.length !== 10) {
      throw new Error(`Publish uchun 35 ta yopiq + 10 ta ochiq savol kerak. Hozir: ${rawClosed.length} + ${rawOpen.length}`);
    }
  }

  const closed = rawClosed.map((item, index) => normalizeClosed(item, index, published));
  const open = rawOpen.map((item, index) => normalizeOpen(item, index, published));

  return {
    ...existing,
    title,
    minutes,
    closed,
    open,
    closedCount: closed.length,
    openCount: open.length,
    format: officialFormat ? 'national_certificate' : 'standard',
    sourcePdfUrl: cleanText(input.sourcePdfUrl ?? existing.sourcePdfUrl, 1000),
    published
  };
}

function isAllowedBlobUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return url.protocol === 'https:' && (url.hostname === 'blob.vercel-storage.com' || url.hostname.endsWith('.blob.vercel-storage.com'));
  } catch {
    return false;
  }
}

function extractJson(text) {
  const trimmed = String(text || '').trim();
  try { return JSON.parse(trimmed); } catch {}
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try { return JSON.parse(fenced[1].trim()); } catch {}
  }
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first >= 0 && last > first) return JSON.parse(trimmed.slice(first, last + 1));
  throw new Error("AI javobidan JSON o'qib bo'lmadi");
}

async function importPdfWithGemini(pdfUrl, fallbackTitle) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Server sozlanmagan: GEMINI_API_KEY topilmadi');
  if (!isAllowedBlobUrl(pdfUrl)) throw new Error('PDF avval MATHLVL admin orqali yuklanishi kerak');

  const pdfRes = await fetch(pdfUrl);
  if (!pdfRes.ok) throw new Error("PDF faylni yuklab bo'lmadi");
  const announcedSize = Number(pdfRes.headers.get('content-length') || 0);
  if (announcedSize > MAX_PDF_BYTES) throw new Error('PDF juda katta. 18 MB gacha bo‘lgan fayl yuklang');
  const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
  if (!pdfBuffer.length) throw new Error('PDF bo‘sh');
  if (pdfBuffer.length > MAX_PDF_BYTES) throw new Error('PDF juda katta. 18 MB gacha bo‘lgan fayl yuklang');

  const prompt = `
Siz MATHLVL admin import tizimisiz. Berilgan matematika mock PDFni elektron testga STRUKTURALI tarzda ajrating.

Kutiladigan format: O‘zbekiston matematika Milliy sertifikat mashq varianti — 35 ta yopiq savol va 10 ta ochiq savol. Har bir ochiq savolda A va B qism bor. Jami 45 topshiriq va 55 baholanadigan javob elementi.

MUHIM QOIDALAR:
1) PDFdagi savol matnini va formulalarni mazmunini o‘zgartirmang. Matematik formulalarni imkon qadar LaTeX ($...$) ko‘rinishida yozing.
2) Yopiq savollarda aynan 4 variantni A/B/C/D tartibida qaytaring. "a" 0=A, 1=B, 2=C, 3=D.
3) To‘g‘ri javob PDFdagi JAVOBLAR KALITI yoki aniq ko‘rsatilgan javobdan topilsa kiriting. Javob kaliti yo‘q yoki ishonchsiz bo‘lsa HECH QACHON o‘zingiz yechib/taxmin qilib to‘ldirmang: a=null yoki ans="" qoldiring, needsReview=true qiling va warningsga yozing.
4) Har savolga qisqa topic yozing: masalan "Kvadrat tenglama", "Trigonometriya", "Planimetriya".
5) sourcePage — savol joylashgan PDF sahifasi (1 dan boshlab).
6) Chizma/rasm zarur bo‘lsa needsReview=true va warningsga "N-savol: chizma/rasmni tekshiring" deb yozing. Matndan ko‘rinadigan ma’lumotni saqlang, rasm ichidagi ko‘rinmagan qiymatni to‘qimang.
7) Savollar soni PDFda 35+10 bo‘lmasa topilganlarini qaytaring va warningsga aniq sonini yozing.
8) Faqat JSON qaytaring. Hech qanday izoh yoki markdown yozmang.

JSON SHAKLI:
{
  "title": "${cleanText(fallbackTitle || '', 120)}",
  "minutes": 150,
  "closed": [
    {"q":"...","o":["...","...","...","..."],"a":0,"topic":"...","sourcePage":1,"confidence":0.95,"needsReview":false}
  ],
  "open": [
    {"q":"...","topic":"...","sourcePage":10,"confidence":0.95,"needsReview":false,"parts":[
      {"label":"A","ask":"...","ans":"...","confidence":0.95,"needsReview":false},
      {"label":"B","ask":"...","ans":"...","confidence":0.95,"needsReview":false}
    ]}
  ],
  "warnings": ["..."]
}
`;

  const geminiBody = {
    contents: [{
      role: 'user',
      parts: [
        { text: prompt },
        { inline_data: { mime_type: 'application/pdf', data: pdfBuffer.toString('base64') } }
      ]
    }],
    generationConfig: {
      maxOutputTokens: 20000,
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: 0 }
    }
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const geminiRes = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(geminiBody)
  });
  const data = await geminiRes.json();
  if (!geminiRes.ok) throw new Error(data.error?.message || 'Gemini PDF tahlilida xatolik');
  const text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
  const parsed = extractJson(text);

  const rawClosed = Array.isArray(parsed.closed) ? parsed.closed.slice(0, 60) : [];
  const rawOpen = Array.isArray(parsed.open) ? parsed.open.slice(0, 20) : [];
  const closed = rawClosed.map((item, index) => normalizeClosed(item, index, false));
  const open = rawOpen.map((item, index) => normalizeOpen(item, index, false));
  const warnings = Array.isArray(parsed.warnings) ? parsed.warnings.slice(0, 80).map(v => cleanText(v, 500)).filter(Boolean) : [];

  if (closed.length !== 35 || open.length !== 10) {
    warnings.unshift(`PDFdan ${closed.length} ta yopiq va ${open.length} ta ochiq savol ajratildi. Publishdan oldin 35 + 10 bo‘lishi kerak.`);
  }
  closed.forEach((q, i) => {
    if (q.a === null) warnings.push(`${i + 1}-savol: javob kaliti topilmadi — admin tekshirishi kerak.`);
  });
  open.forEach((q, i) => q.parts.forEach(part => {
    if (!part.ans) warnings.push(`${i + 36}-savol ${part.label}: javob topilmadi — admin tekshirishi kerak.`);
  }));

  return {
    title: cleanText(parsed.title || fallbackTitle || 'Milliy sertifikat Mock', 140),
    minutes: Math.max(1, Math.min(300, Number(parsed.minutes) || 150)),
    closed,
    open,
    closedCount: closed.length,
    openCount: open.length,
    format: 'national_certificate',
    sourcePdfUrl: pdfUrl,
    warnings: [...new Set(warnings)].slice(0, 100)
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

    if (req.method === 'POST' && req.body?.action === 'import-pdf') {
      const pdfUrl = cleanText(req.body?.pdfUrl, 1000);
      const title = cleanText(req.body?.title, 140);
      const draft = await importPdfWithGemini(pdfUrl, title);
      return res.status(200).json({ draft });
    }

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
