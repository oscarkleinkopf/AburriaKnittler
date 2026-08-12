const FONT_KEY = 'aburriaknittler.fontScale'

export const FONT_STEPS = [0.9, 1, 1.15, 1.3, 1.5] as const
export type FontScale = (typeof FONT_STEPS)[number]

export function loadFontScale(): FontScale {
  try {
    const raw = localStorage.getItem(FONT_KEY)
    const n = raw == null ? 1 : Number.parseFloat(raw)
    const match = FONT_STEPS.find((s) => Math.abs(s - n) < 0.001)
    return match ?? 1
  } catch {
    return 1
  }
}

export function saveFontScale(scale: FontScale): void {
  try {
    localStorage.setItem(FONT_KEY, String(scale))
  } catch {
    // ignore
  }
}

export function applyFontScale(scale: FontScale): void {
  document.documentElement.style.setProperty('--font-scale', String(scale))
  document.documentElement.dataset.fontScale = String(scale)
}

export function stepFontScale(
  current: FontScale,
  direction: -1 | 1,
): FontScale {
  const idx = FONT_STEPS.indexOf(current)
  const next = Math.min(
    FONT_STEPS.length - 1,
    Math.max(0, (idx < 0 ? 1 : idx) + direction),
  )
  return FONT_STEPS[next]
}
