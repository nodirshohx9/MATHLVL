import crypto from 'crypto';

const GOOGLE_REDIRECT_URI = 'https://mathlvl.com/api/auth-google-callback';

export default async function handler(req, res) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    res.status(500).send('GOOGLE_CLIENT_ID sozlanmagan.');
    return;
  }

  const redirectUri = GOOGLE_REDIRECT_URI;
  const state = crypto.randomBytes(16).toString('hex');

  const url = new URL(req.url, 'https://mathlvl.com');
  const redeemCode = url.searchParams.get('redeem') || '';

  const cookiesToSet = [`nova_oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`];
  if (redeemCode) {
    cookiesToSet.push(`nova_pending_redeem=${encodeURIComponent(redeemCode)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`);
  }
  res.setHeader('Set-Cookie', cookiesToSet);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account'
  });

  res.writeHead(302, { Location: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
  res.end();
}
