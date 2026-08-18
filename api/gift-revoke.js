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

  const { password, giftId } = req.body || {};
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Parol noto'g'ri" });
  }
  if (!giftId) {
    return res.status(400).json({ error: 'giftId kerak' });
  }

  try {
    const raw = await redisCommand(['HGET', 'nova:gifts', giftId]);
    if (!raw) {
      return res.status(404).json({ error: 'not_found' });
    }
    const gift = JSON.parse(raw);
    gift.status = 'REVOKED';
    await redisCommand(['HSET', 'nova:gifts', giftId, JSON.stringify(gift)]);
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
