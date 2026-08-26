import { describe, expect, it } from 'vitest'
import {
  hasGeminiKey,
  isLocalAnalysis,
  loadGeminiKey,
  LOCAL_ANALYSIS_NOTICE,
  maskGeminiKey,
  resolveGeminiKey,
  saveGeminiKey,
  bundledGeminiKey,
  type AnalyzeResult,
} from './analyze'

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
  it('explains that the photo estimate is weak and points to typing by hand', () => {
    expect(LOCAL_ANALYSIS_NOTICE).toMatch(/poco preciso/i)
    expect(LOCAL_ANALYSIS_NOTICE).toMatch(/a mano/i)
    expect(LOCAL_ANALYSIS_NOTICE).toMatch(/Gemini/)
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
