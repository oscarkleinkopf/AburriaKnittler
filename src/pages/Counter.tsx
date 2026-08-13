import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Banner } from '../components/Banner'
import { BigButton } from '../components/BigButton'
import { usePrefs } from '../lib/PrefsContext'
import { useProjects } from '../lib/ProjectsContext'
import { vibrateBrief } from '../lib/prefs'
import {
  currentPatternStep,
  formatDuration,
  formatRelativeDate,
  sessionMsToday,
  totalSessionMs,
} from '../lib/projects'
import { useHoldRepeat } from '../lib/useHoldRepeat'

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
    startTimer,
    stopTimer,
    markOpened,
  } = useProjects()
  const { alerts, setAlertSound, setAlertVibrate } = usePrefs()
  const [bump, setBump] = useState(false)
  const [markerHit, setMarkerHit] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const bumpTimer = useRef<number | null>(null)
  const markerId = useId()
  const soundId = useId()
  const vibeId = useId()
  const prevRows = useRef(active?.rows ?? 0)

  function triggerBump() {
    setBump(false)
    window.requestAnimationFrame(() => {
      setBump(true)
      if (bumpTimer.current) window.clearTimeout(bumpTimer.current)
      bumpTimer.current = window.setTimeout(() => setBump(false), 280)
    })
  }

  const rowHold = useHoldRepeat({
    onStep: (n) => {
      bumpRows(n)
      triggerBump()
    },
  })
  const stitchHold = useHoldRepeat({
    onStep: (n) => {
      bumpStitches(n)
      triggerBump()
    },
  })

  useEffect(() => {
    markOpened()
  }, [active?.id, markOpened])

  useEffect(() => {
    if (!active?.timerStartedAt) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [active?.timerStartedAt])

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
      if (alerts.sound) playMarkerBeep()
      if (alerts.vibrate) vibrateBrief([50, 40, 50, 40, 80])
      window.setTimeout(() => setMarkerHit(false), 2500)
    }
  }, [active, active?.rows, active?.markerEvery, alerts.sound, alerts.vibrate])

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
            Proyecto: <strong>{active.name}</strong>. Un toque suma 1; mantén
            pulsado para +5 y luego +10.
          </p>
        </div>

        {markerHit && (
          <Banner tone="info" role="alert">
            Marcador: llegada a la vuelta {active.rows} (cada{' '}
            {active.markerEvery}).
          </Banner>
        )}

        {(() => {
          const step = currentPatternStep(active)
          if (!step) return null
          return (
            <Banner tone="info">
              Patrón — fila {step.row}: {step.instruction}{' '}
              <Link to="/patron">Ver patrón</Link>
            </Banner>
          )
        })()}

        <div className="timer-panel">
          <h2 className="section-title">Sesión de tejido</h2>
          <p className="timer-panel__time" aria-live="polite">
            {active.timerStartedAt
              ? formatDuration(
                  Math.max(
                    0,
                    now - Date.parse(active.timerStartedAt),
                  ),
                )
              : '0s'}
            {active.timerStartedAt ? ' · en curso' : ' · parado'}
          </p>
          <p className="muted">
            Hoy {formatDuration(sessionMsToday(active))} · total{' '}
            {formatDuration(totalSessionMs(active))}
          </p>
          <div className="row-actions">
            {!active.timerStartedAt ? (
              <BigButton type="button" variant="primary" onClick={startTimer}>
                Empezar tiempo
              </BigButton>
            ) : (
              <BigButton type="button" variant="secondary" onClick={stopTimer}>
                Pausar / guardar
              </BigButton>
            )}
          </div>
          {active.sessions.length > 0 && (
            <ol className="history__list">
              {active.sessions.slice(0, 5).map((s) => (
                <li key={s.id}>
                  <span>{formatRelativeDate(s.endedAt)}</span>
                  <span>{formatDuration(s.durationMs)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

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
                aria-label="Sumar vueltas. Mantén pulsado para sumar más rápido"
                {...rowHold}
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
                aria-label="Sumar puntos. Mantén pulsado para sumar más rápido"
                {...stitchHold}
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

        <fieldset className="alert-prefs">
          <legend className="section-title">Avisos del marcador</legend>
          <label className="backup-mode" htmlFor={soundId}>
            <input
              id={soundId}
              type="checkbox"
              checked={alerts.sound}
              onChange={(e) => setAlertSound(e.target.checked)}
            />
            Sonido
          </label>
          <label className="backup-mode" htmlFor={vibeId}>
            <input
              id={vibeId}
              type="checkbox"
              checked={alerts.vibrate}
              onChange={(e) => setAlertVibrate(e.target.checked)}
            />
            Vibración (si el móvil la permite)
          </label>
        </fieldset>

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
      <BigButton to="/patron" variant="ghost" block>
          Patrón por filas
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
                  aria-label="Sumar vueltas. Mantén pulsado para sumar más rápido"
                  {...rowHold}
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
                  aria-label="Sumar puntos. Mantén pulsado para sumar más rápido"
                  {...stitchHold}
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
