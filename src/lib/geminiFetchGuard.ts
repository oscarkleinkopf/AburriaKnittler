export type GeminiFetchRewrite = {
  input: RequestInfo | URL
  init?: RequestInit
  rewritten: boolean
}

function requestUrl(input: RequestInfo | URL): string | null {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  if (typeof Request !== 'undefined' && input instanceof Request) return input.url
  return null
}

export function rewriteGeminiFetchArgs(
  input: RequestInfo | URL,
  init?: RequestInit,
): GeminiFetchRewrite {
  const urlString = requestUrl(input)
  if (!urlString || !urlString.includes('generativelanguage.googleapis.com')) {
    return { input, init, rewritten: false }
  }

  let parsed: URL
  try {
    parsed = new URL(urlString, 'https://generativelanguage.googleapis.com')
  } catch {
    return { input, init, rewritten: false }
  }

  const key = parsed.searchParams.get('key')
  if (!key) {
    return { input, init, rewritten: false }
  }

  parsed.searchParams.delete('key')

  let headers: Headers
  if (init?.headers) {
    headers = new Headers(init.headers)
  } else if (typeof Request !== 'undefined' && input instanceof Request) {
    headers = new Headers(input.headers)
  } else {
    headers = new Headers()
  }
  if (!headers.has('x-goog-api-key')) {
    headers.set('x-goog-api-key', key)
  }

  const nextInit: RequestInit = { ...(init ?? {}) }
  nextInit.headers = headers

  return { input: parsed.toString(), init: nextInit, rewritten: true }
}

export function wrapFetch(originalFetch: typeof fetch): typeof fetch {
  const patched = function patchedFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const out = rewriteGeminiFetchArgs(input, init)
    return originalFetch.call(
      globalThis,
      out.input as RequestInfo,
      out.init,
    )
  }
  return patched as typeof fetch
}

type FetchHost = {
  fetch: typeof fetch
}

type MarkedFetch = typeof fetch & { __akGeminiKeyGuard?: boolean }

export function installGeminiKeyGuard(
  globalObj: FetchHost = globalThis as FetchHost,
): boolean {
  const current = globalObj.fetch as MarkedFetch | undefined
  if (typeof current !== 'function') return false
  if (current.__akGeminiKeyGuard) return false
  const wrapped = wrapFetch(current) as MarkedFetch
  wrapped.__akGeminiKeyGuard = true
  globalObj.fetch = wrapped
  return true
}
