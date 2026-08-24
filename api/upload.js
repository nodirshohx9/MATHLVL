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

function verifyAdmin(req) {
  const token = parseCookies(req.headers.cookie).mathlvl_admin;
  const secret = process.env.SESSION_SECRET;
  if (!token || !secret) return false;
  const [data, sig] = token.split('.');
  if (!data || !sig) return false;
  const expected = crypto.createHmac('sha256', secret).update(data).digest('hex');
  if (sig.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    return payload.role === 'admin' && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (!verifyAdmin(req)) {
    return res.status(401).json({ error: 'Admin ruxsati kerak' });
  }

  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
        addRandomSuffix: true,
        maximumSizeInBytes: 200 * 1024 * 1024
      }),
      onUploadCompleted: async ({ blob }) => {
        console.log('Blob yuklandi:', blob.url);
      }
    });
    return res.status(200).json(jsonResponse);
  } catch (error) {
    console.error('UPLOAD XATOLIGI:', error);
    return res.status(400).json({ error: error.message, name: error.name });
  }
}
