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
  const cookies = parseCookies(req.headers.cookie);
  const session = verifySession(cookies.nova_session, process.env.SESSION_SECRET);
  if (!session) {
    res.status(200).json({ loggedIn: false });
    return;
  }
  res.status(200).json({
    loggedIn: true,
    email: session.email,
    name: session.name,
    picture: session.picture
  });
}
