import crypto from 'crypto';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const ADMIN_SESSION_MS = 2 * 60 * 60 * 1000;
const ADMIN_SESSION_SECONDS = ADMIN_SESSION_MS / 1000;

function signAdminSession(secret) {
  const payload = Buffer.from(JSON.stringify({
    role: 'admin',
    exp: Date.now() + ADMIN_SESSION_MS,
    iat: Date.now()
  })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

function safePasswordEqual(input, expected) {
  const a = crypto.createHash('sha256').update(String(input || '')).digest();
  const b = crypto.createHash('sha256').update(String(expected || '')).digest();
  return crypto.timingSafeEqual(a, b);
}

function requestIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || String(req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown');
}

function sameOrigin(req) {
  const origin = String(req.headers.origin || '').trim();
  if (!origin) return true;
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

async function redisCommand(command) {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  const response = await fetch(REDIS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) throw new Error(data.error || 'Redis xatoligi');
  return data.result;
}

async function checkLoginRateLimit(req) {
  if (!REDIS_URL || !REDIS_TOKEN) throw new Error('Admin login limit store is not configured');
  const ipHash = crypto.createHash('sha256').update(requestIp(req)).digest('hex').slice(0, 24);
  const key = `mathlvl:admin-login:${ipHash}`;
  const attempts = Number(await redisCommand(['INCR', key]));
  if (!Number.isFinite(attempts) || attempts < 1) throw new Error('Admin login limit counter is invalid');
  if (attempts === 1) await redisCommand(['EXPIRE', key, 15 * 60]);
  if (attempts > 6) return { ok: false };
  return { ok: true, key };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');

  if (req.method === 'DELETE') {
    if (!sameOrigin(req)) return res.status(403).json({ error: 'Noto‘g‘ri so‘rov manbasi' });
    res.setHeader('Set-Cookie', 'mathlvl_admin=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0');
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Faqat POST/DELETE so'rovlar qabul qilinadi" });
  }

  if (!sameOrigin(req)) {
    return res.status(403).json({ error: 'Noto‘g‘ri so‘rov manbasi' });
  }

  const correctPassword = process.env.ADMIN_PASSWORD;
  const sessionSecret = process.env.SESSION_SECRET;
  if (!correctPassword || !sessionSecret) {
    return res.status(500).json({ error: 'Server sozlanmagan: ADMIN_PASSWORD yoki SESSION_SECRET topilmadi' });
  }

  let limit;
  try {
    limit = await checkLoginRateLimit(req);
  } catch {
    return res.status(503).json({ error: 'Kirishni himoyalash xizmati vaqtincha ishlamayapti.' });
  }

  if (!limit.ok) {
    return res.status(429).json({
      ok: false,
      error: 'Juda ko‘p noto‘g‘ri urinish. 15 daqiqadan keyin qayta urinib ko‘ring.'
    });
  }

  const { password } = req.body || {};
  if (!safePasswordEqual(password, correctPassword)) {
    return res.status(401).json({ ok: false });
  }

  if (limit.key) {
    await redisCommand(['DEL', limit.key]).catch(() => null);
  }

  const token = signAdminSession(sessionSecret);
  res.setHeader(
    'Set-Cookie',
    `mathlvl_admin=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${ADMIN_SESSION_SECONDS}`
  );
  return res.status(200).json({ ok: true });
}
