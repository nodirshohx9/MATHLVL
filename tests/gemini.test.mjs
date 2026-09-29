import test from 'node:test';
import assert from 'node:assert/strict';
import { requestGeminiWithFallback } from '../lib/gemini-request.js';

for (const status of [404, 429, 503]) test(`solver falls back after ${status}`, async () => {
  const requests = [];
  const result = await requestGeminiWithFallback('test-key', { contents: [] }, {
    models: ['primary', 'backup'],
    fetcher: async (url, options) => {
      requests.push({ url, options });
      return new Response(JSON.stringify({ candidates: [] }), { status: requests.length === 1 ? status : 200 });
    }
  });
  assert.equal(result.model, 'backup');
  assert.equal(requests.length, 2);
  assert.ok(!requests[0].url.includes('test-key'));
  assert.equal(requests[1].options.headers['x-goog-api-key'], 'test-key');
});
test('authentication failures are not retried', async () => {
  let calls = 0;
  await requestGeminiWithFallback('key', {}, { models: ['a', 'b'], fetcher: async () => { calls++; return new Response('{}', { status: 403 }); } });
  assert.equal(calls, 1);
});
test('network failure uses backup without exceeding the overall budget', async () => {
  let clock = 0, calls = 0;
  const result = await requestGeminiWithFallback('key', {}, { models: ['a', 'b', 'c'], now: () => clock, fetcher: async () => { calls++; clock += 28000; throw new Error('timeout'); } });
  assert.equal(calls, 2);
  assert.equal(result.response, null);
});
