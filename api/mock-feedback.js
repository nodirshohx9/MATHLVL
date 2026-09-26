import crypto from 'crypto';
import { checkGuestRateLimit } from '../lib/guest-limits.js';

export const config = { maxDuration: 60 };

const GEMINI_MODEL = process.env.GEMINI_MOCK_MODEL || 'gemini-3.1-flash-lite';
const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-2.5-flash';
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const MAX_ANALYZED_ITEMS = 5;
const BATCH_SIZE = 5;
const BATCH_CONCURRENCY = 1;

function parseCookies(header) {
  const cookies = {};
  (header || '').split(';').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    try { cookies[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim()); } catch {}
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
    if (!payload.email || !payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

async function redisCommand(command) {
  const r = await fetch(REDIS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command)
  });
  const data = await r.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

async function hasPlus(email) {
  const raw = await redisCommand(['GET', `nova:plus:${email}`]);
  if (!raw) return false;
  try {
    return Number(JSON.parse(raw).expiresAt) > Date.now();
  } catch {
    return false;
  }
}

async function checkLimit(email) {
  const id = crypto.createHash('sha256').update(String(email).toLowerCase()).digest('hex').slice(0, 24);
  const day = new Date().toISOString().slice(0, 10);
  const key = `mathlvl:mock-feedback:${id}:${day}`;
  const count = Number(await redisCommand(['INCR', key]));
  if (count === 1) await redisCommand(['EXPIRE', key, 172800]);
  return count <= 20;
}

function cleanText(value, max = 400) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isTransientGeminiError(status, message = '') {
  const text = String(message).toLowerCase();
  return [429, 500, 502, 503, 504].includes(Number(status)) ||
    text.includes('high demand') ||
    text.includes('overloaded') ||
    text.includes('temporarily unavailable') ||
    text.includes('try again later');
}

async function requestGemini(apiKey, model, prompt, maxOutputTokens = 4200) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens,
        temperature: 0.15,
        thinkingConfig: { thinkingLevel: 'low' }
      }
    }),
    signal: AbortSignal.timeout(15000)
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

async function getGeminiFeedback(apiKey, prompt, maxOutputTokens = 4200) {
  const attempts = [
    { model: GEMINI_MODEL, delay: 0 },
    { model: GEMINI_MODEL, delay: 350 },
    { model: GEMINI_FALLBACK_MODEL, delay: 650 }
  ];

  let last = null;
  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    if (attempt.delay) await sleep(attempt.delay);

    const result = await requestGemini(apiKey, attempt.model, prompt, maxOutputTokens);
    const message = result.data?.error?.message || '';
    const candidate = result.data?.candidates?.[0];
    const text = (candidate?.content?.parts || []).map(p => p.text || '').join('').trim();
    last = {
      ...result,
      model: attempt.model,
      message,
      text,
      finishReason: candidate?.finishReason || ''
    };

    if (result.response.ok && text) {
      if (i > 0) console.warn(`MOCK FEEDBACK recovered on attempt ${i + 1} using ${attempt.model}`);
      return last;
    }

    console.error(`MOCK FEEDBACK GEMINI ${attempt.model}:`, message || result.response.status);
    if (!isTransientGeminiError(result.response.status, message)) break;
  }

  return last;
}

function itemStatus(item) {
  if (!item.given || item.given === 'javob berilmagan') return 'JAVOBSIZ';
  return item.isCorrect ? 'TO_GRI' : 'XATO';
}

function itemSource(item) {
  return `[${item.label}] [${item.section}] [${itemStatus(item)}]\nSavol: ${item.question}\nFoydalanuvchi javobi: ${item.given}\nTo'g'ri javob: ${item.expected}`;
}

