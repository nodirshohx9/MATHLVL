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

// Fall back before sending any answer, so responses from two models never mix.
export async function requestGeminiStreamWithFallback(apiKey, body, options = {}) {
  const models = [...new Set(options.models || [
    process.env.GEMINI_STREAM_MODEL || 'gemini-3.1-flash-lite',
    'gemini-3.5-flash-lite',
    process.env.GEMINI_MODEL || 'gemini-3.8-flash'
  ])];
  const fetcher = options.fetcher || fetch;
  let last;
  for (let index = 0; index < models.length; index++) {
    options.signal?.throwIfAborted();
    const attemptAbort = new AbortController();
    const timer = setTimeout(() => attemptAbort.abort(), 15000);
    const signal = options.signal ? AbortSignal.any([options.signal, attemptAbort.signal]) : attemptAbort.signal;
    try {
      last = await fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${models[index]}:streamGenerateContent?alt=sse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body), signal
      });
      if (last.ok && last.body) return last;
      if (![404, 429, 500, 502, 503, 504].includes(last.status)) return last;
      const failure = await last.clone().json().catch(() => ({}));
      const providerStatus = typeof failure.error?.status === 'string' ? failure.error.status : '';
      const providerMessage = typeof failure.error?.message === 'string'
        ? failure.error.message.split(apiKey).join('[redacted]').slice(0, 500) : '';
      console.warn('GEMINI_STREAM_ATTEMPT_FAILED', { model: models[index], status: last.status, providerStatus, providerMessage });
      await last.body?.cancel();
    } catch (error) {
      options.signal?.throwIfAborted();
      console.warn('GEMINI_STREAM_ATTEMPT_FAILED', { model: models[index], status: 'network_or_timeout' });
      if (index === models.length - 1) throw error;
    }
    finally { clearTimeout(timer); }
    if (index < models.length - 1) options.onFallback?.();
  }
  return last;
}
