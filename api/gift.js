import crypto from 'crypto';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

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

function parseCookies(header) {
  const cookies = {};
  (header || '').split(';').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    cookies[key] = decodeURIComponent(val);
  });
  return cookies;
}
function verifySession(cookieVal, secret) {
  if (!cookieVal) return null;
  const parts = cookieVal.split('.');
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', secret).update(data).digest('hex');
  if (sig.length !== expectedSig.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch (e) {
    return null;
  }
}
function getSession(req) {
  const cookies = parseCookies(req.headers.cookie);
  return verifySession(cookies.nova_session, process.env.SESSION_SECRET);
}

function generateCode() {
  const raw = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `NOVA-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}
function hashCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

async function handleCreate(req, res) {
  const { password, durationDays, maxRedemptions, expiresInDays, note } = req.body || {};
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Parol noto'g'ri" });
  }
  const duration = parseInt(durationDays, 10);
  if (!duration || duration <= 0) return res.status(400).json({ error: 'durationDays kerak' });
  const maxUse = parseInt(maxRedemptions, 10) || 1;
  const expDays = parseInt(expiresInDays, 10) || 7;

  const code = generateCode();
  const tokenHash = hashCode(code);
  const giftId = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  const record = {
    id: giftId,
    tokenHash,
    plan: 'PLUS',
    durationDays: duration,
    maxRedemptions: maxUse,
    redemptionCount: 0,
    expiresAt: Date.now() + expDays * 86400000,
    status: 'ACTIVE',
    note: note || '',
    createdAt: Date.now(),
    redeemedBy: []
  };

  await redisCommand(['HSET', 'nova:gifts', giftId, JSON.stringify(record)]);
  await redisCommand(['SET', `nova:gift-token:${tokenHash}`, giftId]);

  res.status(200).json({ giftId, code });
}

async function handlePreview(req, res) {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'not_logged_in' });

  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: 'Kod kerak' });

  const normalizedCode = code.trim().toUpperCase();
  const tokenHash = crypto.createHash('sha256').update(normalizedCode).digest('hex');

  const giftId = await redisCommand(['GET', `nova:gift-token:${tokenHash}`]);
  if (!giftId) return res.status(404).json({ error: 'not_found' });

  const raw = await redisCommand(['HGET', 'nova:gifts', giftId]);
  if (!raw) return res.status(404).json({ error: 'not_found' });
  const gift = JSON.parse(raw);

  if (gift.status === 'REVOKED') return res.status(400).json({ error: 'revoked' });
  if (gift.expiresAt < Date.now()) return res.status(400).json({ error: 'expired' });

  const currentCount = parseInt(await redisCommand(['GET', `nova:gift-redeem-count:${giftId}`]) || '0', 10);
  if (currentCount >= gift.maxRedemptions) {
    return res.status(400).json({ error: 'already_used' });
  }

  res.status(200).json({ ok: true, durationDays: gift.durationDays });
}

async function handleRedeem(req, res) {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'not_logged_in' });

  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: 'Kod kerak' });

  const normalizedCode = code.trim().toUpperCase();
  const tokenHash = crypto.createHash('sha256').update(normalizedCode).digest('hex');

  const giftId = await redisCommand(['GET', `nova:gift-token:${tokenHash}`]);
  if (!giftId) return res.status(404).json({ error: 'not_found' });

  const raw = await redisCommand(['HGET', 'nova:gifts', giftId]);
  if (!raw) return res.status(404).json({ error: 'not_found' });
  const gift = JSON.parse(raw);

  if (gift.status === 'REVOKED') return res.status(400).json({ error: 'revoked' });
  if (gift.expiresAt < Date.now()) return res.status(400).json({ error: 'expired' });

  const newCount = await redisCommand(['INCR', `nova:gift-redeem-count:${giftId}`]);
  if (newCount > gift.maxRedemptions) {
    return res.status(400).json({ error: 'already_used' });
  }

  gift.redemptionCount = newCount;
  if (newCount >= gift.maxRedemptions) gift.status = 'REDEEMED';
  gift.redeemedBy = gift.redeemedBy || [];
  gift.redeemedBy.push({ email: session.email, at: Date.now() });
  await redisCommand(['HSET', 'nova:gifts', giftId, JSON.stringify(gift)]);

  const plusRaw = await redisCommand(['GET', `nova:plus:${session.email}`]);
  const currentPlus = plusRaw ? JSON.parse(plusRaw) : null;
  const baseDate = Math.max(
    currentPlus && currentPlus.expiresAt ? currentPlus.expiresAt : 0,
    Date.now()
  );
  const newExpiresAt = baseDate + gift.durationDays * 86400000;
  const plusRecord = { expiresAt: newExpiresAt, source: 'gift', updatedAt: Date.now() };
  await redisCommand(['SET', `nova:plus:${session.email}`, JSON.stringify(plusRecord)]);

  res.status(200).json({ ok: true, durationDays: gift.durationDays, expiresAt: newExpiresAt });
}

async function handleList(req, res) {
  const password = req.headers['x-admin-password'];
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Parol noto'g'ri" });
  }
  const flat = await redisCommand(['HGETALL', 'nova:gifts']);
  const gifts = [];
  for (let i = 0; i < flat.length; i += 2) {
    try {
      gifts.push(JSON.parse(flat[i + 1]));
    } catch (e) {}
  }
  gifts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  res.status(200).json({ gifts });
}

async function handleRevoke(req, res) {
  const { password, giftId } = req.body || {};
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Parol noto'g'ri" });
  }
  if (!giftId) return res.status(400).json({ error: 'giftId kerak' });

  const raw = await redisCommand(['HGET', 'nova:gifts', giftId]);
  if (!raw) return res.status(404).json({ error: 'not_found' });
  const gift = JSON.parse(raw);
  gift.status = 'REVOKED';
  await redisCommand(['HSET', 'nova:gifts', giftId, JSON.stringify(gift)]);
  res.status(200).json({ ok: true });
}

async function handleManual(req, res) {
  const { password, email, durationDays } = req.body || {};
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Parol noto'g'ri" });
  }
  const duration = parseInt(durationDays, 10);
  if (!email || !duration) return res.status(400).json({ error: 'email va durationDays kerak' });

  const plusRaw = await redisCommand(['GET', `nova:plus:${email}`]);
  const currentPlus = plusRaw ? JSON.parse(plusRaw) : null;
  const baseDate = Math.max(
    currentPlus && currentPlus.expiresAt ? currentPlus.expiresAt : 0,
    Date.now()
  );
  const newExpiresAt = baseDate + duration * 86400000;
  const plusRecord = { expiresAt: newExpiresAt, source: 'manual_admin', updatedAt: Date.now() };
  await redisCommand(['SET', `nova:plus:${email}`, JSON.stringify(plusRecord)]);

  res.status(200).json({ ok: true, expiresAt: newExpiresAt });
}

async function handleStatus(req, res) {
  const session = getSession(req);
  if (!session) return res.status(200).json({ active: false });

  const raw = await redisCommand(['GET', `nova:plus:${session.email}`]);
  if (!raw) return res.status(200).json({ active: false });
  const plus = JSON.parse(raw);
  const active = plus.expiresAt > Date.now();
  res.status(200).json({ active, expiresAt: plus.expiresAt });
}

// Bitta faylda barcha gift/plus amallari, ?action= orqali yo'naltiriladi.
// GET  ?action=list    -> sovg'alar tarixi (admin)
// GET  ?action=status  -> foydalanuvchining Plus holati
// POST body.action=create|redeem|revoke|manual
export default async function handler(req, res) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(500).json({ error: 'Server sozlanmagan: UPSTASH kalitlar topilmadi' });
  }

  try {
    if (req.method === 'GET') {
      const action = req.query.action;
      if (action === 'list') return await handleList(req, res);
      if (action === 'status') return await handleStatus(req, res);
      return res.status(400).json({ error: 'Noma\'lum action' });
    }

    if (req.method === 'POST') {
      const action = (req.body || {}).action;
      if (action === 'create') return await handleCreate(req, res);
      if (action === 'preview') return await handlePreview(req, res);
      if (action === 'redeem') return await handleRedeem(req, res);
      if (action === 'revoke') return await handleRevoke(req, res);
      if (action === 'manual') return await handleManual(req, res);
      return res.status(400).json({ error: 'Noma\'lum action' });
    }

    res.status(405).json({ error: "Bu metod qo'llab-quvvatlanmaydi" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
