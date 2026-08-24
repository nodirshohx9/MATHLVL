import crypto from 'crypto';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redisCommand(command) {
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command)
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

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

function getSession(req) {
  const cookies = parseCookies(req.headers.cookie);
  return verifySession(cookies.nova_session, process.env.SESSION_SECRET);
}

function isAdmin(req) {
  const cookies = parseCookies(req.headers.cookie);
  const admin = verifySession(cookies.mathlvl_admin, process.env.SESSION_SECRET);
  return admin?.role === 'admin';
}

function requireAdmin(req, res) {
  if (!isAdmin(req)) {
    res.status(401).json({ error: 'Admin ruxsati kerak' });
    return false;
  }
  return true;
}

function generateCode() {
  const raw = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `MATHLVL-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

function hashCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function isTrustedPaymentImage(url) {
  try {
    const parsed = new URL(url);
    const hostOk = parsed.protocol === 'https:' &&
      (parsed.hostname === 'public.blob.vercel-storage.com' ||
       parsed.hostname.endsWith('.public.blob.vercel-storage.com'));
    const pathOk = parsed.pathname.startsWith('/payment/');
    const extOk = /\.(png|jpe?g|webp)(?:$|-)/i.test(parsed.pathname);
    return hostOk && pathOk && extOk;
  } catch {
    return false;
  }
}

function safePaymentForUser(payment) {
  if (!payment) return null;
  return {
    id: payment.id,
    kind: payment.kind || 'plus',
    plan: payment.plan || null,
    bookId: payment.bookId || null,
    bookTitle: payment.bookTitle || null,
    amount: payment.amount,
    status: payment.status,
    createdAt: payment.createdAt,
    reviewedAt: payment.reviewedAt
  };
}

async function handleCreate(req, res) {
  if (!requireAdmin(req, res)) return;
  const { durationDays, maxRedemptions, expiresInDays, note } = req.body || {};
  const duration = parseInt(durationDays, 10);
  if (!duration || duration <= 0) return res.status(400).json({ error: 'durationDays kerak' });
  const maxUse = Math.max(1, Math.min(parseInt(maxRedemptions, 10) || 1, 1000));
  const expDays = Math.max(1, Math.min(parseInt(expiresInDays, 10) || 7, 365));

  const code = generateCode();
  const tokenHash = hashCode(code);
  const giftId = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  const record = {
    id: giftId,
    tokenHash,
    plan: 'PLUS',
    durationDays: duration,
    maxRedemptions: maxUse,
    redemptionCount: 0,
    expiresAt: Date.now() + expDays * 86400000,
    status: 'ACTIVE',
    note: note || '',
    createdAt: Date.now(),
    redeemedBy: []
  };

  await redisCommand(['HSET', 'nova:gifts', giftId, JSON.stringify(record)]);
  await redisCommand(['SET', `nova:gift-token:${tokenHash}`, giftId]);
  return res.status(200).json({ giftId, code });
}

async function handlePreview(req, res) {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'not_logged_in' });

  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: 'Kod kerak' });

  const normalizedCode = String(code).trim().toUpperCase();
  const tokenHash = hashCode(normalizedCode);
  const giftId = await redisCommand(['GET', `nova:gift-token:${tokenHash}`]);
  if (!giftId) return res.status(404).json({ error: 'not_found' });

  const raw = await redisCommand(['HGET', 'nova:gifts', giftId]);
  if (!raw) return res.status(404).json({ error: 'not_found' });
  const gift = JSON.parse(raw);

  if (gift.status === 'REVOKED') return res.status(400).json({ error: 'revoked' });
  if (gift.expiresAt < Date.now()) return res.status(400).json({ error: 'expired' });
  if ((gift.redeemedBy || []).some(r => String(r.email || '').toLowerCase() === String(session.email).toLowerCase())) {
    return res.status(400).json({ error: 'already_redeemed_by_user' });
  }

  const currentCount = parseInt(await redisCommand(['GET', `nova:gift-redeem-count:${giftId}`]) || '0', 10);
  if (currentCount >= gift.maxRedemptions) return res.status(400).json({ error: 'already_used' });

  return res.status(200).json({ ok: true, durationDays: gift.durationDays });
}

async function handleRedeem(req, res) {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'not_logged_in' });

  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: 'Kod kerak' });

  const normalizedCode = String(code).trim().toUpperCase();
  const tokenHash = hashCode(normalizedCode);
  const giftId = await redisCommand(['GET', `nova:gift-token:${tokenHash}`]);
  if (!giftId) return res.status(404).json({ error: 'not_found' });

  const raw = await redisCommand(['HGET', 'nova:gifts', giftId]);
  if (!raw) return res.status(404).json({ error: 'not_found' });
  const gift = JSON.parse(raw);

  if (gift.status === 'REVOKED') return res.status(400).json({ error: 'revoked' });
  if (gift.expiresAt < Date.now()) return res.status(400).json({ error: 'expired' });

  const normalizedEmail = String(session.email || '').toLowerCase();
  if ((gift.redeemedBy || []).some(r => String(r.email || '').toLowerCase() === normalizedEmail)) {
    return res.status(400).json({ error: 'already_redeemed_by_user' });
  }

  const emailHash = crypto.createHash('sha256').update(normalizedEmail).digest('hex').slice(0, 24);
  const countKey = `nova:gift-redeem-count:${giftId}`;
  const userKey = `mathlvl:gift-user:${giftId}:${emailHash}`;
  const lua = [
    "if redis.call('EXISTS', KEYS[2]) == 1 then return -2 end",
    "local current = tonumber(redis.call('GET', KEYS[1]) or '0')",
    "local max = tonumber(ARGV[1])",
    "if current >= max then return -1 end",
    "local next = redis.call('INCR', KEYS[1])",
    "redis.call('SET', KEYS[2], '1')",
    "return next"
  ].join('\n');
  const newCount = Number(await redisCommand(['EVAL', lua, '2', countKey, userKey, String(gift.maxRedemptions)]));

  if (newCount === -2) return res.status(400).json({ error: 'already_redeemed_by_user' });
  if (newCount < 0) return res.status(400).json({ error: 'already_used' });

  gift.redemptionCount = newCount;
  if (newCount >= gift.maxRedemptions) gift.status = 'REDEEMED';
  gift.redeemedBy = gift.redeemedBy || [];
  gift.redeemedBy.push({ email: session.email, at: Date.now() });
  await redisCommand(['HSET', 'nova:gifts', giftId, JSON.stringify(gift)]);

  const plusRaw = await redisCommand(['GET', `nova:plus:${session.email}`]);
  const currentPlus = plusRaw ? JSON.parse(plusRaw) : null;
  const baseDate = Math.max(currentPlus && currentPlus.expiresAt ? currentPlus.expiresAt : 0, Date.now());
  const newExpiresAt = baseDate + gift.durationDays * 86400000;
  await redisCommand(['SET', `nova:plus:${session.email}`, JSON.stringify({
    expiresAt: newExpiresAt,
    source: 'gift',
    updatedAt: Date.now()
  })]);

  return res.status(200).json({ ok: true, durationDays: gift.durationDays, expiresAt: newExpiresAt });
}

async function handleList(req, res) {
  if (!requireAdmin(req, res)) return;
  const flat = await redisCommand(['HGETALL', 'nova:gifts']);
  const gifts = [];
  for (let i = 0; i < flat.length; i += 2) {
    try { gifts.push(JSON.parse(flat[i + 1])); } catch {}
  }
  gifts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  res.setHeader('Cache-Control', 'private, no-store');
  return res.status(200).json({ gifts });
}

async function handleRevoke(req, res) {
  if (!requireAdmin(req, res)) return;
  const { giftId } = req.body || {};
  if (!giftId) return res.status(400).json({ error: 'giftId kerak' });
  const raw = await redisCommand(['HGET', 'nova:gifts', giftId]);
  if (!raw) return res.status(404).json({ error: 'not_found' });
  const gift = JSON.parse(raw);
  gift.status = 'REVOKED';
  await redisCommand(['HSET', 'nova:gifts', giftId, JSON.stringify(gift)]);
  return res.status(200).json({ ok: true });
}

async function handleManual(req, res) {
  if (!requireAdmin(req, res)) return;
  const { email, durationDays } = req.body || {};
  const duration = parseInt(durationDays, 10);
  if (!email || !duration || duration <= 0) return res.status(400).json({ error: 'email va durationDays kerak' });

  const plusRaw = await redisCommand(['GET', `nova:plus:${email}`]);
  const currentPlus = plusRaw ? JSON.parse(plusRaw) : null;
  const baseDate = Math.max(currentPlus && currentPlus.expiresAt ? currentPlus.expiresAt : 0, Date.now());
  const newExpiresAt = baseDate + duration * 86400000;
  await redisCommand(['SET', `nova:plus:${email}`, JSON.stringify({
    expiresAt: newExpiresAt,
    source: 'manual_admin',
    updatedAt: Date.now()
  })]);
  return res.status(200).json({ ok: true, expiresAt: newExpiresAt });
}

async function handleStatus(req, res) {
  const session = getSession(req);
  if (!session) return res.status(200).json({ active: false });
  const raw = await redisCommand(['GET', `nova:plus:${session.email}`]);
  if (!raw) return res.status(200).json({ active: false });
  const plus = JSON.parse(raw);
  const active = plus.expiresAt > Date.now();
  res.setHeader('Cache-Control', 'private, no-store');
  return res.status(200).json({ active, expiresAt: plus.expiresAt });
}

async function handleGetPaymentSettings(req, res) {
  const raw = await redisCommand(['GET', 'nova:payment-settings']);
  const settings = raw ? JSON.parse(raw) : { cardNumber: '', cardHolder: '', monthlyPrice: 0, yearlyPrice: 0 };
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json(settings);
}

async function handleSetPaymentSettings(req, res) {
  if (!requireAdmin(req, res)) return;
  const { cardNumber, cardHolder, monthlyPrice, yearlyPrice } = req.body || {};
  const settings = {
    cardNumber: String(cardNumber || '').trim(),
    cardHolder: String(cardHolder || '').trim(),
    monthlyPrice: Math.max(0, parseInt(monthlyPrice, 10) || 0),
    yearlyPrice: Math.max(0, parseInt(yearlyPrice, 10) || 0)
  };
  await redisCommand(['SET', 'nova:payment-settings', JSON.stringify(settings)]);
  return res.status(200).json({ ok: true });
}

async function handleSubmitPayment(req, res) {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'not_logged_in' });

  const { kind = 'plus', plan, bookId, screenshotUrl } = req.body || {};
  if (!screenshotUrl) return res.status(400).json({ error: 'screenshotUrl kerak' });
  if (!isTrustedPaymentImage(screenshotUrl)) {
    return res.status(400).json({ error: 'invalid_payment_image' });
  }

  const settingsRaw = await redisCommand(['GET', 'nova:payment-settings']);
  const settings = settingsRaw ? JSON.parse(settingsRaw) : { cardNumber: '', cardHolder: '', monthlyPrice: 0, yearlyPrice: 0 };
  if (!settings.cardNumber || !settings.cardHolder) {
    return res.status(503).json({ error: 'payment_not_configured' });
  }

  let amount = 0;
  let normalizedPlan = null;
  let normalizedBookId = null;
  let bookTitle = null;

  if (kind === 'book') {
    if (!bookId) return res.status(400).json({ error: 'bookId kerak' });
    const bookRaw = await redisCommand(['HGET', 'nova:books', String(bookId)]);
    if (!bookRaw) return res.status(404).json({ error: 'book_not_found' });
    const book = JSON.parse(bookRaw);
    if (book.accessType !== 'PURCHASE' && book.accessType !== 'PLUS_OR_PURCHASE') {
      return res.status(400).json({ error: 'book_not_for_purchase' });
    }
    amount = Number(book.price) || 0;
    if (amount <= 0) return res.status(503).json({ error: 'book_price_not_configured' });
    normalizedBookId = book.id;
    bookTitle = book.title || 'Kitob';
  } else {
    if (plan !== 'monthly' && plan !== 'yearly') return res.status(400).json({ error: 'Notogri plan' });
    normalizedPlan = plan;
    amount = Number(plan === 'monthly' ? settings.monthlyPrice : settings.yearlyPrice) || 0;
    if (amount <= 0) return res.status(503).json({ error: 'payment_not_configured' });
  }

  const flat = await redisCommand(['HGETALL', 'nova:payments']);
  for (let i = 0; i < flat.length; i += 2) {
    try {
      const existing = JSON.parse(flat[i + 1]);
      if (existing.email === session.email && existing.status === 'PENDING') {
        return res.status(409).json({ error: 'payment_already_pending', paymentId: existing.id });
      }
    } catch {}
  }

  const paymentId = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const record = {
    id: paymentId,
    email: session.email,
    name: session.name,
    kind: kind === 'book' ? 'book' : 'plus',
    plan: normalizedPlan,
    bookId: normalizedBookId,
    bookTitle,
    amount,
    screenshotUrl,
    status: 'PENDING',
    createdAt: Date.now(),
    reviewedAt: null
  };
  await redisCommand(['HSET', 'nova:payments', paymentId, JSON.stringify(record)]);
  return res.status(200).json({ ok: true, paymentId });
}

async function handleListPayments(req, res) {
  if (!requireAdmin(req, res)) return;
  const flat = await redisCommand(['HGETALL', 'nova:payments']);
  const payments = [];
  for (let i = 0; i < flat.length; i += 2) {
    try { payments.push(JSON.parse(flat[i + 1])); } catch {}
  }
  payments.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  res.setHeader('Cache-Control', 'private, no-store');
  return res.status(200).json({ payments });
}

async function handleApprovePayment(req, res) {
  if (!requireAdmin(req, res)) return;
  const { paymentId } = req.body || {};
  if (!paymentId) return res.status(400).json({ error: 'paymentId kerak' });

  const raw = await redisCommand(['HGET', 'nova:payments', paymentId]);
  if (!raw) return res.status(404).json({ error: 'not_found' });
  const payment = JSON.parse(raw);
  if (payment.status !== 'PENDING') return res.status(400).json({ error: 'already_reviewed' });
  if (!isTrustedPaymentImage(payment.screenshotUrl)) {
    return res.status(400).json({ error: 'invalid_payment_image' });
  }

  let newExpiresAt = null;
  if ((payment.kind || 'plus') === 'book') {
    if (!payment.bookId) return res.status(400).json({ error: 'bookId_missing' });
    const purchaseRecord = {
      active: true,
      purchasedAt: Date.now(),
      paymentId: payment.id,
      amount: payment.amount
    };
    await redisCommand(['SET', `nova:book-purchase:${payment.email}:${payment.bookId}`, JSON.stringify(purchaseRecord)]);
  } else {
    const durationDays = payment.plan === 'monthly' ? 30 : 365;
    const plusRaw = await redisCommand(['GET', `nova:plus:${payment.email}`]);
    const currentPlus = plusRaw ? JSON.parse(plusRaw) : null;
    const baseDate = Math.max(currentPlus && currentPlus.expiresAt ? currentPlus.expiresAt : 0, Date.now());
    newExpiresAt = baseDate + durationDays * 86400000;
    await redisCommand(['SET', `nova:plus:${payment.email}`, JSON.stringify({
      expiresAt: newExpiresAt,
      source: 'payment',
      updatedAt: Date.now()
    })]);
  }

  payment.status = 'APPROVED';
  payment.reviewedAt = Date.now();
  await redisCommand(['HSET', 'nova:payments', paymentId, JSON.stringify(payment)]);
  return res.status(200).json({ ok: true, expiresAt: newExpiresAt });
}

async function handleRejectPayment(req, res) {
  if (!requireAdmin(req, res)) return;
  const { paymentId } = req.body || {};
  if (!paymentId) return res.status(400).json({ error: 'paymentId kerak' });

  const raw = await redisCommand(['HGET', 'nova:payments', paymentId]);
  if (!raw) return res.status(404).json({ error: 'not_found' });
  const payment = JSON.parse(raw);
  if (payment.status !== 'PENDING') return res.status(400).json({ error: 'already_reviewed' });

  payment.status = 'REJECTED';
  payment.reviewedAt = Date.now();
  await redisCommand(['HSET', 'nova:payments', paymentId, JSON.stringify(payment)]);
  return res.status(200).json({ ok: true });
}

async function handleMyPaymentStatus(req, res) {
  const session = getSession(req);
  if (!session) return res.status(200).json({ payment: null });

  const flat = await redisCommand(['HGETALL', 'nova:payments']);
  let latest = null;
  for (let i = 0; i < flat.length; i += 2) {
    try {
      const p = JSON.parse(flat[i + 1]);
      if (p.email === session.email && (!latest || p.createdAt > latest.createdAt)) latest = p;
    } catch {}
  }
  res.setHeader('Cache-Control', 'private, no-store');
  return res.status(200).json({ payment: safePaymentForUser(latest) });
}

export default async function handler(req, res) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(500).json({ error: 'Server sozlanmagan: UPSTASH kalitlar topilmadi' });
  }

  try {
    if (req.method === 'GET') {
      const action = req.query.action;
      if (action === 'list') return await handleList(req, res);
      if (action === 'status') return await handleStatus(req, res);
      if (action === 'payment-settings') return await handleGetPaymentSettings(req, res);
      if (action === 'payments-list') return await handleListPayments(req, res);
      if (action === 'my-payment') return await handleMyPaymentStatus(req, res);
      return res.status(400).json({ error: "Noma'lum action" });
    }

    if (req.method === 'POST') {
      const action = (req.body || {}).action;
      if (action === 'create') return await handleCreate(req, res);
      if (action === 'preview') return await handlePreview(req, res);
      if (action === 'redeem') return await handleRedeem(req, res);
      if (action === 'revoke') return await handleRevoke(req, res);
      if (action === 'manual') return await handleManual(req, res);
      if (action === 'set-payment-settings') return await handleSetPaymentSettings(req, res);
      if (action === 'submit-payment') return await handleSubmitPayment(req, res);
      if (action === 'approve-payment') return await handleApprovePayment(req, res);
      if (action === 'reject-payment') return await handleRejectPayment(req, res);
      return res.status(400).json({ error: "Noma'lum action" });
    }

    return res.status(405).json({ error: "Bu metod qo'llab-quvvatlanmaydi" });
  } catch (err) {
    console.error('GIFT API XATOLIGI:', err);
    return res.status(500).json({ error: 'Server xatoligi' });
  }
}
