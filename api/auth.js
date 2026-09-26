import crypto from 'crypto';
import { checkGuestRateLimit } from '../lib/guest-limits.js';

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
  if (!/^[a-f0-9]{64}$/i.test(sig)) return null;
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
      email: session.guest ? null : session.email,
      name: session.guest ? 'Mehmon (sinov)' : session.name,
      picture: session.guest ? null : session.picture,
      isGuest: !!session.guest
    });
  }

  if (req.method === 'POST') {
    if (req.body?.action === 'guest') {
      const origin = String(req.headers.origin || '').trim();
      const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase();
      let sameOrigin = false;
      try { sameOrigin = !!origin && !!host && new URL(origin).host.toLowerCase() === host; } catch {}
      if (!sameOrigin) return res.status(403).json({ error: 'Bu amal faqat MATHLVL saytidan bajariladi.' });

      const secret = process.env.SESSION_SECRET;
      if (!secret) return res.status(503).json({ error: 'Mehmon rejimi hozircha sozlanmagan.' });
      const existing = verifySession(parseCookies(req.headers.cookie).nova_session, secret);
      if (existing) return res.status(200).json({ ok: true, isGuest: !!existing.guest, name: existing.guest ? 'Mehmon (sinov)' : existing.name });

      let limit;
      try {
        limit = await checkGuestRateLimit(req, {
          scope: 'session', perMinute: 6, perDay: 60,
          message: 'Bugun mehmon rejimi ko‘p marta ishga tushirildi. Keyinroq qayta urinib ko‘ring.'
        });
      } catch {
        return res.status(503).json({ error: 'Mehmon sessiyasini yaratib bo‘lmadi. Keyinroq urinib ko‘ring.' });
      }
      if (!limit.ok) return res.status(limit.status).json({ error: limit.message });

      const session = {
        email: `guest-${crypto.randomUUID()}@guest.mathlvl.invalid`,
        name: 'Mehmon (sinov)',
        guest: true,
        exp: Date.now() + 12 * 60 * 60 * 1000
      };
      const data = Buffer.from(JSON.stringify(session)).toString('base64url');
      const sig = crypto.createHmac('sha256', secret).update(data).digest('hex');
      res.setHeader('Set-Cookie', `nova_session=${data}.${sig}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=43200`);
      return res.status(200).json({ ok: true, isGuest: true, name: session.name });
    }

    res.setHeader('Set-Cookie', 'nova_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Bu metod qo'llab-quvvatlanmaydi" });
}
