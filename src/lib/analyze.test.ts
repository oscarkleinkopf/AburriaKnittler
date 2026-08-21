import { describe, expect, it } from 'vitest'
import {
  isLocalAnalysis,
  LOCAL_ANALYSIS_NOTICE,
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

describe('local analysis', () => {
  it('explains that the photo estimate is weak and points to typing by hand', () => {
    expect(LOCAL_ANALYSIS_NOTICE).toMatch(/poco preciso/i)
    expect(LOCAL_ANALYSIS_NOTICE).toMatch(/a mano/i)
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
