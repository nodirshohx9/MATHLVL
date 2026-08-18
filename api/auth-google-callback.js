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

function signSession(payload, secret) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(data).digest('hex');
  return `${data}.${sig}`;
}

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `https://${req.headers.host}`);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const cookies = parseCookies(req.headers.cookie);

    if (!code || !state || state !== cookies.nova_oauth_state) {
      res.writeHead(302, { Location: '/?login_error=1' });
      res.end();
      return;
    }

    const proto = req.headers['x-forwarded-proto'] || 'https';
    const redirectUri = `${proto}://${req.headers.host}/api/auth-google-callback`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      throw new Error('Token almashish muvaffaqiyatsiz: ' + JSON.stringify(tokenData));
    }

    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const profile = await userRes.json();

    const session = {
      email: profile.email,
      name: profile.name || profile.email,
      picture: profile.picture || '',
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000
    };
    const sessionCookie = signSession(session, process.env.SESSION_SECRET);

    const pendingRedeem = cookies.nova_pending_redeem;
    const cookiesToSet = [
      `nova_session=${sessionCookie}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${30 * 24 * 60 * 60}`,
      `nova_oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`
    ];
    if (pendingRedeem) {
      cookiesToSet.push(`nova_pending_redeem=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`);
    }
    res.setHeader('Set-Cookie', cookiesToSet);

    const redirectTo = pendingRedeem ? `/?redeem=${encodeURIComponent(pendingRedeem)}` : '/?logged_in=1';
    res.writeHead(302, { Location: redirectTo });
    res.end();
  } catch (err) {
    console.error('Google OAuth callback xatosi:', err);
    res.writeHead(302, { Location: '/?login_error=1' });
    res.end();
  }
}
