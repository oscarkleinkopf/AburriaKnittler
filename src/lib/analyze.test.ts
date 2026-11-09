import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  analyzeApiPath,
  analyzeGarmentPhoto,
  analyzeViaServer,
  hasGeminiKey,
  hasServerVision,
  hasVision,
  isLocalAnalysis,
  loadGeminiKey,
  LOCAL_ANALYSIS_NOTICE,
  PHOTO_LEAVE_DEVICE_NOTICE,
  GEMINI_GENERATE_CONTENT_URL,
  maskGeminiKey,
  resolveGeminiKey,
  saveGeminiKey,
  bundledGeminiKey,
  type AnalyzeResult,
} from './analyze'
import { extractJson, normalizeAnalyzeResult } from './analyzeShared'

const local: AnalyzeResult = {
  estimatedStitches: 80,
  estimatedRows: 40,
  stitchType: 'Punto jersey (estimación local)',
  patternStructure: 'Modo demo',
  confidence: 'baja',
  notes: 'Sin clave de Gemini',
}

function mockStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial))
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => {
        map.set(k, v)
      },
      removeItem: (k: string) => {
        map.delete(k)
      },
    },
  })
}

describe('local analysis', () => {
  it('explains that the photo estimate is weak and that a Gemini key sends the photo to Google', () => {
    expect(LOCAL_ANALYSIS_NOTICE).toMatch(/poco preciso/i)
    expect(LOCAL_ANALYSIS_NOTICE).toMatch(/a mano/i)
    expect(LOCAL_ANALYSIS_NOTICE).toMatch(/Gemini/)
    expect(LOCAL_ANALYSIS_NOTICE).not.toMatch(/pegar una clave/)
    expect(LOCAL_ANALYSIS_NOTICE).not.toMatch(/VITE_GEMINI_API_KEY/)
    expect(LOCAL_ANALYSIS_NOTICE).toMatch(/envía la foto a Google/)
    expect(PHOTO_LEAVE_DEVICE_NOTICE).toMatch(/se envía a Google/)
    expect(PHOTO_LEAVE_DEVICE_NOTICE).not.toMatch(/Nada sale de tu aparato salvo/)
  })

  it('detects the on-device demo result', () => {
    expect(isLocalAnalysis(local)).toBe(true)
    expect(
      isLocalAnalysis({
        ...local,
        confidence: 'alta',
        stitchType: 'jersey',
      }),
    ).toBe(false)
    expect(isLocalAnalysis(null)).toBe(false)
  })
})

describe('personal Gemini key', () => {
  it('stores the key on the device and masks it', () => {
    mockStorage()
    expect(loadGeminiKey()).toBe('')
    saveGeminiKey('  AIzaSyTestKey1234  ')
    expect(loadGeminiKey()).toBe('AIzaSyTestKey1234')
    expect(resolveGeminiKey()).toBe('AIzaSyTestKey1234')
    expect(hasGeminiKey()).toBe(true)
    expect(maskGeminiKey('AIzaSyTestKey1234')).toBe('••••1234')
    saveGeminiKey('')
    expect(loadGeminiKey()).toBe('')
    expect(resolveGeminiKey()).toBe(bundledGeminiKey())
  })
})

describe('server vision API', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('is off in unit tests (GitHub Pages / Vitest have no function URL)', () => {
    expect(analyzeApiPath()).toBe('')
    expect(hasServerVision()).toBe(false)
    mockStorage()
    saveGeminiKey('')
    expect(hasVision()).toBe(Boolean(bundledGeminiKey()))
  })

  it('posts the photo to the analyze API and normalizes the JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        estimatedStitches: 80,
        estimatedRows: 40,
        stitchType: 'jersey',
        patternStructure: 'plano',
        confidence: 'media',
        notes: 'ok',
      }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const file = new File(['hello'], 'knit.jpg', { type: 'image/jpeg' })
    const result = await analyzeViaServer(file, '/api/analizar')
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/analizar')
    expect(init.method).toBe('POST')
    const sent = JSON.parse(String(init.body)) as { mimeType: string; data: string }
    expect(sent.mimeType).toBe('image/jpeg')
    expect(sent.data.length).toBeGreaterThan(0)
    expect(result).toEqual({
      estimatedStitches: 80,
      estimatedRows: 40,
      stitchType: 'jersey',
      patternStructure: 'plano',
      confidence: 'media',
      notes: 'ok',
    })
  })

  it('surfaces the server error message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error: 'La IA del servidor aún no está lista.',
        }),
      }),
    )
    const file = new File(['hello'], 'knit.jpg', { type: 'image/jpeg' })
    await expect(analyzeViaServer(file, '/api/analizar')).rejects.toThrow(
      /aún no está lista/i,
    )
  })
})

describe('client Gemini requests', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('sends the API key in x-goog-api-key, not in the URL', async () => {
    mockStorage()
    saveGeminiKey('secret-test-key')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    estimatedStitches: 80,
                    estimatedRows: 40,
                    stitchType: 'jersey',
                    patternStructure: 'plano',
                    confidence: 'media',
                    notes: 'ok',
                  }),
                },
              ],
            },
          },
        ],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const file = new File(['hello'], 'knit.jpg', { type: 'image/jpeg' })
    const result = await analyzeGarmentPhoto(file)
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(GEMINI_GENERATE_CONTENT_URL)
    expect(String(url)).not.toContain('key=')
    const headers = new Headers(init.headers)
    expect(headers.get('x-goog-api-key')).toBe('secret-test-key')
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(result).toMatchObject({
      estimatedStitches: 80,
      estimatedRows: 40,
      stitchType: 'jersey',
    })
  })
})

describe('analyze JSON helpers', () => {
  it('extracts JSON even when wrapped in extra text', () => {
    const parsed = extractJson(
      'nota\n{"estimatedStitches": 12, "stitchType": "musgo"}\n',
    ) as Record<string, unknown>
    expect(normalizeAnalyzeResult(parsed)).toMatchObject({
      estimatedStitches: 12,
      stitchType: 'musgo',
      estimatedRows: null,
      confidence: 'baja',
    })
  })
})
