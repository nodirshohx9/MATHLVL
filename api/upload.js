import crypto from 'crypto';
import { handleUpload } from '@vercel/blob/client';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

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

async function redisCommand(command) {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  const response = await fetch(REDIS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command)
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

async function checkUserUploadLimit(email) {
  if (!REDIS_URL || !REDIS_TOKEN) return true;
  const id = crypto.createHash('sha256').update(String(email).toLowerCase()).digest('hex').slice(0, 24);
  const hour = Math.floor(Date.now() / 3600000);
  const key = `mathlvl:payment-upload:${id}:${hour}`;
  const count = Number(await redisCommand(['INCR', key]));
  if (count === 1) await redisCommand(['EXPIRE', key, 7200]);
  return count <= 10;
}

export default async function handler(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  const secret = process.env.SESSION_SECRET;
  const admin = verifySignedCookie(cookies.mathlvl_admin, secret);
  const user = verifySignedCookie(cookies.nova_session, secret);
  const isAdmin = admin?.role === 'admin';
  const isLoggedInUser = !!user?.email;

  // Vercel Blob's signed upload-completed callback has no browser session cookie.
  // Let handleUpload verify that callback's Vercel signature. Browser token requests
  // are still authenticated below and again inside onBeforeGenerateToken.
  const isCompletionCallback = req.body?.type === 'blob.upload-completed';
  if (!isCompletionCallback && !isAdmin && !isLoggedInUser) {
    return res.status(401).json({ error: 'Avval tizimga kiring' });
  }

  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        if (!isAdmin && !isLoggedInUser) {
          throw new Error('Avval tizimga kiring');
        }

        if (!isAdmin) {
          if (!String(pathname || '').startsWith('payment/')) {
            throw new Error("Oddiy foydalanuvchi faqat to'lov cheki rasmini yuklay oladi");
          }
          const allowed = await checkUserUploadLimit(user.email);
          if (!allowed) {
            throw new Error("Juda ko'p fayl yuklandi. Birozdan keyin qayta urinib ko'ring");
          }
        }

        return {
          allowedContentTypes: isAdmin
            ? ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
            : ['image/jpeg', 'image/png', 'image/webp'],
          addRandomSuffix: true,
          maximumSizeInBytes: isAdmin ? 200 * 1024 * 1024 : 10 * 1024 * 1024
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log('Blob yuklandi:', blob.pathname || blob.url);
      }
    });
    return res.status(200).json(jsonResponse);
  } catch (error) {
    console.error('UPLOAD XATOLIGI:', error);
    return res.status(400).json({ error: error.message, name: error.name });
  }
}
