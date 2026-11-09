import { describe, expect, it } from 'vitest'
import {
  installGeminiKeyGuard,
  rewriteGeminiFetchArgs,
  wrapFetch,
} from './geminiFetchGuard'

const GEMINI =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

describe('rewriteGeminiFetchArgs', () => {
  it('moves a Gemini query key into x-goog-api-key and strips it from the URL', () => {
    const out = rewriteGeminiFetchArgs(`${GEMINI}?key=secret-test-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    expect(out.rewritten).toBe(true)
    expect(out.input).toBe(GEMINI)
    expect(out.init?.method).toBe('POST')
    const headers = new Headers(out.init?.headers)
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(headers.get('x-goog-api-key')).toBe('secret-test-key')
    expect(String(out.input)).not.toContain('key=')
  })

  it('leaves non-Gemini requests unchanged', () => {
    const init = { method: 'GET' as const }
    const out = rewriteGeminiFetchArgs('/api/analizar', init)
    expect(out.rewritten).toBe(false)
    expect(out.input).toBe('/api/analizar')
    expect(out.init).toBe(init)
  })

  it('does not rewrite when the URL has no key', () => {
    const init = { headers: { 'x-goog-api-key': 'already' } }
    const out = rewriteGeminiFetchArgs(GEMINI, init)
    expect(out.rewritten).toBe(false)
    expect(out.init).toBe(init)
  })
})

describe('wrapFetch', () => {
  it('calls through with the rewritten URL and header', async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = []
    const fake = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, init })
      return { ok: true } as Response
    }) as typeof fetch
    const wrapped = wrapFetch(fake)
    await wrapped(`${GEMINI}?key=from-url`, { method: 'POST' })
    expect(calls).toHaveLength(1)
    expect(calls[0].input).toBe(GEMINI)
    expect(new Headers(calls[0].init?.headers).get('x-goog-api-key')).toBe(
      'from-url',
    )
  })
})

describe('installGeminiKeyGuard', () => {
  it('wraps fetch once on a fake global', async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = []
    const g = {
      fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
        calls.push({ input, init })
        return { ok: true } as Response
      }) as typeof fetch,
    }
    expect(installGeminiKeyGuard(g)).toBe(true)
    expect(installGeminiKeyGuard(g)).toBe(false)
    await g.fetch(`${GEMINI}?key=once`, { method: 'POST' })
    expect(calls[0].input).toBe(GEMINI)
    expect(new Headers(calls[0].init?.headers).get('x-goog-api-key')).toBe(
      'once',
    )
  })
})
