export const config = { runtime: 'edge', regions: ['iad1'] };

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
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

function hexToBytes(hex) {
  if (!hex || hex.length % 2) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function safeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function verifySession(request) {
  const token = parseCookies(request.headers.get('cookie')).nova_session;
  const secret = process.env.SESSION_SECRET;
  if (!token || !secret) return null;
  const [data, sigHex] = token.split('.');
  if (!data || !sigHex) return null;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const expected = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data)));
  if (!safeEqual(expected, hexToBytes(sigHex))) return null;
  try {
    let base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const json = decodeURIComponent(Array.from(atob(base64)).map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''));
    const payload = JSON.parse(json);
    if (!payload.email || !payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

async function redisCommand(command) {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  const r = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command)
  });
  const data = await r.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

async function hashId(text) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text.toLowerCase())));
  return Array.from(digest.slice(0, 12)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function checkRateLimit(email) {
  if (!REDIS_URL || !REDIS_TOKEN) return { ok: true };
  const id = await hashId(email);
  const minuteKey = `mathlvl:ai:min:${id}:${Math.floor(Date.now() / 60000)}`;
  const dayKey = `mathlvl:ai:day:${id}:${new Date().toISOString().slice(0, 10)}`;
  const minuteCount = Number(await redisCommand(['INCR', minuteKey]));
  if (minuteCount === 1) await redisCommand(['EXPIRE', minuteKey, 120]);
  const dayCount = Number(await redisCommand(['INCR', dayKey]));
  if (dayCount === 1) await redisCommand(['EXPIRE', dayKey, 172800]);
  if (minuteCount > 15) return { ok: false, message: "Juda ko'p so'rov yuborildi. Bir ozdan keyin urinib ko'ring." };
  if (dayCount > 100) return { ok: false, message: 'Bugungi Ustoz AI limiti tugadi.' };
  return { ok: true };
}

function toGeminiParts(content) {
  if (typeof content === 'string') return [{ text: content }];
  if (Array.isArray(content)) {
    return content.map(block => block.type === 'image'
      ? { inline_data: { mime_type: block.source.media_type, data: block.source.data } }
      : { text: block.text || '' });
  }
  return [{ text: String(content || '') }];
}

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export default async function handler(request) {
  if (request.method !== 'POST') return jsonResponse({ error: "Faqat POST so'rovlar qabul qilinadi" }, 405);

  const session = await verifySession(request);
  if (!session) return jsonResponse({ error: 'Ustoz AI uchun avval tizimga kiring.' }, 401);

  const limit = await checkRateLimit(session.email);
  if (!limit.ok) return jsonResponse({ error: limit.message }, 429);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return jsonResponse({ error: 'Server sozlanmagan: GEMINI_API_KEY topilmadi' }, 500);

  let body;
  try { body = await request.json(); }
  catch { return jsonResponse({ error: "So'rov matni noto'g'ri" }, 400); }

  const { system, messages = [], max_tokens } = body;
  const contents = messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: toGeminiParts(m.content) }));
  const geminiBody = {
    contents,
    generationConfig: { maxOutputTokens: Math.max(max_tokens || 1000, 1500), thinkingConfig: { thinkingBudget: 0 } }
  };
  if (system) geminiBody.systemInstruction = { parts: [{ text: system }] };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${apiKey}`;
  let geminiRes;
  try {
    geminiRes = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(geminiBody) });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }

  if (!geminiRes.ok || !geminiRes.body) {
    const errData = await geminiRes.json().catch(() => ({}));
    return jsonResponse({ error: errData.error?.message || 'Gemini API xatoligi' }, geminiRes.status);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const stream = new ReadableStream({
    async start(controller) {
      const reader = geminiRes.body.getReader();
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop();
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const text = (parsed.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
              if (text) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
            } catch {}
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`));
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  });
}
