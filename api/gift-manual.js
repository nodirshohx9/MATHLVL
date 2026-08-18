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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Bu metod qo'llab-quvvatlanmaydi" });
  }
  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(500).json({ error: 'Server sozlanmagan' });
  }

  const { password, email, durationDays } = req.body || {};
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Parol noto'g'ri" });
  }
  const duration = parseInt(durationDays, 10);
  if (!email || !duration) {
    return res.status(400).json({ error: 'email va durationDays kerak' });
  }

  try {
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
