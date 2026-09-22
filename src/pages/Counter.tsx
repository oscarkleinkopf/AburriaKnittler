import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Banner } from '../components/Banner'
import { BigButton } from '../components/BigButton'
import { LongSessionBanner } from '../components/LongSessionBanner'
import { CounterControls } from '../components/counter/CounterControls'
import { CounterDisplay } from '../components/counter/CounterDisplay'
import { CounterGoalProgress } from '../components/counter/CounterGoalProgress'
import { ErgonomicsModal } from '../components/counter/ErgonomicsModal'
import { KeyboardShortcutsModal } from '../components/counter/KeyboardShortcutsModal'
import { LeaveNoteEditor } from '../components/counter/LeaveNoteEditor'
import { MotifRepeatCounter } from '../components/counter/MotifRepeatCounter'
import { NamedMarkersList } from '../components/counter/NamedMarkersList'
import { SessionHistoryView } from '../components/counter/SessionHistoryView'
import { usePrefs } from '../lib/PrefsContext'
import { useProjects } from '../lib/ProjectsContext'
import { vibrateBrief } from '../lib/prefs'
import {
  formatDuration,
  formatGauge,
  formatRelativeDate,
  goalProgress,
  justReachedGoal,
  namedMarkerAt,
  nextPendingPatternStep,
  patternStepForRow,
  patternStepToSpeech,
  sessionMsToday,
  totalSessionMs,
} from '../lib/projects'
import { playGoalBeep, playMarkerBeep } from '../lib/sound'
import { canSpeak, speakText, stopSpeaking } from '../lib/speech'
import { useHoldRepeat } from '../lib/useHoldRepeat'
import { useWakeLock } from '../lib/useWakeLock'

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
    updateProject,
  } = useProjects()
  const { alerts, setAlertSound, setAlertVibrate, setSpeakStep } = usePrefs()
  const [bump, setBump] = useState(false)
  const [markerHit, setMarkerHit] = useState<string | null>(null)
  const [goalHit, setGoalHit] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [showAllSessions, setShowAllSessions] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showErgoModal, setShowErgoModal] = useState(false)
  const lastErgoAlert = useRef<number>(Date.now())
  const bumpTimer = useRef<number | null>(null)
  const markerId = useId()
  const soundId = useId()
  const vibeId = useId()
  const speakId = useId()
  const locked = Boolean(active?.tapsLocked)
  const prevRows = useRef(active?.rows ?? 0)
  const speakTimer = useRef<number | null>(null)

  const triggerBump = useCallback(() => {
    setBump(false)
    window.requestAnimationFrame(() => {
      setBump(true)
      if (bumpTimer.current) window.clearTimeout(bumpTimer.current)
      bumpTimer.current = window.setTimeout(() => setBump(false), 280)
    })
  }, [])

  const rowHold = useHoldRepeat({
    onStep: (n) => {
      if (locked) return
      bumpRows(n)
      triggerBump()
    },
  })
  const rowHoldDown = useHoldRepeat({
    tapAmount: -1,
    holdAmount: -5,
    repeatAmount: -10,
    onStep: (n) => {
      if (locked) return
      bumpRows(n)
      triggerBump()
    },
  })
  const stitchHold = useHoldRepeat({
    onStep: (n) => {
      if (locked) return
      bumpStitches(n)
    },
  })
  const stitchHoldDown = useHoldRepeat({
    tapAmount: -1,
    holdAmount: -5,
    repeatAmount: -10,
    onStep: (n) => {
      if (locked) return
      bumpStitches(n)
    },
  })

  useWakeLock(Boolean(active?.timerStartedAt))

  useEffect(() => {
    markOpened()
  }, [active?.id, markOpened])

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const activeSessionMinutes = active?.timerStartedAt
    ? Math.max(0, (now - Date.parse(active.timerStartedAt)) / 60000)
    : 0

  useEffect(() => {
    if (
      active?.timerStartedAt &&
      activeSessionMinutes >= 45 &&
      now - lastErgoAlert.current > 40 * 60 * 1000
    ) {
      setShowErgoModal(true)
      lastErgoAlert.current = now
    }
  }, [active?.timerStartedAt, activeSessionMinutes, now])

  useEffect(() => {
    return () => stopSpeaking()
  }, [])

  // Revisar avisos de meta o marcador al cambiar vueltas
  useEffect(() => {
    if (!active) return
    const prev = prevRows.current
    const curr = active.rows
    prevRows.current = curr

    if (curr > prev) {
      if (justReachedGoal(prev, curr, active.targetRows)) {
        setGoalHit(true)
        if (alerts.sound) playGoalBeep()
        if (alerts.vibrate) vibrateBrief([120, 80, 200])
      }

      const named = namedMarkerAt(active, curr)
      if (named) {
        setMarkerHit(`Marcador: ${named.label} (fila ${curr})`)
        if (alerts.sound) playMarkerBeep()
        if (alerts.vibrate) vibrateBrief(80)
      } else if (
        active.markerEvery > 0 &&
        curr % active.markerEvery === 0 &&
        curr > 0
      ) {
        setMarkerHit(`Aviso cada ${active.markerEvery} vueltas (vuelta ${curr})`)
        if (alerts.sound) playMarkerBeep()
        if (alerts.vibrate) vibrateBrief(50)
      }

      if (alerts.speakStep) {
        const step = patternStepForRow(active, curr)
        if (step) {
          if (speakTimer.current) window.clearTimeout(speakTimer.current)
          speakTimer.current = window.setTimeout(() => {
            speakText(patternStepToSpeech(step))
          }, 180)
        }
      }
    }
  }, [
    active,
    alerts.sound,
    alerts.vibrate,
    alerts.speakStep,
  ])

  // Atajos de teclado accesibles
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      if (isInput) return

      if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault()
        if (!locked) {
          bumpRows(1)
          triggerBump()
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        if (!locked) {
          bumpRows(-1)
          triggerBump()
        }
      } else if (e.key === 'u' || e.key === 'U') {
        e.preventDefault()
        undoLast()
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault()
        if (active) {
          updateProject(active.id, { tapsLocked: !active.tapsLocked })
        }
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        setFullscreen((prev) => !prev)
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault()
        if (active) {
          const step = patternStepForRow(active, active.rows)
          if (step) {
            speakText(patternStepToSpeech(step))
          }
        }
      } else if (e.key === '?') {
        e.preventDefault()
        setShowShortcuts((prev) => !prev)
      } else if (e.key === 'Escape' && fullscreen) {
        e.preventDefault()
        setFullscreen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [locked, bumpRows, triggerBump, undoLast, active, updateProject, fullscreen])

  if (!active) {
    return (
      <div className="page page--counter">
        <Banner tone="info">
          No hay ningún proyecto activo. Ve a{' '}
          <Link to="/proyectos">Proyectos</Link> para crear o elegir uno.
        </Banner>
      </div>
    )
  }

  const currentStep = patternStepForRow(active, active.rows)
  const nextPending = nextPendingPatternStep(active)
  const progress = goalProgress(active)
  const canUndo = active.history.length > 0
  const gaugeText = formatGauge(active)

  return (
    <div
      className={`page page--counter ${
        fullscreen ? 'page--counter-fullscreen' : ''
      }`}
    >
      <LongSessionBanner project={active} onStop={stopTimer} />

      <header className="page-header page-header--compact" hidden={fullscreen}>
        <div className="page-header__main">
          <h1 id="counter-title" className="page-title">
            Contador
          </h1>
          <p className="page-lead">{active.name}</p>
          {gaugeText && <p className="page-meta">{gaugeText}</p>}
        </div>
        <div className="counter-session-badge">
          <button
            type="button"
            className={`timer-toggle-btn ${
              active.timerStartedAt ? 'timer-toggle-btn--active' : ''
            }`}
            onClick={() => (active.timerStartedAt ? stopTimer() : startTimer())}
            aria-label={
              active.timerStartedAt
                ? 'Pausar temporizador de sesión'
                : 'Iniciar temporizador de sesión'
            }
          >
            {active.timerStartedAt ? '⏱ Tejiendo' : '▶ Iniciar sesión'}
          </button>
          <button
            type="button"
            className="ergo-trigger-btn"
            onClick={() => setShowErgoModal(true)}
            aria-label="Pausa ergonómica y estiramientos"
          >
            🧘 Pausa
          </button>
          <span className="timer-text">
            {formatDuration(totalSessionMs(active))}
            <small className="timer-subtext">
              {' '}(hoy: {formatDuration(sessionMsToday(active, new Date(now)))})
            </small>
          </span>
        </div>
      </header>

      {markerHit && (
        <Banner tone="info">
          <div className="banner__inline-wrap">
            <span>{markerHit}</span>
            <button
              type="button"
              className="banner-close-btn"
              onClick={() => setMarkerHit(null)}
              aria-label="Cerrar aviso de marcador"
            >
              ✕
            </button>
          </div>
        </Banner>
      )}

      <CounterDisplay
        rows={active.rows}
        stitches={active.stitches}
        bump={bump}
        locked={locked}
        fullscreen={fullscreen}
        currentStep={currentStep}
        onToggleFullscreen={() => setFullscreen((prev) => !prev)}
      />

      <CounterControls
        locked={locked}
        canUndo={canUndo}
        rowHoldProps={rowHold}
        rowHoldDownProps={rowHoldDown}
        stitchHoldProps={stitchHold}
        stitchHoldDownProps={stitchHoldDown}
        onToggleLock={() =>
          updateProject(active.id, { tapsLocked: !active.tapsLocked })
        }
        onUndo={undoLast}
        onReset={() => {
          if (window.confirm('¿Reiniciar vueltas y puntos a 0?')) {
            resetCounters()
          }
        }}
        onShowShortcuts={() => setShowShortcuts(true)}
      />

      <CounterGoalProgress
        progress={progress}
        targetRows={active.targetRows}
        goalHit={goalHit}
        onSetTargetRows={setTargetRows}
      />

      <MotifRepeatCounter
        project={active}
        onUpdate={(patch) => updateProject(active.id, patch)}
      />

      <LeaveNoteEditor
        note={active.leaveNote}
        onSave={(note) => updateProject(active.id, { leaveNote: note })}
      />

      {active.photoDataUrl && (
        <section className="counter-photo" aria-label="Foto del tejido">
          <img
            src={active.photoDataUrl}
            alt={`Foto de ${active.name}`}
            className="counter-photo__img"
          />
        </section>
      )}

      {nextPending && (
        <section className="counter-next-step" aria-label="Siguiente paso">
          <div className="counter-next-step__head">
            <h3>Siguiente instrucción</h3>
            {canSpeak() && (
              <button
                type="button"
                className="step-speak-btn"
                disabled={speaking}
                onClick={() => {
                  setSpeaking(true)
                  speakText(patternStepToSpeech(nextPending))
                  window.setTimeout(() => setSpeaking(false), 2000)
                }}
                aria-label="Leer siguiente paso en voz alta"
              >
                {speaking ? '🔊 Leyendo...' : '🗣 Escuchar'}
              </button>
            )}
          </div>
          <div className="counter-next-step__card">
            <span className="step-badge">Fila {nextPending.row}</span>
            <p className="step-text">{nextPending.instruction}</p>
            <BigButton
              type="button"
              variant="secondary"
              onClick={() => togglePatternStep(nextPending.id)}
            >
              ✓ Marcar como hecha
            </BigButton>
          </div>
        </section>
      )}

      <NamedMarkersList
        markers={active.namedMarkers}
        currentRow={active.rows}
        onAddMarker={addNamedMarker}
        onRemoveMarker={removeNamedMarker}
      />

      <section className="counter-settings" aria-label="Avisos y accesibilidad">
        <h3 className="section-title">Avisos y voz</h3>
        <div className="settings-grid">
          <div className="field-checkbox">
            <input
              id={soundId}
              type="checkbox"
              checked={alerts.sound}
              onChange={(e) => setAlertSound(e.target.checked)}
            />
            <label htmlFor={soundId}>Sonido suave al llegar a marcas/meta</label>
          </div>

          <div className="field-checkbox">
            <input
              id={vibeId}
              type="checkbox"
              checked={alerts.vibrate}
              onChange={(e) => setAlertVibrate(e.target.checked)}
            />
            <label htmlFor={vibeId}>Vibración breve al sumar</label>
          </div>

          {canSpeak() && (
            <div className="field-checkbox">
              <input
                id={speakId}
                type="checkbox"
                checked={alerts.speakStep}
                onChange={(e) => setSpeakStep(e.target.checked)}
              />
              <label htmlFor={speakId}>
                Leer la instrucción al avanzar de vuelta
              </label>
            </div>
          )}

          <div className="field">
            <label htmlFor={markerId}>Aviso automático cada N vueltas:</label>
            <input
              id={markerId}
              type="number"
              min="0"
              max="500"
              value={active.markerEvery > 0 ? String(active.markerEvery) : ''}
              onChange={(e) => {
                const n = Number.parseInt(e.target.value, 10)
                setMarkerEvery(Number.isFinite(n) && n > 0 ? n : 0)
              }}
              placeholder="0 (desactivado)"
            />
          </div>
        </div>
      </section>

      {active.sessions.length > 0 && (
        <section className="counter-history-section" aria-label="Historial de sesiones">
          <h3 className="section-title">Historial de sesiones</h3>
          <SessionHistoryView
            sessions={active.sessions}
            showAll={showAllSessions}
            onToggleShowAll={() => setShowAllSessions((prev) => !prev)}
          />
        </section>
      )}

      <footer className="counter-footer">
        <p className="last-saved">
          Última actualización: {formatRelativeDate(active.updatedAt)}
        </p>
      </footer>

      <KeyboardShortcutsModal
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />

      <ErgonomicsModal
        isOpen={showErgoModal}
        sessionMinutes={activeSessionMinutes}
        onClose={() => setShowErgoModal(false)}
        onRestCompleted={() => {
          lastErgoAlert.current = Date.now()
        }}
      />
    </div>
  )
}
