import crypto from 'crypto';
import { handleUpload } from '@vercel/blob/client';

function parseCookies(header) {
  const cookies = {};
  (header || '').split(';').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    cookies[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
  });
  return cookies;
}

function verifySignedCookie(token, secret) {
  if (!token || !secret) return null;
  const [data, sig] = token.split('.');
  if (!data || !sig) return null;
  const expected = crypto.createHmac('sha256', secret).update(data).digest('hex');
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  const secret = process.env.SESSION_SECRET;
  const admin = verifySignedCookie(cookies.mathlvl_admin, secret);
  const user = verifySignedCookie(cookies.nova_session, secret);
  const isAdmin = admin?.role === 'admin';
  const isLoggedInUser = !!user?.email;

  if (!isAdmin && !isLoggedInUser) {
    return res.status(401).json({ error: 'Avval tizimga kiring' });
  }

  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async () => ({
        // Admin: kitob PDF + rasmlar. Oddiy foydalanuvchi: faqat to'lov cheki rasmlari.
        allowedContentTypes: isAdmin
          ? ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
          : ['image/jpeg', 'image/png', 'image/webp'],
        addRandomSuffix: true,
        maximumSizeInBytes: isAdmin ? 200 * 1024 * 1024 : 10 * 1024 * 1024
      }),
      onUploadCompleted: async ({ blob }) => {
        console.log('Blob yuklandi:', blob.url, isAdmin ? 'admin' : 'user');
      }
    });
    return res.status(200).json(jsonResponse);
  } catch (error) {
    console.error('UPLOAD XATOLIGI:', error);
    return res.status(400).json({ error: error.message, name: error.name });
  }
}