function buildBatchPrompt(title, correct, total, answered, items, batchIndex, batchCount) {
  return `Sen MATHLVL platformasidagi Ustoz AI matematika ustozisan.
O'zbek tilida, o'quvchiga tushunarli, ixcham va aniq yoz.
Bu rasmiy BBA bali emas, faqat MATHLVL mock mashq natijasiga asoslangan o'quv tahlili.

Test: ${title}
Natija: ${correct}/${total}
Javob berilgan: ${answered}/${total}
Bu tahlil qismi: ${batchIndex + 1}/${batchCount}

Quyidagi elementlarning HAR BIRINI, berilgan tartibda, hech birini tashlab ketmasdan tahlil qil:

${items.map(itemSource).join('\n\n')}

Har element uchun statusni yuqoridagi [TO_GRI], [XATO], [JAVOBSIZ] qiymatidan ol. Uni o'zing qayta baholama.
Har biri uchun aynan shu formatdan foydalan:

### <label>-savol — ✅ To'g'ri
yoki
### <label>-savol — ❌ Xato
yoki
### <label>-savol — ◻️ Javobsiz

**Savol:** mazmunini 1-2 jumlada ko'rsat.
**Sizning javobingiz:** foydalanuvchi javobi.
**To'g'ri javob:** to'g'ri javob.
**Yechish yo'li:** 1-3 ta qisqa, aniq matematik qadam.

To'g'ri savollarda juda qisqa tushuntir.
Xato yoki javobsiz savollarda asosiy xatoni yoki kerakli usulni bir jumlada tushuntir.
Savolda ma'lumot yetishmasa, o'zingdan shart yoki son to'qima.
Bu qism oxirida umumiy xulosa yozma — faqat berilgan savollarni tugat.
Javobni ixcham tut, lekin BARCHA ${items.length} ta element bo'lishi shart.`;
}

