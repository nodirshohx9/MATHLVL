import crypto from 'crypto';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const SUPPORT_HASH = 'mathlvl:support';

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

function getClientId(req, session) {
  if (session?.email) return `u:${String(session.email).toLowerCase()}`;
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const raw = forwarded || String(req.socket?.remoteAddress || 'guest');
  return `g:${raw}`;
}

async function allowSubmit(clientId) {
  const id = crypto.createHash('sha256').update(clientId).digest('hex').slice(0, 24);
  const hour = Math.floor(Date.now() / 3600000);
  const day = new Date().toISOString().slice(0, 10);
  const hourKey = `mathlvl:support-rate:h:${id}:${hour}`;
  const dayKey = `mathlvl:support-rate:d:${id}:${day}`;
  const hourCount = Number(await redisCommand(['INCR', hourKey]));
  if (hourCount === 1) await redisCommand(['EXPIRE', hourKey, 7200]);
  const dayCount = Number(await redisCommand(['INCR', dayKey]));
  if (dayCount === 1) await redisCommand(['EXPIRE', dayKey, 172800]);
  return hourCount <= 5 && dayCount <= 20;
}

function cleanText(value, max) {
  return String(value || '').replace(/\u0000/g, '').trim().slice(0, max);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');

  if (!REDIS_URL || !REDIS_TOKEN || !process.env.SESSION_SECRET) {
    return res.status(500).json({ error: 'Server sozlanmagan' });
  }

  const cookies = parseCookies(req.headers.cookie);
  const session = verifySignedCookie(cookies.nova_session, process.env.SESSION_SECRET);
  const admin = verifySignedCookie(cookies.mathlvl_admin, process.env.SESSION_SECRET);
  const isAdmin = admin?.role === 'admin';

  try {
    if (req.method === 'POST') {
      const clientId = getClientId(req, session);
      if (!(await allowSubmit(clientId))) {
        return res.status(429).json({ error: 'Juda ko‘p xabar yuborildi. Birozdan keyin qayta urinib ko‘ring.' });
      }

      const category = cleanText(req.body?.category || 'Boshqa', 50);
      const message = cleanText(req.body?.message, 2000);
      const page = cleanText(req.body?.page, 180);
      if (message.length < 5) return res.status(400).json({ error: 'Xabarni biroz batafsilroq yozing.' });

      const id = `${Date.now().toString(36)}${crypto.randomBytes(4).toString('hex')}`;
      const ticket = {
        id,
        category,
        message,
        page,
        email: session?.email || '',
        name: session?.name || '',
        status: 'OPEN',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await redisCommand(['HSET', SUPPORT_HASH, id, JSON.stringify(ticket)]);
      return res.status(201).json({ ok: true, id });
    }

    if (!isAdmin) return res.status(401).json({ error: 'Admin ruxsati kerak' });

    if (req.method === 'GET') {
      const flat = await redisCommand(['HGETALL', SUPPORT_HASH]);
      const tickets = [];
      for (let i = 0; i < (flat || []).length; i += 2) {
        try { tickets.push(JSON.parse(flat[i + 1])); } catch {}
      }
      tickets.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
      return res.status(200).json({ tickets: tickets.slice(0, 200) });
    }

    if (req.method === 'PATCH') {
      const id = cleanText(req.body?.id, 100);
      const status = cleanText(req.body?.status, 20).toUpperCase();
      if (!id || !['OPEN', 'RESOLVED'].includes(status)) {
        return res.status(400).json({ error: 'id yoki status noto‘g‘ri' });
      }
      const raw = await redisCommand(['HGET', SUPPORT_HASH, id]);
      if (!raw) return res.status(404).json({ error: 'Xabar topilmadi' });
      const ticket = JSON.parse(raw);
      ticket.status = status;
      ticket.updatedAt = Date.now();
      await redisCommand(['HSET', SUPPORT_HASH, id, JSON.stringify(ticket)]);
      return res.status(200).json({ ok: true, ticket });
    }

    return res.status(405).json({ error: "Bu metod qo'llab-quvvatlanmaydi" });
  } catch (err) {
    console.error('SUPPORT_XATO:', err);
    return res.status(500).json({ error: 'Support xabarini qayta ishlashda xatolik' });
  }
}
