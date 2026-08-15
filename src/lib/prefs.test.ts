import { describe, expect, it } from 'vitest'
import { FONT_STEPS, stepFontScale } from './prefs'

describe('stepFontScale', () => {
  it('increases and decreases within the allowed steps', () => {
    expect(stepFontScale(1, 1)).toBe(1.15)
    expect(stepFontScale(1, -1)).toBe(0.9)
    expect(stepFontScale(FONT_STEPS[0], -1)).toBe(FONT_STEPS[0])
    expect(stepFontScale(FONT_STEPS[FONT_STEPS.length - 1], 1)).toBe(
      FONT_STEPS[FONT_STEPS.length - 1],
    )
  })
})
