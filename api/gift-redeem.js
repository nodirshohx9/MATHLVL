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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Bu metod qo'llab-quvvatlanmaydi" });
  }
  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(500).json({ error: 'Server sozlanmagan' });
  }

  const cookies = parseCookies(req.headers.cookie);
  const session = verifySession(cookies.nova_session, process.env.SESSION_SECRET);
  if (!session) {
    return res.status(401).json({ error: 'not_logged_in' });
  }

  const { code } = req.body || {};
  if (!code) {
    return res.status(400).json({ error: 'Kod kerak' });
  }

  try {
    const normalizedCode = code.trim().toUpperCase();
    const tokenHash = crypto.createHash('sha256').update(normalizedCode).digest('hex');

    const giftId = await redisCommand(['GET', `nova:gift-token:${tokenHash}`]);
    if (!giftId) {
      return res.status(404).json({ error: 'not_found' });
    }

    const raw = await redisCommand(['HGET', 'nova:gifts', giftId]);
    if (!raw) {
      return res.status(404).json({ error: 'not_found' });
    }
    const gift = JSON.parse(raw);

    if (gift.status === 'REVOKED') {
      return res.status(400).json({ error: 'revoked' });
    }
    if (gift.expiresAt < Date.now()) {
      return res.status(400).json({ error: 'expired' });
    }

    // Atomik hisoblagich — poyga holatisiz (race-condition xavfsiz)
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
