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
    if (!(await hasPlus(session.email))) {
      return res.status(403).json({ error: 'plus_required' });
    }
    if (!(await checkLimit(session.email))) {
      return res.status(429).json({ error: 'Bugungi Ustoz AI mock tahlili limiti tugadi.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY topilmadi' });

    const body = req.body || {};
    const title = cleanText(body.title, 160);
    const correct = Math.max(0, Number(body.correct) || 0);
    const total = Math.max(1, Math.min(100, Number(body.total) || 55));
    const wrong = Array.isArray(body.wrong) ? body.wrong.slice(0, 40).map(item => ({
      question: cleanText(item.question, 300),
      given: cleanText(item.given, 120) || 'javob berilmagan',
      expected: cleanText(item.expected, 120),
      section: cleanText(item.section, 40)
    })) : [];

    const mistakes = wrong.length
      ? wrong.map((item, i) =>
          `${i + 1}. [${item.section || 'savol'}] ${item.question}\nBerilgan: ${item.given}\nTo'g'ri: ${item.expected}`
        ).join('\n\n')
      : "Xato javoblar ro'yxati bo'sh.";

    const prompt = `Sen MATHLVL platformasidagi Ustoz AI matematika ustozisan.
O'zbek tilida, o'quvchiga tushunarli va aniq yoz.
Bu rasmiy BBA bali emas, faqat MATHLVL mock mashq natijasiga asoslangan tahlil.

Test: ${title}
Natija: ${correct}/${total}

Xato yoki javobsiz elementlar:
${mistakes}

Javobni 4 qisqa bo'limda ber:
1) Qisqa xulosa — natijaning ma'nosi.
2) Asosiy xatolar — 3-6 ta eng muhim tushuncha/mavzu.
3) Nimalarni takrorlash kerak — aniq mavzular.
4) Keyingi qadam — 3 bandli qisqa tayyorlanish rejasi.

Savollar ro'yxatidan mavzu chiqarish mumkin bo'lmasa, taxminni fakt sifatida aytma. O'quvchini kamsitma va rasmiy sertifikat bali deb ko'rsatma.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 1200,
          thinkingConfig: { thinkingBudget: 0 }
        }
      })
    });
    const data = await geminiRes.json().catch(() => ({}));
    if (!geminiRes.ok) {
      console.error('MOCK FEEDBACK GEMINI:', data.error?.message || geminiRes.status);
      return res.status(502).json({ error: 'Ustoz AI tahlilini olishda xatolik' });
    }

    const text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
    if (!text) return res.status(502).json({ error: 'Ustoz AI bo‘sh javob qaytardi' });
    return res.status(200).json({ feedback: text });
  } catch (err) {
    console.error('MOCK FEEDBACK XATOLIGI:', err);
    return res.status(500).json({ error: 'Server xatoligi' });
  }
}
