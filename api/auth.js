import crypto from 'crypto';

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
  if (!cookieVal || !secret) return null;
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
  } catch {
    return null;
  }
}

// GET  /api/auth -> joriy sessiya ma'lumotini qaytaradi
// POST /api/auth -> chiqish
export default async function handler(req, res) {
  // Sessiya holati hech qachon CDN/brauzer keshida qolmasin.
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');

  if (req.method === 'GET') {
    const cookies = parseCookies(req.headers.cookie);
    const session = verifySession(cookies.nova_session, process.env.SESSION_SECRET);
    if (!session) {
      return res.status(200).json({ loggedIn: false });
    }
    return res.status(200).json({
      loggedIn: true,
      email: session.email,
      name: session.name,
      picture: session.picture
    });
  }

  if (req.method === 'POST') {
    res.setHeader('Set-Cookie', 'nova_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Bu metod qo'llab-quvvatlanmaydi" });
}
