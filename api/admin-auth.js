import crypto from 'crypto';

function signAdminSession(secret) {
  const payload = Buffer.from(JSON.stringify({ role: 'admin', exp: Date.now() + 8 * 60 * 60 * 1000 })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Faqat POST so'rovlar qabul qilinadi" });
  }

  const correctPassword = process.env.ADMIN_PASSWORD;
  const sessionSecret = process.env.SESSION_SECRET;
  if (!correctPassword || !sessionSecret) {
    return res.status(500).json({ error: 'Server sozlanmagan: ADMIN_PASSWORD yoki SESSION_SECRET topilmadi' });
  }

  const { password } = req.body || {};
  if (password !== correctPassword) {
    return res.status(401).json({ ok: false });
  }

  const token = signAdminSession(sessionSecret);
  res.setHeader('Set-Cookie', `mathlvl_admin=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${8 * 60 * 60}`);
  return res.status(200).json({ ok: true });
}
