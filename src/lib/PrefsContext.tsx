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
  loadFontScale,
  saveFontScale,
  stepFontScale,
  type FontScale,
} from './prefs'

type PrefsApi = {
  fontScale: FontScale
  biggerText: () => void
  smallerText: () => void
  resetText: () => void
}

const PrefsContext = createContext<PrefsApi | null>(null)

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [fontScale, setFontScale] = useState<FontScale>(() => loadFontScale())

  useEffect(() => {
    applyFontScale(fontScale)
    saveFontScale(fontScale)
  }, [fontScale])

  const biggerText = useCallback(() => {
    setFontScale((s) => stepFontScale(s, 1))
  }, [])

  const smallerText = useCallback(() => {
    setFontScale((s) => stepFontScale(s, -1))
  }, [])

  const resetText = useCallback(() => {
    setFontScale(1)
  }, [])

  const api = useMemo(
    () => ({ fontScale, biggerText, smallerText, resetText }),
    [fontScale, biggerText, smallerText, resetText],
  )

  return <PrefsContext.Provider value={api}>{children}</PrefsContext.Provider>
}

export function usePrefs(): PrefsApi {
  const ctx = useContext(PrefsContext)
  if (!ctx) throw new Error('usePrefs requiere PrefsProvider')
  return ctx
}
