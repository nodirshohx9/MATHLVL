import crypto from 'crypto';

const APPLE_REDIRECT_URI = 'https://mathlvl.com/api/auth-apple-callback';
const APPLE_ISSUER = 'https://appleid.apple.com';

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

function readBody(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  if (typeof req.body === 'string') return Promise.resolve(Object.fromEntries(new URLSearchParams(req.body)));
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => resolve(Object.fromEntries(new URLSearchParams(raw))));
    req.on('error', reject);
  });
}

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function makeAppleClientSecret() {
  const teamId = process.env.APPLE_TEAM_ID;
  const clientId = process.env.APPLE_CLIENT_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const rawPrivateKey = process.env.APPLE_PRIVATE_KEY;

  if (!teamId || !clientId || !keyId || !rawPrivateKey) {
    throw new Error('Apple OAuth environment variables toliq sozlanmagan.');
  }

  const privateKey = rawPrivateKey.replace(/\\n/g, '\n');
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'ES256', kid: keyId }));
  const payload = base64url(JSON.stringify({
    iss: teamId,
    iat: now,
    exp: now + 10 * 60,
    aud: APPLE_ISSUER,
    sub: clientId
  }));
  const signingInput = `${header}.${payload}`;
  const signature = crypto.sign('sha256', Buffer.from(signingInput), {
    key: privateKey,
    dsaEncoding: 'ieee-p1363'
  }).toString('base64url');
  return `${signingInput}.${signature}`;
}

function decodeJwtPart(part) {
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
}

async function verifyAppleIdToken(idToken, expectedNonce) {
  const parts = String(idToken || '').split('.');
  if (parts.length !== 3) throw new Error('Apple id_token noto‘g‘ri.');

  const header = decodeJwtPart(parts[0]);
  const claims = decodeJwtPart(parts[1]);
  const signature = Buffer.from(parts[2], 'base64url');

  const keysRes = await fetch('https://appleid.apple.com/auth/keys');
  if (!keysRes.ok) throw new Error('Apple public keys olinmadi.');
  const { keys = [] } = await keysRes.json();
  const jwk = keys.find(k => k.kid === header.kid && k.alg === 'RS256') || keys.find(k => k.kid === header.kid);
  if (!jwk) throw new Error('Apple signing key topilmadi.');

  // Apple's identity token is normally RS256.
  const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  const ok = crypto.verify(
    header.alg === 'ES256' ? 'sha256' : 'RSA-SHA256',
    Buffer.from(`${parts[0]}.${parts[1]}`),
    header.alg === 'ES256' ? { key: publicKey, dsaEncoding: 'ieee-p1363' } : publicKey,
    signature
  );
  if (!ok) throw new Error('Apple id_token imzosi tasdiqlanmadi.');

  const now = Math.floor(Date.now() / 1000);
  if (claims.iss !== APPLE_ISSUER) throw new Error('Apple token issuer noto‘g‘ri.');
  if (claims.aud !== process.env.APPLE_CLIENT_ID) throw new Error('Apple token audience noto‘g‘ri.');
  if (!claims.exp || claims.exp <= now) throw new Error('Apple token muddati tugagan.');
  if (expectedNonce && claims.nonce !== expectedNonce) throw new Error('Apple nonce mos kelmadi.');

  return claims;
}

function signSession(payload, secret) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(data).digest('hex');
  return `${data}.${sig}`;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const body = await readBody(req);
    const cookies = parseCookies(req.headers.cookie);
    const code = body.code;
    const state = body.state;

    if (body.error) {
      res.writeHead(302, { Location: '/?login_error=1' });
      res.end();
      return;
    }

    if (!code || !state || state !== cookies.nova_apple_oauth_state) {
      res.writeHead(302, { Location: '/?login_error=1' });
      res.end();
      return;
    }

    const clientSecret = makeAppleClientSecret();
    const tokenRes = await fetch('https://appleid.apple.com/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.APPLE_CLIENT_ID,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: APPLE_REDIRECT_URI
      })
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.id_token) {
      throw new Error('Apple token almashish muvaffaqiyatsiz: ' + JSON.stringify(tokenData));
    }

    const claims = await verifyAppleIdToken(tokenData.id_token, cookies.nova_apple_oauth_nonce);

    let postedUser = null;
    if (body.user) {
      try { postedUser = typeof body.user === 'string' ? JSON.parse(body.user) : body.user; } catch (_e) {}
    }

    const email = claims.email || postedUser?.email || '';
    const firstName = postedUser?.name?.firstName || '';
    const lastName = postedUser?.name?.lastName || '';
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

    if (!email) throw new Error('Apple hisobidan email olinmadi.');

    const session = {
      email,
      name: fullName || email,
      picture: '',
      provider: 'apple',
      sub: claims.sub,
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000
    };
    const sessionCookie = signSession(session, process.env.SESSION_SECRET);
    const pendingRedeem = cookies.nova_pending_redeem;

    const cookiesToSet = [
      `nova_session=${sessionCookie}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${30 * 24 * 60 * 60}`,
      'nova_apple_oauth_state=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0',
      'nova_apple_oauth_nonce=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0'
    ];
    if (pendingRedeem) {
      cookiesToSet.push('nova_pending_redeem=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0');
    }
    res.setHeader('Set-Cookie', cookiesToSet);

    const redirectTo = pendingRedeem ? `/?redeem=${encodeURIComponent(pendingRedeem)}` : '/?logged_in=1';
    res.writeHead(302, { Location: redirectTo });
    res.end();
  } catch (err) {
    console.error('Apple OAuth callback xatosi:', err);
    res.writeHead(302, { Location: '/?login_error=1' });
    res.end();
  }
}
