from pathlib import Path

p = Path('api/mocks.js')
s = p.read_text(encoding='utf-8')

MARKER = 'MATHLVL_MOCK_PDF_RESILIENCE_V1'
if MARKER in s:
    raise SystemExit(0)

insert_before = "async function importPdfWithGemini(pdfUrl, fallbackTitle) {"
if insert_before not in s:
    raise SystemExit('importPdfWithGemini not found')

helper = r'''
// MATHLVL_MOCK_PDF_RESILIENCE_V1
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryableGeminiError(status, message) {
  const text = String(message || '').toLowerCase();
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504 ||
    text.includes('high demand') || text.includes('overloaded') || text.includes('temporarily unavailable') ||
    text.includes('resource exhausted') || text.includes('try again later');
}

async function callGeminiPdf(geminiBody, apiKey) {
  const fallbackModel = cleanText(process.env.GEMINI_FALLBACK_MODEL || 'gemini-2.5-flash', 120);
  const models = [...new Set([GEMINI_MODEL, fallbackModel].filter(Boolean))];
  let lastStatus = 500;
  let lastMessage = 'Gemini PDF tahlilida xatolik';

  for (let modelIndex = 0; modelIndex < models.length; modelIndex += 1) {
    const model = models[modelIndex];
    const maxAttempts = modelIndex === 0 ? 3 : 2;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      let response;
      let data = {};

      try {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(geminiBody)
        });
        data = await response.json();
      } catch (error) {
        lastStatus = 503;
        lastMessage = error?.message || 'AI serveriga ulanib bo‘lmadi';
        if (attempt < maxAttempts - 1) {
          await sleep(900 * (attempt + 1));
          continue;
        }
        break;
      }

      if (response.ok) return { data, model };

      lastStatus = response.status;
      lastMessage = data.error?.message || `Gemini xatosi (${response.status})`;
      const retryable = isRetryableGeminiError(response.status, lastMessage);

      if (!retryable) {
        // 400/401 kabi doimiy sozlama xatolarida boshqa modelga bekorga o'tmaymiz.
        const err = new Error(lastMessage);
        err.status = response.status;
        throw err;
      }

      if (attempt < maxAttempts - 1) {
        const retryAfter = Number(response.headers.get('retry-after') || 0);
        const waitMs = retryAfter > 0 ? Math.min(retryAfter * 1000, 5000) : 900 * (attempt + 1);
        await sleep(waitMs);
      }
    }
  }

  const busy = isRetryableGeminiError(lastStatus, lastMessage);
  const err = new Error(
    busy
      ? "AI serveri hozir band. MATHLVL avtomatik bir necha marta qayta urindi, lekin javob kelmadi. 20–30 soniyadan keyin yana 'PDFni elektron mockka aylantirish'ni bosing."
      : lastMessage
  );
  err.status = busy ? 503 : lastStatus;
  throw err;
}

'''

s = s.replace(insert_before, helper + insert_before, 1)

old_call = r'''  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const geminiRes = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(geminiBody)
  });
  const data = await geminiRes.json();
  if (!geminiRes.ok) throw new Error(data.error?.message || 'Gemini PDF tahlilida xatolik');
'''

new_call = r'''  const { data } = await callGeminiPdf(geminiBody, apiKey);
'''

if old_call not in s:
    raise SystemExit('Gemini direct call block not found')
s = s.replace(old_call, new_call, 1)

# Return transient AI overload as 503 instead of hiding it as a generic server 500.
old_catch = "  } catch (error) {\n    return res.status(500).json({ error: error.message });\n  }\n}"
new_catch = "  } catch (error) {\n    const status = Number(error?.status);\n    const safeStatus = Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500;\n    return res.status(safeStatus).json({ error: error.message });\n  }\n}"
if old_catch not in s:
    raise SystemExit('handler catch block not found')
s = s.replace(old_catch, new_catch, 1)

for token in [MARKER, 'callGeminiPdf', 'gemini-2.5-flash', 'AI serveri hozir band']:
    if token not in s:
        raise SystemExit(f'missing resilience token: {token}')

p.write_text(s, encoding='utf-8')
print('Mock PDF Gemini retry/fallback resilience applied.')