function escapedLabel(label) {
  return String(label).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function outputContainsAllItems(text, items) {
  const source = String(text || '');
  return items.every(item => {
    const label = escapedLabel(item.label);
    return new RegExp(`(?:^|\\n)#{2,4}\\s*${label}\\s*-?\\s*savol\\b`, 'i').test(source);
  });
}

async function analyzeBatch(apiKey, context, items, batchIndex, batchCount, depth = 0) {
  const prompt = buildBatchPrompt(
    context.title,
    context.correct,
    context.total,
    context.answered,
    items,
    batchIndex,
    batchCount
  );

  const tokenBudget = Math.min(6000, Math.max(2400, items.length * 500));
  const result = await getGeminiFeedback(apiKey, prompt, tokenBudget);
  const complete = result?.response?.ok &&
    result.text &&
    result.finishReason !== 'MAX_TOKENS' &&
    outputContainsAllItems(result.text, items);

  if (complete) return result.text;

  // Long model answers can stop halfway. Split only the problematic group and retry,
  // so a 50-60 element mock still reaches the very last question.
  if (items.length > 1 && depth < 4) {
    const middle = Math.ceil(items.length / 2);
    const left = await analyzeBatch(apiKey, context, items.slice(0, middle), batchIndex, batchCount, depth + 1);
    const right = await analyzeBatch(apiKey, context, items.slice(middle), batchIndex, batchCount, depth + 1);
    return `${left}\n\n${right}`.trim();
  }

  if (!result?.response?.ok) {
    const transient = isTransientGeminiError(result?.response?.status, result?.message);
    throw new Error(transient ? 'AI_BUSY' : 'AI_FAILED');
  }

  // A single item should almost never truncate. Keep its useful output if present,
  // otherwise return an explicit section instead of silently ending the analysis.
  if (result.text) return result.text;
  const item = items[0];
  return `### ${item.label}-savol — ${itemStatus(item) === 'TO_GRI' ? '✅ To‘g‘ri' : itemStatus(item) === 'JAVOBSIZ' ? '◻️ Javobsiz' : '❌ Xato'}\n\n**Savol:** ${item.question}\n\n**Sizning javobingiz:** ${item.given}\n\n**To‘g‘ri javob:** ${item.expected}\n\n**Yechish yo‘li:** Ustoz AI bu savol uchun to‘liq izohni vaqtincha tugata olmadi. Savolni alohida Ustoz AI’ga yuborib batafsil yechim olishingiz mumkin.`;
}

async function mapWithConcurrency(values, concurrency, worker) {
  const results = new Array(values.length);
  let cursor = 0;

  async function run() {
    while (true) {
      const index = cursor++;
      if (index >= values.length) return;
      results[index] = await worker(values[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, run));
  return results;
}

function buildSummary(items, correct, total, answered) {
  const wrong = items.filter(item => !item.isCorrect || !item.given || item.given === 'javob berilmagan');
  const sectionCounts = new Map();
  wrong.forEach(item => {
    const section = item.section || 'Boshqa';
    sectionCounts.set(section, (sectionCounts.get(section) || 0) + 1);
  });
  const weak = [...sectionCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name]) => name);
  const unanswered = Math.max(0, total - answered);

  const lines = [
    '## Qisqa xulosa',
    `- Natija: **${correct}/${total}**. Javob berilgan: **${answered}/${total}**${unanswered ? `, javobsiz: **${unanswered}**` : ''}.`
  ];

  if (weak.length) lines.push(`- Ko‘proq mashq kerak bo‘lgan bo‘limlar: **${weak.join(', ')}**.`);
  else lines.push('- Testdagi baholangan elementlar yaxshi bajarilgan.');

  lines.push('- Xato va javobsiz savollarni yechim yo‘li bilan yana bir marta mustaqil ishlab chiqing.');
  lines.push('- Keyin shu mavzulardan 5–10 ta o‘xshash mashq yeching va xatolarni qayta tekshiring.');
  lines.push('- Qiyin savol qolsa, uni alohida Ustoz AI’ga yuborib qadam-baqadam tushuntirish oling.');
  return lines.join('\n');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Faqat POST so'rovlar qabul qilinadi" });
  }
  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(500).json({ error: 'Server sozlanmagan' });
  }

  const session = verifySession(req);
  if (!session) return res.status(401).json({ error: 'not_logged_in' });

  try {
    if (!session.guest) {
      if (!(await hasPlus(session.email))) {
        return res.status(403).json({ error: 'plus_required' });
      }
      if (!(await checkLimit(session.email))) {
        return res.status(429).json({ error: 'Bugungi Ustoz AI mock tahlili limiti tugadi.' });
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY topilmadi' });

    const body = req.body || {};
    const title = cleanText(body.title, 160);
    const correct = Math.max(0, Number(body.correct) || 0);
    const total = Math.max(1, Math.min(100, Number(body.total) || 55));
    const answered = Math.max(0, Math.min(total, Number(body.answered) || 0));

    const items = Array.isArray(body.items)
      ? body.items.slice(0, 60).map((item, index) => ({
          label: cleanText(item.label, 24) || String(index + 1),
          section: cleanText(item.section, 60) || 'Savol',
          question: cleanText(item.question, 1200),
          given: cleanText(item.given, 400) || 'javob berilmagan',
          expected: cleanText(item.expected, 400),
          isCorrect: item.isCorrect === true
        }))
      : (Array.isArray(body.wrong) ? body.wrong.slice(0, 60).map((item, index) => ({
          label: String(index + 1),
          section: cleanText(item.section, 60) || 'Savol',
          question: cleanText(item.question, 1200),
          given: cleanText(item.given, 400) || 'javob berilmagan',
          expected: cleanText(item.expected, 400),
          isCorrect: false
        })) : []);

    if (!items.length) {
      return res.status(400).json({ error: 'Tahlil uchun savollar topilmadi.' });
    }

    if (session.guest) {
      let guestLimit;
      try {
        guestLimit = await checkGuestRateLimit(req, {
          scope: 'mock-feedback',
          perMinute: 1,
          perDay: 1,
          message: 'Mehmon rejimida bugun uchun bepul AI tahlil ishlatildi. Ertaga yana urinib ko‘ring.'
        });
      } catch {
        return res.status(503).json({ error: 'Mehmon tahlili hozircha ishlamayapti. Qayta urinib ko‘ring.' });
      }
      if (!guestLimit.ok) return res.status(guestLimit.status).json({ error: guestLimit.message });
    }

    const reviewItems = items.filter(item => !item.isCorrect).slice(0, MAX_ANALYZED_ITEMS);
    const missedCount = items.filter(item => !item.isCorrect).length;
    const batches = [];
    for (let i = 0; i < reviewItems.length; i += BATCH_SIZE) {
      batches.push(reviewItems.slice(i, i + BATCH_SIZE));
    }

    const context = { title, correct, total, answered };
    const parts = batches.length
      ? await mapWithConcurrency(
          batches,
          BATCH_CONCURRENCY,
          (batch, index) => analyzeBatch(apiKey, context, batch, index, batches.length)
        )
      : [];

    const summary = buildSummary(items, correct, total, answered);
    const coverage = missedCount > reviewItems.length
      ? `\\n\\nBatafsil yechim ${reviewItems.length} ta xato yoki javobsiz savol uchun berildi; qolganlari umumiy xulosada jamlandi.`
      : '';
    const feedback = `${parts.join('\\n\\n')}${parts.length ? '\\n\\n' : ''}${summary}${coverage}`.trim();

    return res.status(200).json({
      feedback,
      analyzedCount: reviewItems.length,
      expectedCount: reviewItems.length,
      complete: true
    });
  } catch (err) {
    console.error('MOCK FEEDBACK XATOLIGI:', err);
    if (err?.message === 'AI_BUSY') {
      return res.status(503).json({ error: 'Ustoz AI hozir band. Bir ozdan keyin yana urinib ko‘ring.' });
    }
    if (err?.message === 'AI_FAILED') {
      return res.status(502).json({ error: 'Ustoz AI tahlilini olishda xatolik' });
    }
    return res.status(500).json({ error: 'Server xatoligi' });
  }
}
