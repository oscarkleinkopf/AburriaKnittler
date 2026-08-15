const FONT_KEY = 'aburriaknittler.fontScale'
const ALERTS_KEY = 'aburriaknittler.alertPrefs'
const CONTRAST_KEY = 'aburriaknittler.highContrast'
const THEME_KEY = 'aburriaknittler.colorTheme'

export const FONT_STEPS = [0.9, 1, 1.15, 1.3, 1.5] as const
export type FontScale = (typeof FONT_STEPS)[number]
export type ColorTheme = 'light' | 'dark'

export type AlertPrefs = {
  sound: boolean
  vibrate: boolean
}

export const DEFAULT_ALERT_PREFS: AlertPrefs = {
  sound: true,
  vibrate: true,
}

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

export function loadHighContrast(): boolean {
  try {
    return localStorage.getItem(CONTRAST_KEY) === '1'
  } catch {
    return false
  }
}

export function saveHighContrast(on: boolean): void {
  try {
    localStorage.setItem(CONTRAST_KEY, on ? '1' : '0')
  } catch {
    // ignore
  }
}

export function applyHighContrast(on: boolean): void {
  document.documentElement.dataset.contrast = on ? 'high' : 'default'
}

export function loadColorTheme(): ColorTheme {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'dark' || stored === 'light') return stored
  } catch {
    // ignore
  }
  return prefersDarkScheme() ? 'dark' : 'light'
}

export function hasStoredColorTheme(): boolean {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    return stored === 'dark' || stored === 'light'
  } catch {
    return false
  }
}

export function prefersDarkScheme(): boolean {
  try {
    return (
      typeof matchMedia === 'function' &&
      matchMedia('(prefers-color-scheme: dark)').matches
    )
  } catch {
    return false
  }
}

export function saveColorTheme(theme: ColorTheme): void {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // ignore
  }
}

export function applyColorTheme(theme: ColorTheme): void {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', theme === 'dark' ? '#1a2420' : '#2f5d4a')
  }
}

export function loadAlertPrefs(): AlertPrefs {
  try {
    const raw = localStorage.getItem(ALERTS_KEY)
    if (!raw) return { ...DEFAULT_ALERT_PREFS }
    const parsed = JSON.parse(raw) as Partial<AlertPrefs>
    return {
      sound: parsed.sound !== false,
      vibrate: parsed.vibrate !== false,
    }
  } catch {
    return { ...DEFAULT_ALERT_PREFS }
  }
}

export function saveAlertPrefs(prefs: AlertPrefs): void {
  try {
    localStorage.setItem(ALERTS_KEY, JSON.stringify(prefs))
  } catch {
    // ignore
  }
}

export function vibrateBrief(pattern: number | number[] = [40, 30, 40]): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern)
    }
  } catch {
    // optional
  }
}
