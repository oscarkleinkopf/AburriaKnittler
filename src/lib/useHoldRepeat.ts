import { useCallback, useRef, type PointerEvent, type SyntheticEvent } from 'react'

type Options = {
  onStep: (amount: number) => void
  /** Incremento al soltar sin haber mantenido. */
  tapAmount?: number
  holdAmount?: number
  repeatAmount?: number
  holdDelayMs?: number
  repeatEveryMs?: number
}

/**
 * Clic = tapAmount (1 o −1). Mantener: holdAmount, luego repeatAmount.
 */
export function useHoldRepeat({
  onStep,
  tapAmount = 1,
  holdAmount = 5,
  repeatAmount = 10,
  holdDelayMs = 480,
  repeatEveryMs = 420,
}: Options) {
  const timers = useRef<{
    delay?: number
    repeat?: number
    armed?: boolean
  }>({})
  const onStepRef = useRef(onStep)
  onStepRef.current = onStep

  const clear = useCallback(() => {
    if (timers.current.delay) window.clearTimeout(timers.current.delay)
    if (timers.current.repeat) window.clearInterval(timers.current.repeat)
    timers.current = {}
  }, [])

  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return
      e.currentTarget.setPointerCapture(e.pointerId)
      timers.current.armed = false
      clear()
      timers.current.delay = window.setTimeout(() => {
        timers.current.armed = true
        onStepRef.current(holdAmount)
        timers.current.repeat = window.setInterval(() => {
          onStepRef.current(repeatAmount)
        }, repeatEveryMs)
      }, holdDelayMs)
    },
    [clear, holdAmount, holdDelayMs, repeatAmount, repeatEveryMs],
  )

  const onPointerUp = useCallback(
    (e: PointerEvent<HTMLButtonElement>) => {
      const wasHold = Boolean(timers.current.armed)
      clear()
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        // ignore
      }
      if (!wasHold) onStepRef.current(tapAmount)
    },
    [clear, tapAmount],
  )

  const onPointerCancel = useCallback(() => {
    clear()
  }, [clear])

  const onContextMenu = useCallback((e: SyntheticEvent) => {
    e.preventDefault()
  }, [])

  return {
    onPointerDown,
    onPointerUp,
    onPointerCancel,
    onContextMenu,
  }
}
