import { describe, expect, it } from 'vitest'
import {
  countFromGauge,
  estimateYarnMeters,
  evenSpacing,
  formatMeters,
  planEvenShaping,
} from './knitTools'

describe('evenSpacing', () => {
  it('puts all plain stitches into one bucket when there are no actions', () => {
    expect(evenSpacing(20, 0)).toEqual([20])
  })

  it('splits plain stitches across actionCount + 1 buckets', () => {
    const buckets = evenSpacing(84, 8)
    expect(buckets).toHaveLength(9)
    expect(buckets.reduce((sum, n) => sum + n, 0)).toBe(84)
    expect(buckets.every((n) => n >= 0)).toBe(true)
  })
})

describe('planEvenShaping', () => {
  it('spaces 8 decreases over 100 stitches with k2tog', () => {
    const plan = planEvenShaping(100, -8)
    if ('error' in plan) throw new Error(plan.error)
    expect(plan.kind).toBe('decrease')
    expect(plan.from).toBe(100)
    expect(plan.to).toBe(92)
    expect(plan.change).toBe(-8)
    expect(plan.instruction).toMatch(/Disminuye 8: de 100 a 92 puntos/)
    expect(plan.instruction).toMatch(/2 juntos/)
  })

  it('spaces increases between knit stitches', () => {
    const plan = planEvenShaping(40, 4)
    if ('error' in plan) throw new Error(plan.error)
    expect(plan.kind).toBe('increase')
    expect(plan.from).toBe(40)
    expect(plan.to).toBe(44)
    expect(plan.instruction).toMatch(/Aumenta 4: de 40 a 44 puntos/)
    expect(plan.instruction).toMatch(/aumenta 1/)
  })

  it('uses yarn-over, kfb and SSK phrasing', () => {
    const yo = planEvenShaping(40, 4, 'yo')
    if ('error' in yo) throw new Error(yo.error)
    expect(yo.instruction).toMatch(/lazada/)
    const kfb = planEvenShaping(40, 4, 'kfb')
    if ('error' in kfb) throw new Error(kfb.error)
    expect(kfb.instruction).toMatch(/punto por delante y detrás/)
    const ssk = planEvenShaping(100, -8, 'ssk')
    if ('error' in ssk) throw new Error(ssk.error)
    expect(ssk.instruction).toMatch(/2 juntos revés \(SSK\)/)
    expect(planEvenShaping(10, 11, 'kfb')).toMatchObject({
      error: expect.stringMatching(/por delante y por detrás/),
    })
  })

  it('rejects empty, zero or impossible shaping', () => {
    expect(planEvenShaping(1, 2)).toEqual({
      error: 'Indica cuántos puntos tienes ahora (al menos 2).',
    })
    expect(planEvenShaping(20, 0)).toEqual({
      error: 'Indica cuántos puntos aumentar o disminuir (no 0).',
    })
    expect(planEvenShaping(10, -10)).toEqual({
      error: 'No puedes dejar menos de 1 punto.',
    })
    expect(planEvenShaping(10, -6)).toMatchObject({
      error: expect.stringMatching(/no caben/),
    })
  })
})

describe('countFromGauge', () => {
  it('rounds stitches needed for a target width', () => {
    expect(countFromGauge(22, 10, 45)).toBe(99)
  })

  it('returns null when the swatch is incomplete', () => {
    expect(countFromGauge(0, 10, 45)).toBeNull()
    expect(countFromGauge(22, 0, 45)).toBeNull()
    expect(countFromGauge(22, 10, 0)).toBeNull()
  })
})

describe('estimateYarnMeters', () => {
  it('scales swatch yarn by the target area', () => {
    expect(estimateYarnMeters(8, 10, 45, 60)).toBe(216)
    expect(formatMeters(12.5)).toBe('12,5 m')
  })

  it('returns null without a complete swatch', () => {
    expect(estimateYarnMeters(0, 10, 45, 60)).toBeNull()
    expect(estimateYarnMeters(8, 10, 45, 0)).toBeNull()
  })
})
