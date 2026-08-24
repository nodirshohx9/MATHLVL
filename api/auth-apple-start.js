import crypto from 'crypto';

const APPLE_REDIRECT_URI = 'https://mathlvl.com/api/auth-apple-callback';

export default async function handler(req, res) {
  const clientId = process.env.APPLE_CLIENT_ID;
  if (!clientId) {
    res.status(500).send('APPLE_CLIENT_ID sozlanmagan.');
    return;
  }

  const state = crypto.randomBytes(24).toString('hex');
  const nonce = crypto.randomBytes(24).toString('hex');
  const url = new URL(req.url, 'https://mathlvl.com');
  const redeemCode = url.searchParams.get('redeem') || '';

  // Sign in with Apple uses response_mode=form_post. Cross-site POST callback
  // state/nonce cookie'larini yuborishi uchun SameSite=None; Secure kerak.
  const cookiesToSet = [
    `nova_apple_oauth_state=${state}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=600`,
    `nova_apple_oauth_nonce=${nonce}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=600`
  ];
  if (redeemCode) {
    cookiesToSet.push(`nova_pending_redeem=${encodeURIComponent(redeemCode)}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=600`);
  }
  res.setHeader('Set-Cookie', cookiesToSet);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: APPLE_REDIRECT_URI,
    response_type: 'code id_token',
    response_mode: 'form_post',
    scope: 'name email',
    state,
    nonce
  });

  res.writeHead(302, { Location: `https://appleid.apple.com/auth/authorize?${params.toString()}` });
  res.end();
}
