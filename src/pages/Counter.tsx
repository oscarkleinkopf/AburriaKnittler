import { useEffect, useRef, useState } from 'react'
import { BigButton } from '../components/BigButton'

const STORAGE_KEY = 'aburriaknittler.rowCount'

function readStoredCount(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw == null) return 0
    const n = Number.parseInt(raw, 10)
    return Number.isFinite(n) && n >= 0 ? n : 0
  } catch {
    return 0
  }
}

export function CounterPage() {
  const [count, setCount] = useState(readStoredCount)
  const [bump, setBump] = useState(false)
  const bumpTimer = useRef<number | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(count))
    } catch {
      // ignore quota / private mode
    }
  }, [count])

  function triggerBump() {
    setBump(false)
    window.requestAnimationFrame(() => {
      setBump(true)
      if (bumpTimer.current) window.clearTimeout(bumpTimer.current)
      bumpTimer.current = window.setTimeout(() => setBump(false), 280)
    })
  }

  function increment() {
    setCount((c) => c + 1)
    triggerBump()
  }

  function decrement() {
    setCount((c) => Math.max(0, c - 1))
    triggerBump()
  }

  function reset() {
    setCount(0)
    triggerBump()
  }

  return (
    <section className="stack animate-enter" aria-labelledby="counter-title">
      <div>
        <h1 id="counter-title" className="page-title">
          Contador de vueltas
        </h1>
        <p className="page-lead">
          Un toque por fila. Se guarda en este dispositivo, también sin
          conexión.
        </p>
      </div>

      <div className="counter-display">
        <div className="counter-display__label" id="row-label">
          Vuelta actual
        </div>
        <div
          className={`counter-display__value${bump ? ' animate-bump' : ''}`}
          aria-labelledby="row-label"
          aria-live="polite"
          aria-atomic="true"
        >
          {count}
        </div>
      </div>

      <div className="counter-actions">
        <BigButton variant="primary" onClick={increment} aria-label="Sumar una vuelta">
          +1 vuelta
        </BigButton>
        <BigButton
          variant="secondary"
          onClick={decrement}
          aria-label="Restar una vuelta"
          disabled={count === 0}
        >
          −1
        </BigButton>
        <BigButton
          variant="ghost"
          onClick={reset}
          aria-label="Reiniciar contador"
          disabled={count === 0}
        >
          Reiniciar
        </BigButton>
      </div>
    </section>
  )
}
