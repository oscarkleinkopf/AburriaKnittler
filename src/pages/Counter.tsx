import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Banner } from '../components/Banner'
import { BigButton } from '../components/BigButton'
import { LongSessionBanner } from '../components/LongSessionBanner'
import { usePrefs } from '../lib/PrefsContext'
import { useProjects } from '../lib/ProjectsContext'
import { vibrateBrief } from '../lib/prefs'
import {
  currentPatternStep,
  formatClock,
  formatDuration,
  formatRelativeDate,
  goalProgress,
  groupSessionsByDay,
  namedMarkerAt,
  patternStepToSpeech,
  sessionMsToday,
  totalSessionMs,
  type KnitSession,
} from '../lib/projects'
import { canSpeak, speakText, stopSpeaking } from '../lib/speech'
import { useHoldRepeat } from '../lib/useHoldRepeat'
import { useWakeLock } from '../lib/useWakeLock'

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

const SESSION_PREVIEW = 8

function SessionHistory({
  sessions,
  showAll,
  onToggle,
}: {
  sessions: KnitSession[]
  showAll: boolean
  onToggle: () => void
}) {
  const visible = showAll ? sessions : sessions.slice(0, SESSION_PREVIEW)
  const groups = groupSessionsByDay(visible)
  const hidden = Math.max(0, sessions.length - SESSION_PREVIEW)

  return (
    <div className="session-history">
      {groups.map((group) => (
        <section key={group.dayKey} className="session-day">
          <h3 className="session-day__head">
            <span>{group.label}</span>
            <span>{formatDuration(group.totalMs)}</span>
          </h3>
          <ol className="session-day__list">
            {group.sessions.map((s) => (
              <li key={s.id}>
                <span>
                  {formatClock(s.startedAt)}–{formatClock(s.endedAt)}
                </span>
                <span>{formatDuration(s.durationMs)}</span>
              </li>
            ))}
          </ol>
        </section>
      ))}
      {hidden > 0 && (
        <BigButton
          type="button"
          variant="ghost"
          className="session-history__more"
          onClick={onToggle}
        >
          {showAll
            ? 'Ver menos'
            : `Ver todas (${hidden} más)`}
        </BigButton>
      )}
    </div>
  )
}

