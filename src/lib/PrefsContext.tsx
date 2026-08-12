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
  applyFontScale,
  loadAlertPrefs,
  loadFontScale,
  saveAlertPrefs,
  saveFontScale,
  stepFontScale,
  type AlertPrefs,
  type FontScale,
} from './prefs'

type PrefsApi = {
  fontScale: FontScale
  biggerText: () => void
  smallerText: () => void
  resetText: () => void
  alerts: AlertPrefs
  setAlertSound: (on: boolean) => void
  setAlertVibrate: (on: boolean) => void
}

const PrefsContext = createContext<PrefsApi | null>(null)

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [fontScale, setFontScale] = useState<FontScale>(() => loadFontScale())
  const [alerts, setAlerts] = useState<AlertPrefs>(() => loadAlertPrefs())

  useEffect(() => {
    applyFontScale(fontScale)
    saveFontScale(fontScale)
  }, [fontScale])

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
      alerts,
      setAlertSound,
      setAlertVibrate,
    }),
    [
      fontScale,
      biggerText,
      smallerText,
      resetText,
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
