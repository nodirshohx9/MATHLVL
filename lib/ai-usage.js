const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redisCommand(command) {
  if (!REDIS_URL || !REDIS_TOKEN) throw new Error('Redis sozlanmagan');
  const response = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command)
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

async function emailId(email) {
  const bytes = new TextEncoder().encode(String(email).trim().toLowerCase());
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Array.from(digest.slice(0, 12), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function hasPlus(email) {
  const raw = await redisCommand(['GET', `nova:plus:${String(email).trim()}`]);
  if (!raw) return false;
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Number(data?.expiresAt) > Date.now();
  } catch { return false; }
}

function dayInfo(now = new Date()) {
  const dayKey = now.toISOString().slice(0, 10);
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return { dayKey, resetsAt: tomorrow.toISOString() };
}

export async function getAiUsage(email) {
  const [id, isPlus] = await Promise.all([emailId(email), hasPlus(email)]);
  const { dayKey, resetsAt } = dayInfo();
  const dailyUsed = Number(await redisCommand(['GET', `mathlvl:ai:day:${id}:${dayKey}`])) || 0;
  const dailyLimit = isPlus ? 250 : 100;
  return { isPlus, dailyLimit, dailyUsed, dailyRemaining: Math.max(0, dailyLimit - dailyUsed), resetsAt, intervalHours: 24 };
}

export async function consumeAiUsage(email) {
  const id = await emailId(email);
  const isPlus = await hasPlus(email);
  const now = new Date();
  const { dayKey } = dayInfo(now);
  const minuteKey = `mathlvl:ai:min:${id}:${Math.floor(now.getTime() / 60000)}`;
  const dayKeyName = `mathlvl:ai:day:${id}:${dayKey}`;
  const minuteUsed = Number(await redisCommand(['INCR', minuteKey]));
  if (minuteUsed === 1) await redisCommand(['EXPIRE', minuteKey, 120]);
  const dailyUsed = Number(await redisCommand(['INCR', dayKeyName]));
  if (dailyUsed === 1) await redisCommand(['EXPIRE', dayKeyName, 172800]);
  const dailyLimit = isPlus ? 250 : 100;
  if (minuteUsed > 15) return { ok: false, status: 429, message: "Juda ko'p AI so'rovi yuborildi. Birozdan keyin urinib ko'ring." };
  if (dailyUsed > dailyLimit) return { ok: false, status: 429, message: 'Bugungi umumiy AI so‘rov limiti tugadi. Limit Toshkent vaqti bilan 05:00 da yangilanadi.' };
  return { ok: true, isPlus, dailyLimit, dailyUsed };
}
