import { describe, expect, it } from 'vitest'
import { GOAL_BEEP_GAIN, MARKER_BEEP_GAIN } from './sound'

describe('beep volume', () => {
  it('stays quiet enough for a shared room', () => {
    expect(MARKER_BEEP_GAIN).toBeLessThanOrEqual(0.04)
    expect(GOAL_BEEP_GAIN).toBeLessThanOrEqual(0.05)
    expect(GOAL_BEEP_GAIN).toBeGreaterThan(MARKER_BEEP_GAIN)
  })
})