export function CounterPage() {
  const {
    active,
    bumpRows,
    bumpStitches,
    undoLast,
    resetCounters,
    setMarkerEvery,
    setTargetRows,
    addNamedMarker,
    removeNamedMarker,
    startTimer,
    stopTimer,
    markOpened,
    togglePatternStep,
  } = useProjects()
  const { alerts, setAlertSound, setAlertVibrate } = usePrefs()
  const [bump, setBump] = useState(false)
  const [markerHit, setMarkerHit] = useState<string | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [showAllSessions, setShowAllSessions] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [markerLabel, setMarkerLabel] = useState('')
  const [markerRow, setMarkerRow] = useState('')
  const bumpTimer = useRef<number | null>(null)
  const markerId = useId()
  const targetId = useId()
  const namedRowId = useId()
  const namedLabelId = useId()
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
  const rowHoldDown = useHoldRepeat({
    tapAmount: -1,
    holdAmount: -5,
    repeatAmount: -10,
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
  const stitchHoldDown = useHoldRepeat({
    tapAmount: -1,
    holdAmount: -5,
    repeatAmount: -10,
    onStep: (n) => {
      bumpStitches(n)
      triggerBump()
    },
  })

  function onUndo() {
    undoLast()
    triggerBump()
  }

  useWakeLock(Boolean(active?.timerStartedAt) || fullscreen)

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
    setMarkerHit(null)
  }, [active?.id])

  useEffect(() => {
    if (!active) return
    const prev = prevRows.current
    const next = active.rows
    prevRows.current = next
    if (next <= prev) return
    const named = namedMarkerAt(active, next)
    const every =
      active.markerEvery > 0 && next % active.markerEvery === 0
    if (!named && !every) return
    const bits = [
      named ? named.label : null,
      every ? `cada ${active.markerEvery}` : null,
    ].filter(Boolean)
    setMarkerHit(`Marcador: vuelta ${next} (${bits.join(' · ')})`)
    if (alerts.sound) playMarkerBeep()
    if (alerts.vibrate) vibrateBrief([50, 40, 50, 40, 80])
    window.setTimeout(() => setMarkerHit(null), 2500)
  }, [active, active?.rows, active?.markerEvery, active?.namedMarkers, alerts.sound, alerts.vibrate])

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

  useEffect(() => {
    return () => stopSpeaking()
  }, [])

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
            Proyecto: <strong>{active.name}</strong>. Un toque suma o resta 1;
            mantén pulsado para ±5 y luego ±10.
          </p>
          {active.notes.trim() ? (
            <p className="project-notes-preview">{active.notes}</p>
          ) : null}
        </div>

        <LongSessionBanner
          project={active}
          now={now}
          onStop={stopTimer}
        />

        {markerHit && (
          <Banner tone="info" role="alert">
            {markerHit}
          </Banner>
        )}

        {(() => {
          const step = currentPatternStep(active)
          if (!step) return null
          return (
            <Banner tone="info">
              <span>
                Patrón — fila {step.row}: {step.instruction}
              </span>
              <span className="banner__actions">
                <BigButton
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    togglePatternStep(step.id)
                  }}
                >
                  Marcar hecha
                </BigButton>
                {canSpeak() && (
                  <BigButton
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      if (speaking) {
                        stopSpeaking()
                        setSpeaking(false)
                        return
                      }
                      speakText(patternStepToSpeech(step))
                      setSpeaking(true)
                    }}
                  >
                    {speaking ? 'Detener' : 'Leer paso'}
                  </BigButton>
                )}
                <BigButton to="/patron" variant="ghost">
                  Ver patrón
                </BigButton>
              </span>
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
          {(() => {
            const goal = goalProgress(active)
            if (!goal) return null
            return (
              <div className="goal-panel">
                <p className="muted">
                  Meta: vuelta {goal.current} de {goal.target}
                  {goal.done
                    ? ' · hecha'
                    : ` · faltan ${goal.remaining}`}
                </p>
                <div
                  className="goal-bar"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuenow={goal.current}
                  aria-valuemax={goal.target}
                  aria-label="Avance hacia la meta de vueltas"
                >
                  <span
                    className="goal-bar__fill"
                    style={{ width: `${Math.round(goal.ratio * 100)}%` }}
                  />
                </div>
              </div>
            )
          })()}
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
            <SessionHistory
              sessions={active.sessions}
              showAll={showAllSessions}
              onToggle={() => setShowAllSessions((v) => !v)}
            />
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
                aria-label="Restar vueltas. Mantén pulsado para restar más rápido"
                disabled={active.rows === 0}
                {...rowHoldDown}
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
                aria-label="Restar puntos. Mantén pulsado para restar más rápido"
                disabled={active.stitches === 0}
                {...stitchHoldDown}
              >
                −1
              </BigButton>
            </div>
          </div>
        </div>

        <div className="counter-toolbar">
          <BigButton
            variant="secondary"
            onClick={onUndo}
            disabled={active.history.length === 0}
            aria-label="Deshacer el último cambio del contador"
          >
            Deshacer
          </BigButton>
          <BigButton
            variant="secondary"
            onClick={() => setFullscreen(true)}
          >
            Pantalla completa
          </BigButton>
        </div>

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

        <div className="field">
          <label htmlFor={targetId}>Meta de vueltas (0 = sin meta)</label>
          <input
            id={targetId}
            type="number"
            min={0}
            max={9999}
            inputMode="numeric"
            value={active.targetRows}
            onChange={(e) => {
              const n = Number.parseInt(e.target.value, 10)
              setTargetRows(Number.isFinite(n) ? n : 0)
            }}
          />
        </div>

        <div className="named-markers">
          <h2 className="section-title">Marcadores con nombre</h2>
          <p className="muted">
            Avisa en una vuelta concreta (sisa, elástico, cierre…).
          </p>
          {active.namedMarkers.length > 0 && (
            <ul className="named-markers__list">
              {[...active.namedMarkers]
                .sort((a, b) => a.row - b.row)
                .map((m) => (
                  <li key={m.id}>
                    <span>
                      Vuelta {m.row}: {m.label}
                    </span>
                    <BigButton
                      type="button"
                      variant="ghost"
                      onClick={() => removeNamedMarker(m.id)}
                    >
                      Quitar
                    </BigButton>
                  </li>
                ))}
            </ul>
          )}
          <div className="field">
            <label htmlFor={namedRowId}>Vuelta</label>
            <input
              id={namedRowId}
              type="number"
              min={0}
              inputMode="numeric"
              value={markerRow}
              onChange={(e) => setMarkerRow(e.target.value)}
              placeholder={String(active.rows || 1)}
            />
          </div>
          <div className="field">
            <label htmlFor={namedLabelId}>Nombre</label>
            <input
              id={namedLabelId}
              value={markerLabel}
              onChange={(e) => setMarkerLabel(e.target.value)}
              placeholder="Sisa, elástico…"
            />
          </div>
          <BigButton
            type="button"
            variant="secondary"
            onClick={() => {
              const n = Number.parseInt(markerRow, 10)
              const row = Number.isFinite(n) ? n : active.rows
              addNamedMarker(row, markerLabel)
              setMarkerLabel('')
            }}
            disabled={!markerLabel.trim()}
          >
            Añadir marcador
          </BigButton>
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
            if (
              !window.confirm(
                '¿Poner vueltas y puntos a 0? Puedes deshacer después si te arrepientes.',
              )
            ) {
              return
            }
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
          {(() => {
            const goal = goalProgress(active)
            if (!goal) return null
            return (
              <p className="muted" style={{ textAlign: 'center' }}>
                {goal.current} de {goal.target}
                {goal.done ? ' · meta hecha' : ''}
              </p>
            )
          })()}
          {markerHit && (
            <p className="counter-fs__marker" role="alert">
              {markerHit}
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
                  aria-label="Restar vueltas. Mantén pulsado para restar más rápido"
                  disabled={active.rows === 0}
                  {...rowHoldDown}
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
                  aria-label="Restar puntos. Mantén pulsado para restar más rápido"
                  disabled={active.stitches === 0}
                  {...stitchHoldDown}
                >
                  −1
                </button>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="counter-fs__close"
            onClick={onUndo}
            disabled={active.history.length === 0}
          >
            Deshacer último toque
          </button>
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
