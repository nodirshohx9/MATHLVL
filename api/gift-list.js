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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: "Bu metod qo'llab-quvvatlanmaydi" });
  }
  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(500).json({ error: 'Server sozlanmagan' });
  }

  const password = req.headers['x-admin-password'];
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Parol noto'g'ri" });
  }

  try {
    const flat = await redisCommand(['HGETALL', 'nova:gifts']);
    const gifts = [];
    for (let i = 0; i < flat.length; i += 2) {
      try {
        gifts.push(JSON.parse(flat[i + 1]));
      } catch (e) {
        /* skip bad entry */
      }
    }
    gifts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    res.status(200).json({ gifts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
