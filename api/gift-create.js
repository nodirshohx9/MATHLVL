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

function generateCode() {
  const raw = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `NOVA-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}
function hashCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Bu metod qo'llab-quvvatlanmaydi" });
  }
  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(500).json({ error: 'Server sozlanmagan: UPSTASH kalitlar topilmadi' });
  }
  if (!process.env.ADMIN_PASSWORD) {
    return res.status(500).json({ error: 'Server sozlanmagan: ADMIN_PASSWORD topilmadi' });
  }

  const { password, durationDays, maxRedemptions, expiresInDays, note } = req.body || {};
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Parol noto'g'ri" });
  }

  const duration = parseInt(durationDays, 10);
  if (!duration || duration <= 0) {
    return res.status(400).json({ error: 'durationDays kerak' });
  }
  const maxUse = parseInt(maxRedemptions, 10) || 1;
  const expDays = parseInt(expiresInDays, 10) || 7;

  try {
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
