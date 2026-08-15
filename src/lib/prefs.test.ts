import { describe, expect, it } from 'vitest'
import { FONT_STEPS, loadColorTheme, saveColorTheme, stepFontScale } from './prefs'

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

describe('color theme', () => {
  it('persists dark and light in storage', () => {
    const map = new Map<string, string>()
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
    expect(loadColorTheme()).toBe('light')
    saveColorTheme('dark')
    expect(loadColorTheme()).toBe('dark')
    saveColorTheme('light')
    expect(loadColorTheme()).toBe('light')
  })
})
