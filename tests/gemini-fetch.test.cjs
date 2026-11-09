'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  rewriteGeminiFetchArgs,
  wrapFetch,
  installGeminiKeyGuard,
} = require('../ak-security.js');

const GEMINI =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

describe('rewriteGeminiFetchArgs', () => {
  it('moves a Gemini query key into x-goog-api-key and strips it from the URL', () => {
    const out = rewriteGeminiFetchArgs(GEMINI + '?key=secret-test-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    assert.equal(out.rewritten, true);
    assert.equal(out.input, GEMINI);
    assert.equal(out.init.method, 'POST');
    assert.equal(out.init.headers.get('Content-Type'), 'application/json');
    assert.equal(out.init.headers.get('x-goog-api-key'), 'secret-test-key');
    assert.equal(String(out.input).includes('key='), false);
  });

  it('leaves non-Gemini requests unchanged', () => {
    const init = { method: 'GET' };
    const out = rewriteGeminiFetchArgs('/api/analizar', init);
    assert.equal(out.rewritten, false);
    assert.equal(out.input, '/api/analizar');
    assert.equal(out.init, init);
  });

  it('does not duplicate the header when the URL has no key', () => {
    const out = rewriteGeminiFetchArgs(GEMINI, {
      headers: { 'x-goog-api-key': 'already' },
    });
    assert.equal(out.rewritten, false);
    assert.equal(out.init.headers['x-goog-api-key'], 'already');
  });
});

describe('wrapFetch', () => {
  it('calls through with the rewritten URL and header', async () => {
    const calls = [];
    const fake = async function (input, init) {
      calls.push({ input, init });
      return { ok: true };
    };
    const wrapped = wrapFetch(fake);
    await wrapped.call({ ctx: true }, GEMINI + '?key=from-url', {
      method: 'POST',
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].input, GEMINI);
    assert.equal(calls[0].init.headers.get('x-goog-api-key'), 'from-url');
  });
});

describe('installGeminiKeyGuard', () => {
  it('wraps fetch once on a fake global', async () => {
    const calls = [];
    const g = {
      fetch: async function (input, init) {
        calls.push({ input, init });
        return { ok: true };
      },
    };
    assert.equal(installGeminiKeyGuard(g), true);
    assert.equal(installGeminiKeyGuard(g), false);
    await g.fetch(GEMINI + '?key=once', { method: 'POST' });
    assert.equal(calls[0].input, GEMINI);
    assert.equal(calls[0].init.headers.get('x-goog-api-key'), 'once');
  });
});
