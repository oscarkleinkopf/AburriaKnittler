import { useEffect } from 'react'

/**
 * Mantiene la pantalla encendida mientras se teje (temporizador o
 * pantalla completa). Si el navegador no lo permite, no hace nada.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return

    let lock: WakeLockSentinel | null = null
    let cancelled = false

    async function request() {
      try {
        const next = await navigator.wakeLock.request('screen')
        if (cancelled) {
          await next.release()
          return
        }
        lock = next
      } catch {
        // denegado, pestaña en segundo plano, etc.
      }
    }

    void request()

    const onVisibility = () => {
      if (cancelled) return
      if (document.visibilityState === 'visible') void request()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      void lock?.release()
    }
  }, [active])
}
