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

import { requestGeminiStreamWithFallback } from '../lib/gemini-request.js';
for (const status of [404, 429, 500, 502, 503, 504]) test(`teacher stream switches models after ${status}`, async () => {
  const calls = [];
  let notices = 0;
  const response = await requestGeminiStreamWithFallback('private-key', {contents: []}, {
    models: ['primary', 'backup'], onFallback: () => notices++,
    fetcher: async (url, options) => {
      calls.push({url, options});
      return new Response(calls.length === 1 ? '{}' : 'data: answer\n\n', {status: calls.length === 1 ? status : 200});
    }
  });
  assert.equal(calls.length, 2);
  assert.match(calls[1].url, /backup:streamGenerateContent/);
  assert.equal(notices, 1);
  assert.ok(!calls[0].url.includes('private-key'));
  assert.equal(calls[0].options.headers['x-goog-api-key'], 'private-key');
  assert.equal(await response.text(), 'data: answer\n\n');
});
test('teacher stream does not retry credentials or a successful response', async () => {
  for (const status of [200, 400, 403]) {
    let calls = 0;
    await requestGeminiStreamWithFallback('key', {}, {models:['a','b'],fetcher:async()=>{calls++; return new Response('{}',{status});}});
    assert.equal(calls, 1);
  }
});
test('teacher stream recovers a network failure and respects cancellation', async () => {
  let calls = 0;
  const fetcher = async () => { if (++calls === 1) throw new Error('network'); return new Response('answer'); };
  const response = await requestGeminiStreamWithFallback('key', {}, {models:['a','b'],fetcher});
  assert.equal(await response.text(), 'answer');
  const abort = new AbortController(); abort.abort();
  await assert.rejects(requestGeminiStreamWithFallback('key', {}, {signal:abort.signal,fetcher}));
  assert.equal(calls,2);
});

test('matching operator model overrides still retain an independent backup', async () => {
  const previousStream = process.env.GEMINI_STREAM_MODEL;
  const previousModel = process.env.GEMINI_MODEL;
  try {
    process.env.GEMINI_STREAM_MODEL = process.env.GEMINI_MODEL = 'busy-model';
    const urls=[];
    const result=await requestGeminiStreamWithFallback('key', {}, {fetcher:async(url)=>{
      urls.push(url);
      return new Response('{}',{status:urls.length===1?503:200});
    }});
    assert.equal(result.status,200);
    assert.equal(urls.length,2);
    assert.match(urls[1],/gemini-3\.5-flash-lite:streamGenerateContent/);
  } finally {
    if(previousStream===undefined) delete process.env.GEMINI_STREAM_MODEL; else process.env.GEMINI_STREAM_MODEL=previousStream;
    if(previousModel===undefined) delete process.env.GEMINI_MODEL; else process.env.GEMINI_MODEL=previousModel;
  }
});
