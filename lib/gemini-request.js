// Stay within the function's 60-second lifetime, including response parsing.
export async function requestGeminiWithFallback(apiKey, body, options = {}) {
  const models = [...new Set(options.models || [
    process.env.GEMINI_MODEL || 'gemini-3.8-flash',
    'gemini-3.1-flash-lite'
  ])];
  const fetcher = options.fetcher || fetch;
  const now = options.now || Date.now;
  const deadline = now() + 50000;
  let last = null;
  for (let index = 0; index < models.length; index++) {
    const model = models[index];
    const remaining = deadline - now();
    if (remaining <= 0) break;
    try {
      const response = await fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(Math.min(remaining, index === 0 ? 28000 : 22000))
      });
      const data = await response.json().catch(() => ({}));
      last = { response, data, model };
      if (response.ok) return last;
      console.warn('GEMINI_ATTEMPT_FAILED', { model, status: response.status });
      if (![404, 429, 500, 502, 503, 504].includes(response.status)) return last;
    } catch {
      console.warn('GEMINI_ATTEMPT_FAILED', { model, status: 'network_or_timeout' });
      last = { response: null, data: {}, model };
    }
  }
  return last;
}
