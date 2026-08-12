import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Banner } from '../components/Banner'
import { BigButton } from '../components/BigButton'
import { useProjects } from '../lib/ProjectsContext'
import { formatRelativeDate } from '../lib/projects'

function playMarkerBeep() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.value = 0.08
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35)
    osc.stop(ctx.currentTime + 0.4)
    window.setTimeout(() => void ctx.close(), 500)
  } catch {
    // audio optional
  }
}

export function CounterPage() {
  const {
    active,
    bumpRows,
    bumpStitches,
    resetCounters,
    setMarkerEvery,
  } = useProjects()
  const [bump, setBump] = useState(false)
  const [markerHit, setMarkerHit] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const bumpTimer = useRef<number | null>(null)
  const markerId = useId()
  const prevRows = useRef(active?.rows ?? 0)

  useEffect(() => {
    prevRows.current = active?.rows ?? 0
    setMarkerHit(false)
  }, [active?.id])

  useEffect(() => {
    if (!active) return
    const prev = prevRows.current
    const next = active.rows
    prevRows.current = next
    if (
      active.markerEvery > 0 &&
      next > prev &&
      next % active.markerEvery === 0
    ) {
      setMarkerHit(true)
      playMarkerBeep()
      window.setTimeout(() => setMarkerHit(false), 2500)
    }
  }, [active, active?.rows, active?.markerEvery])

  useEffect(() => {
    if (!fullscreen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [fullscreen])

  function triggerBump() {
    setBump(false)
    window.requestAnimationFrame(() => {
      setBump(true)
      if (bumpTimer.current) window.clearTimeout(bumpTimer.current)
      bumpTimer.current = window.setTimeout(() => setBump(false), 280)
    })
  }

  if (!active) {
    return (
      <section className="stack animate-enter">
        <Banner tone="warn">
          No hay proyecto activo.{' '}
          <Link to="/proyectos">Crea uno en Proyectos</Link>.
        </Banner>
      </section>
    )
  }

  return (
    <>
      <section
        className="stack animate-enter"
        aria-labelledby="counter-title"
        hidden={fullscreen}
      >
        <div>
          <h1 id="counter-title" className="page-title">
            Contador
          </h1>
          <p className="page-lead">
            Proyecto: <strong>{active.name}</strong>. Vueltas y puntos se
            guardan solos, también sin conexión.
          </p>
        </div>

        {markerHit && (
          <Banner tone="info" role="alert">
            Marcador: llegada a la vuelta {active.rows} (cada{' '}
            {active.markerEvery}).
          </Banner>
        )}

        <div className="counter-grid">
          <div className="counter-display">
            <div className="counter-display__label" id="row-label">
              Vuelta
            </div>
            <div
              className={`counter-display__value${bump ? ' animate-bump' : ''}`}
              aria-labelledby="row-label"
              aria-live="polite"
              aria-atomic="true"
            >
              {active.rows}
            </div>
            <div className="counter-mini-actions">
              <BigButton
                variant="primary"
                onClick={() => {
                  bumpRows(1)
                  triggerBump()
                }}
                aria-label="Sumar una vuelta"
              >
                +1 vuelta
              </BigButton>
              <BigButton
                variant="secondary"
                onClick={() => {
                  bumpRows(-1)
                  triggerBump()
                }}
                aria-label="Restar una vuelta"
                disabled={active.rows === 0}
              >
                −1
              </BigButton>
            </div>
          </div>

          <div className="counter-display counter-display--secondary">
            <div className="counter-display__label" id="stitch-label">
              Punto en la vuelta
            </div>
            <div
              className={`counter-display__value counter-display__value--sm${bump ? ' animate-bump' : ''}`}
              aria-labelledby="stitch-label"
              aria-live="polite"
              aria-atomic="true"
            >
              {active.stitches}
            </div>
            <div className="counter-mini-actions">
              <BigButton
                variant="secondary"
                onClick={() => {
                  bumpStitches(1)
                  triggerBump()
                }}
                aria-label="Sumar un punto"
              >
                +1 punto
              </BigButton>
              <BigButton
                variant="ghost"
                onClick={() => {
                  bumpStitches(-1)
                  triggerBump()
                }}
                aria-label="Restar un punto"
                disabled={active.stitches === 0}
              >
                −1
              </BigButton>
            </div>
          </div>
        </div>

        <BigButton
          variant="secondary"
          block
          onClick={() => setFullscreen(true)}
        >
          Pantalla completa
        </BigButton>

        <div className="field">
          <label htmlFor={markerId}>Avisar cada N vueltas (0 = no)</label>
          <input
            id={markerId}
            type="number"
            min={0}
            max={999}
            inputMode="numeric"
            value={active.markerEvery}
            onChange={(e) => {
              const n = Number.parseInt(e.target.value, 10)
              setMarkerEvery(Number.isFinite(n) ? n : 0)
            }}
          />
        </div>

        <BigButton
          variant="ghost"
          block
          onClick={() => {
            resetCounters()
            triggerBump()
          }}
          disabled={active.rows === 0 && active.stitches === 0}
          aria-label="Reiniciar contadores"
        >
          Reiniciar vueltas y puntos
        </BigButton>

        <div className="history">
          <h2 className="section-title">Historial reciente</h2>
          {active.history.length === 0 ? (
            <p className="muted">Aún no hay movimientos registrados.</p>
          ) : (
            <ol className="history__list">
              {active.history.slice(0, 12).map((h) => (
                <li key={`${h.at}-${h.rows}-${h.stitches}`}>
                  <span>{formatRelativeDate(h.at)}</span>
                  <span>
                    Vuelta {h.rows} · Punto {h.stitches}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <BigButton to="/proyectos" variant="secondary" block>
          Cambiar de proyecto
        </BigButton>
      </section>

      {fullscreen && (
        <div
          className="counter-fs"
          role="dialog"
          aria-modal="true"
          aria-label="Contador a pantalla completa"
        >
          <p className="counter-fs__project">{active.name}</p>
          {markerHit && (
            <p className="counter-fs__marker" role="alert">
              Marcador: vuelta {active.rows}
            </p>
          )}
          <div className="counter-fs__grid">
            <div>
              <div className="counter-fs__label">Vuelta</div>
              <div
                className={`counter-fs__value${bump ? ' animate-bump' : ''}`}
                aria-live="polite"
              >
                {active.rows}
              </div>
              <div className="counter-fs__actions">
                <button
                  type="button"
                  className="counter-fs__btn counter-fs__btn--primary"
                  onClick={() => {
                    bumpRows(1)
                    triggerBump()
                  }}
                >
                  +1 vuelta
                </button>
                <button
                  type="button"
                  className="counter-fs__btn"
                  onClick={() => {
                    bumpRows(-1)
                    triggerBump()
                  }}
                  disabled={active.rows === 0}
                >
                  −1
                </button>
              </div>
            </div>
            <div>
              <div className="counter-fs__label">Punto</div>
              <div
                className={`counter-fs__value counter-fs__value--sm${bump ? ' animate-bump' : ''}`}
                aria-live="polite"
              >
                {active.stitches}
              </div>
              <div className="counter-fs__actions">
                <button
                  type="button"
                  className="counter-fs__btn counter-fs__btn--primary"
                  onClick={() => {
                    bumpStitches(1)
                    triggerBump()
                  }}
                >
                  +1 punto
                </button>
                <button
                  type="button"
                  className="counter-fs__btn"
                  onClick={() => {
                    bumpStitches(-1)
                    triggerBump()
                  }}
                  disabled={active.stitches === 0}
                >
                  −1
                </button>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="counter-fs__close"
            onClick={() => setFullscreen(false)}
          >
            Cerrar pantalla completa
          </button>
        </div>
      )}
    </>
  )
}
