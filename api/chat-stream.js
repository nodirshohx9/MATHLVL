import {memoryRequest, memoryMessages} from '../lib/memory.js';
import { checkGuestRateLimit } from '../lib/guest-limits.js';
import { validateChat, outputLimit } from '../lib/chat-limits.js';
import { teacherSystem } from '../lib/teacher.js';
export const config = { runtime: 'edge', regions: ['iad1'] };

// Keep interactive tutoring on the lower-latency model; operators can override it separately.
const GEMINI_MODEL = process.env.GEMINI_STREAM_MODEL || 'gemini-3.1-flash-lite';
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

function parseCookies(header) {
  const cookies = {};
  (header || '').split(';').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    try { try { cookies[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim()); } catch {} } catch {}
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
  if (!/^[a-f0-9]{64}$/i.test(sigHex) || !safeEqual(expected, hexToBytes(sigHex))) return null;
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

  let limit;
  try { limit = await checkRateLimit(session.email); } catch { return jsonResponse({error:'AI vaqtincha band. Qayta urinib ko‘ring.'},503); }
  if (!limit.ok) return jsonResponse({ error: limit.message }, 429);
  if (session.guest) {
    let guestLimit;
    try { guestLimit=await checkGuestRateLimit(request,{scope:'ai',perMinute:6,perDay:40}); }
    catch { return jsonResponse({error:'Mehmon rejimidagi AI vaqtincha ishlamayapti.'},503); }
    if (!guestLimit.ok) return jsonResponse({error:guestLimit.message},guestLimit.status);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return jsonResponse({ error: 'Server sozlanmagan: GEMINI_API_KEY topilmadi' }, 500);

  let body;
  try { body = await request.json(); }
  catch { return jsonResponse({ error: "So'rov matni noto'g'ri" }, 400); }

  const invalid = validateChat(body);
  if(invalid) return jsonResponse({error:invalid},400);
  const { system, messages = [], max_tokens, memory_scope } = body;
  const contents = messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: toGeminiParts(m.content) }));
  const geminiBody = {
    contents,
    generationConfig: { maxOutputTokens: outputLimit(max_tokens), thinkingConfig: { thinkingLevel: 'low' } }
  };
  const effectiveSystem = teacherSystem(system);
  if (effectiveSystem) geminiBody.systemInstruction = { parts: [{ text: effectiveSystem }] };

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // IMPORTANT: return the SSE response immediately. Vercel Edge stops a function
  // if it waits too long before sending the first byte. Gemini can occasionally
  // take >25s to open its upstream stream, so we connect the browser first and
  // perform the Gemini fetch inside the response stream.
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      let answer = '';
      const sendRaw = (chunk) => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(chunk)); } catch {}
      };
      const sendEvent = (payload) => sendRaw(`data: ${JSON.stringify(payload)}\n\n`);

      // First byte goes out immediately; the browser safely ignores SSE comments.
      sendRaw(': connected\n\n');

      // Keep the connection alive while Gemini is preparing its first token.
      const heartbeat = setInterval(() => sendRaw(': ping\n\n'), 8000);

      const upstreamAbort = new AbortController();
      const upstreamTimeout = setTimeout(() => upstreamAbort.abort(), 60000);
      const disconnect = () => upstreamAbort.abort();
      request.signal.addEventListener('abort', disconnect, {once:true});
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${apiKey}`;

        let geminiRes;
        for(let attempt=0; attempt<3; attempt++){
          if(upstreamAbort.signal.aborted) throw new DOMException('Aborted','AbortError');
          geminiRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiBody),
            signal: upstreamAbort.signal
          });
          if(![500,502,503,504].includes(geminiRes.status) || attempt===2) break;
          await geminiRes.body?.cancel();
          sendEvent({status:'AI hozir band, qayta ulanmoqda…'});
          await new Promise(resolve=>setTimeout(resolve, 800 * (attempt+1)));
        }

        if (!geminiRes.ok || !geminiRes.body) {
          await geminiRes.body?.cancel();
          const message = geminiRes.status===429
            ? 'AI so‘rov limiti tugadi. Birozdan keyin qayta urinib ko‘ring.'
            : geminiRes.status>=500
              ? 'AI serveri hozir band. Iltimos, birozdan keyin qayta yuboring.'
              : 'AI xizmatida xatolik yuz berdi. Qayta urinib ko‘ring.';
          sendEvent({ error: message });
          sendRaw('data: [DONE]\n\n');
          return;
        }

        const reader = geminiRes.body.getReader();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(jsonStr);
              const text = (parsed.candidates?.[0]?.content?.parts || [])
                .map(p => p.text || '')
                .join('');
              if (text) { answer += text; sendEvent({ text }); }
            } catch {}
          }
        }

        if(memory_scope === 'teacher' && answer){
          try {
            if (!session.guest) await memoryRequest(request.headers.get('cookie'), 'write', memoryMessages([...messages,{role:'assistant',content:answer}]));
            sendEvent({memorySaved:true});
          } catch { sendEvent({memorySaved:false}); }
        }
        sendRaw('data: [DONE]\n\n');
      } catch (err) {
        const message = err?.name === 'AbortError'
          ? 'Ustoz AI javobi kechikdi. Qayta urinib ko‘ring.'
          : (err?.message || 'Ustoz AI bilan ulanishda xatolik.');
        sendEvent({ error: message });
        sendRaw('data: [DONE]\n\n');
      } finally {
        clearTimeout(upstreamTimeout);
        request.signal.removeEventListener('abort', disconnect);
        upstreamAbort.abort();
        clearInterval(heartbeat);
        closed = true;
        try { controller.close(); } catch {}
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  });
}


