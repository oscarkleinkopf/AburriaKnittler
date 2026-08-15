import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  applyColorTheme,
  applyFontScale,
  applyHighContrast,
  hasStoredColorTheme,
  loadAlertPrefs,
  loadColorTheme,
  loadFontScale,
  loadHighContrast,
  saveAlertPrefs,
  saveColorTheme,
  saveFontScale,
  saveHighContrast,
  stepFontScale,
  type AlertPrefs,
  type ColorTheme,
  type FontScale,
} from './prefs'

type PrefsApi = {
  fontScale: FontScale
  biggerText: () => void
  smallerText: () => void
  resetText: () => void
  highContrast: boolean
  toggleHighContrast: () => void
  theme: ColorTheme
  toggleTheme: () => void
  alerts: AlertPrefs
  setAlertSound: (on: boolean) => void
  setAlertVibrate: (on: boolean) => void
}

const PrefsContext = createContext<PrefsApi | null>(null)

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [fontScale, setFontScale] = useState<FontScale>(() => loadFontScale())
  const [highContrast, setHighContrast] = useState(() => loadHighContrast())
  const [theme, setTheme] = useState<ColorTheme>(() => loadColorTheme())
  const [themeLocked, setThemeLocked] = useState(() => hasStoredColorTheme())
  const [alerts, setAlerts] = useState<AlertPrefs>(() => loadAlertPrefs())

  useEffect(() => {
    applyFontScale(fontScale)
    saveFontScale(fontScale)
  }, [fontScale])

  useEffect(() => {
    applyHighContrast(highContrast)
    saveHighContrast(highContrast)
  }, [highContrast])

  useEffect(() => {
    applyColorTheme(theme)
  }, [theme])

  useEffect(() => {
    if (themeLocked) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setTheme(mq.matches ? 'dark' : 'light')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [themeLocked])

  useEffect(() => {
    saveAlertPrefs(alerts)
  }, [alerts])

  const biggerText = useCallback(() => {
    setFontScale((s) => stepFontScale(s, 1))
  }, [])

  const smallerText = useCallback(() => {
    setFontScale((s) => stepFontScale(s, -1))
  }, [])

  const resetText = useCallback(() => {
    setFontScale(1)
  }, [])

  const toggleHighContrast = useCallback(() => {
    setHighContrast((v) => !v)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark'
      saveColorTheme(next)
      return next
    })
    setThemeLocked(true)
  }, [])

  const setAlertSound = useCallback((on: boolean) => {
    setAlerts((a) => ({ ...a, sound: on }))
  }, [])

  const setAlertVibrate = useCallback((on: boolean) => {
    setAlerts((a) => ({ ...a, vibrate: on }))
  }, [])

  const api = useMemo(
    () => ({
      fontScale,
      biggerText,
      smallerText,
      resetText,
      highContrast,
      toggleHighContrast,
      theme,
      toggleTheme,
      alerts,
      setAlertSound,
      setAlertVibrate,
    }),
    [
      fontScale,
      biggerText,
      smallerText,
      resetText,
      highContrast,
      toggleHighContrast,
      theme,
      toggleTheme,
      alerts,
      setAlertSound,
      setAlertVibrate,
    ],
  )

  return <PrefsContext.Provider value={api}>{children}</PrefsContext.Provider>
}

export function usePrefs(): PrefsApi {
  const ctx = useContext(PrefsContext)
  if (!ctx) throw new Error('usePrefs requiere PrefsProvider')
  return ctx
}
