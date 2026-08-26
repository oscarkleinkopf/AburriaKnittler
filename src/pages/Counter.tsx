import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Banner } from '../components/Banner'
import { BigButton } from '../components/BigButton'
import { LongSessionBanner } from '../components/LongSessionBanner'
import { usePrefs } from '../lib/PrefsContext'
import { useProjects } from '../lib/ProjectsContext'
import { vibrateBrief } from '../lib/prefs'
import { playGoalBeep, playMarkerBeep } from '../lib/sound'
import {
  clipLeaveNote,
  clipPieceLabel,
  currentPatternStep,
  DEFAULT_PIECE_LABEL,
  formatClock,
  formatDuration,
  formatGauge,
  formatRelativeDate,
  formatRowSide,
  formatStepRepeat,
  goalProgress,
  groupSessionsByDay,
  hasPiece,
  justReachedGoal,
  MAX_LEAVE_NOTE,
  MAX_PIECE_LABEL,
  namedMarkerAt,
  nextPendingPatternStep,
  patternStepForRow,
  patternStepToSpeech,
  sessionMsToday,
  stepRepeatDone,
  stepRepeatTimes,
  totalSessionMs,
  type KnitSession,
  type SideMode,
} from '../lib/projects'
import { canSpeak, speakText, stopSpeaking } from '../lib/speech'
import { useHoldRepeat } from '../lib/useHoldRepeat'
import { useWakeLock } from '../lib/useWakeLock'

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
    bumpPieceRows,
    bumpPieceStitches,
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
    bumpStepRepeat,
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
  const [markerLabel, setMarkerLabel] = useState('')
  const [markerRow, setMarkerRow] = useState('')
  const bumpTimer = useRef<number | null>(null)
  const markerId = useId()
  const targetId = useId()
  const namedRowId = useId()
  const namedLabelId = useId()
  const soundId = useId()
  const vibeId = useId()
  const speakId = useId()
  const leaveNoteId = useId()
  const pieceLabelId = useId()
  const locked = Boolean(active?.tapsLocked)
  const pieceOn = Boolean(active && hasPiece(active))
  const prevRows = useRef(active?.rows ?? 0)
  const speakTimer = useRef<number | null>(null)

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
      triggerBump()
    },
  })
  const stitchHoldDown = useHoldRepeat({
    tapAmount: -1,
    holdAmount: -5,
    repeatAmount: -10,
    onStep: (n) => {
      if (locked) return
      bumpStitches(n)
      triggerBump()
    },
  })
  const pieceRowHold = useHoldRepeat({
    onStep: (n) => {
      if (locked) return
      bumpPieceRows(n)
      triggerBump()
    },
  })
  const pieceRowHoldDown = useHoldRepeat({
    tapAmount: -1,
    holdAmount: -5,
    repeatAmount: -10,
    onStep: (n) => {
      if (locked) return
      bumpPieceRows(n)
      triggerBump()
    },
  })
  const pieceStitchHold = useHoldRepeat({
    onStep: (n) => {
      if (locked) return
      bumpPieceStitches(n)
      triggerBump()
    },
  })
  const pieceStitchHoldDown = useHoldRepeat({
    tapAmount: -1,
    holdAmount: -5,
    repeatAmount: -10,
    onStep: (n) => {
      if (locked) return
      bumpPieceStitches(n)
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
    setGoalHit(false)
  }, [active?.id])

  useEffect(() => {
    if (!active) return
    const prev = prevRows.current
    const next = active.rows
    prevRows.current = next
    if (next <= prev) {
      if (active.targetRows <= 0 || next < active.targetRows) {
        setGoalHit(false)
      }
      return
    }
    const named = namedMarkerAt(active, next)
    const every =
      active.markerEvery > 0 && next % active.markerEvery === 0
    if (named || every) {
      const bits = [
        named ? named.label : null,
        every ? `cada ${active.markerEvery}` : null,
      ].filter(Boolean)
      setMarkerHit(`Marcador: vuelta ${next} (${bits.join(' · ')})`)
      if (alerts.sound) playMarkerBeep()
      if (alerts.vibrate) vibrateBrief([50, 40, 50, 40, 80])
      window.setTimeout(() => setMarkerHit(null), 2500)
    }
    if (justReachedGoal(prev, next, active.targetRows)) {
      setGoalHit(true)
      if (alerts.sound) playGoalBeep()
      if (alerts.vibrate) vibrateBrief([80, 50, 80, 50, 140])
    }
    if (alerts.speakStep && canSpeak()) {
      const step = currentPatternStep(active)
      if (step) {
        if (speakTimer.current) window.clearTimeout(speakTimer.current)
        speakTimer.current = window.setTimeout(() => {
          speakText(patternStepToSpeech(step))
          setSpeaking(true)
        }, 280)
      }
    }
  }, [active, active?.rows, active?.markerEvery, active?.namedMarkers, active?.targetRows, alerts.sound, alerts.vibrate, alerts.speakStep])

  useEffect(() => {
    if (!fullscreen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (locked) {
        if (active) updateProject(active.id, { tapsLocked: false })
        return
      }
      setFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [fullscreen, locked, active, updateProject])

  useEffect(() => {
    return () => {
      stopSpeaking()
      if (speakTimer.current) window.clearTimeout(speakTimer.current)
    }
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
          {active.photoDataUrl ? (
            <img
              className="counter-photo"
              src={active.photoDataUrl}
              alt={`Foto de ${active.name}`}
            />
          ) : null}
          {active.leaveNote.trim() ? (
            <p className="leave-note-preview">
              Dónde lo dejé: {active.leaveNote}
            </p>
          ) : null}
          {active.notes.trim() ? (
            <p className="project-notes-preview">{active.notes}</p>
          ) : null}
          {formatGauge(active) ? (
            <p className="project-notes-preview">{formatGauge(active)}</p>
          ) : null}
        </div>

        <LongSessionBanner
          project={active}
          now={now}
          onStop={stopTimer}
        />

        {goalHit && (
          <Banner tone="success" role="alert">
            <span>
              Meta alcanzada: vuelta {active.rows} de {active.targetRows}.
            </span>
            <span className="banner__actions">
              <BigButton
                type="button"
                variant="secondary"
                onClick={onUndo}
                disabled={active.history.length === 0}
              >
                Deshacer
              </BigButton>
              <BigButton
                type="button"
                variant="ghost"
                onClick={() => setGoalHit(false)}
              >
                Entendido
              </BigButton>
            </span>
          </Banner>
        )}

        {markerHit && (
          <Banner tone="info" role="alert">
            {markerHit}
          </Banner>
        )}

        {locked && (
          <Banner tone="warn" role="status">
            Toques bloqueados. La sábana o un roce no sumarán vueltas.
          </Banner>
        )}

        {(() => {
          const thisStep = patternStepForRow(active)
          const nextStep = nextPendingPatternStep(active)
          const showNext =
            nextStep && (!thisStep || nextStep.id !== thisStep.id)
          if (!thisStep && !nextStep) return null
          return (
            <Banner tone="info">
              <span>
                {thisStep
                  ? `Esta fila ${thisStep.row}${thisStep.done ? ' (hecha)' : ''}: ${thisStep.instruction}`
                  : nextStep
                    ? `Siguiente — fila ${nextStep.row}: ${nextStep.instruction}`
                    : ''}
                {thisStep && showNext && nextStep
                  ? ` · Luego fila ${nextStep.row}: ${nextStep.instruction}`
                  : ''}
              </span>
              <span className="banner__actions">
                {thisStep && (
                  <BigButton
                    type="button"
                    variant="secondary"
                    onClick={() => togglePatternStep(thisStep.id)}
                  >
                    {thisStep.done ? 'Desmarcar' : 'Marcar hecha'}
                  </BigButton>
                )}
                {thisStep && stepRepeatTimes(thisStep) > 0 && (
                  <>
                    <span className="repeat-progress">
                      {formatStepRepeat(thisStep)}
                    </span>
                    <BigButton
                      type="button"
                      variant="secondary"
                      disabled={
                        locked ||
                        stepRepeatDone(thisStep) >= stepRepeatTimes(thisStep)
                      }
                      onClick={() => bumpStepRepeat(thisStep.id, 1)}
                    >
                      +1 repetición
                    </BigButton>
                    <BigButton
                      type="button"
                      variant="ghost"
                      disabled={locked || stepRepeatDone(thisStep) === 0}
                      onClick={() => bumpStepRepeat(thisStep.id, -1)}
                    >
                      −1
                    </BigButton>
                  </>
                )}
                {canSpeak() && (thisStep || nextStep) && (
                  <BigButton
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      const step = thisStep ?? nextStep
                      if (!step) return
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
              <BigButton
                type="button"
                variant="primary"
                onClick={startTimer}
                disabled={locked}
              >
                Empezar tiempo
              </BigButton>
            ) : (
              <BigButton
                type="button"
                variant="secondary"
                onClick={stopTimer}
                disabled={locked}
              >
                Pausar / guardar
              </BigButton>
            )}
          </div>
          <div className="field">
            <label htmlFor={leaveNoteId}>Dónde lo dejé</label>
            <textarea
              id={leaveNoteId}
              rows={2}
              maxLength={MAX_LEAVE_NOTE}
              value={active.leaveNote}
              onChange={(e) =>
                updateProject(active.id, {
                  leaveNote: clipLeaveNote(e.target.value),
                })
              }
              placeholder="Agujas al centro, 12 derechos…"
            />
            <p className="muted">
              Sale al retomar. {active.leaveNote.length}/{MAX_LEAVE_NOTE}
            </p>
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
            {formatRowSide(active.rows, active.sideMode) ? (
              <p className="counter-side">
                {formatRowSide(active.rows, active.sideMode)}
              </p>
            ) : null}
            <div className="counter-mini-actions">
              <BigButton
                variant="primary"
                aria-label="Sumar vueltas. Mantén pulsado para sumar más rápido"
                disabled={locked}
                {...rowHold}
              >
                +1 vuelta
              </BigButton>
              <BigButton
                variant="secondary"
                aria-label="Restar vueltas. Mantén pulsado para restar más rápido"
                disabled={locked || active.rows === 0}
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
                disabled={locked}
                {...stitchHold}
              >
                +1 punto
              </BigButton>
              <BigButton
                variant="ghost"
                aria-label="Restar puntos. Mantén pulsado para restar más rápido"
                disabled={locked || active.stitches === 0}
                {...stitchHoldDown}
              >
                −1
              </BigButton>
            </div>
          </div>
        </div>

        {pieceOn ? (
          <div className="piece-panel stack">
            <h2 className="section-title">Segunda pieza</h2>
            <div className="field">
              <label htmlFor={pieceLabelId}>Nombre</label>
              <input
                id={pieceLabelId}
                value={active.pieceLabel}
                maxLength={MAX_PIECE_LABEL}
                onChange={(e) =>
                  updateProject(active.id, {
                    pieceLabel: clipPieceLabel(e.target.value) || DEFAULT_PIECE_LABEL,
                  })
                }
                placeholder={DEFAULT_PIECE_LABEL}
              />
            </div>
            <div className="counter-grid">
              <div className="counter-display counter-display--secondary">
                <div className="counter-display__label" id="piece-row-label">
                  Vueltas · {active.pieceLabel}
                </div>
                <div
                  className={`counter-display__value counter-display__value--sm${bump ? ' animate-bump' : ''}`}
                  aria-labelledby="piece-row-label"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {active.pieceRows}
                </div>
                <div className="counter-mini-actions">
                  <BigButton
                    variant="primary"
                    aria-label={`Sumar vueltas de ${active.pieceLabel}`}
                    disabled={locked}
                    {...pieceRowHold}
                  >
                    +1 vuelta
                  </BigButton>
                  <BigButton
                    variant="secondary"
                    aria-label={`Restar vueltas de ${active.pieceLabel}`}
                    disabled={locked || active.pieceRows === 0}
                    {...pieceRowHoldDown}
                  >
                    −1
                  </BigButton>
                </div>
              </div>
              <div className="counter-display counter-display--secondary">
                <div className="counter-display__label" id="piece-stitch-label">
                  Punto · {active.pieceLabel}
                </div>
                <div
                  className={`counter-display__value counter-display__value--sm${bump ? ' animate-bump' : ''}`}
                  aria-labelledby="piece-stitch-label"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {active.pieceStitches}
                </div>
                <div className="counter-mini-actions">
                  <BigButton
                    variant="secondary"
                    aria-label={`Sumar puntos de ${active.pieceLabel}`}
                    disabled={locked}
                    {...pieceStitchHold}
                  >
                    +1 punto
                  </BigButton>
                  <BigButton
                    variant="ghost"
                    aria-label={`Restar puntos de ${active.pieceLabel}`}
                    disabled={locked || active.pieceStitches === 0}
                    {...pieceStitchHoldDown}
                  >
                    −1
                  </BigButton>
                </div>
              </div>
            </div>
            <BigButton
              type="button"
              variant="ghost"
              onClick={() => {
                if (
                  !window.confirm(
                    `¿Quitar el contador de «${active.pieceLabel}»? Las vueltas de esa pieza se pierden.`,
                  )
                ) {
                  return
                }
                updateProject(active.id, {
                  pieceLabel: '',
                  pieceRows: 0,
                  pieceStitches: 0,
                })
              }}
            >
              Quitar segunda pieza
            </BigButton>
          </div>
        ) : (
          <BigButton
            type="button"
            variant="ghost"
            block
            onClick={() =>
              updateProject(active.id, {
                pieceLabel: DEFAULT_PIECE_LABEL,
                pieceRows: 0,
                pieceStitches: 0,
              })
            }
          >
            Añadir segunda pieza (manga…)
          </BigButton>
        )}

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
            variant={locked ? 'primary' : 'ghost'}
            aria-pressed={locked}
            onClick={() =>
              updateProject(active.id, { tapsLocked: !active.tapsLocked })
            }
          >
            {locked ? 'Desbloquear toques' : 'Bloquear toques'}
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
          <legend className="section-title">Derecho / revés</legend>
          {(
            [
              ['flat', 'Plano (impar derecho, par revés)'],
              ['round', 'Circular (siempre derecho)'],
              ['off', 'No avisar'],
            ] as Array<[SideMode, string]>
          ).map(([id, label]) => (
            <label className="backup-mode" key={id} htmlFor={`side-${id}`}>
              <input
                id={`side-${id}`}
                type="radio"
                name="side-mode"
                checked={active.sideMode === id}
                onChange={() => updateProject(active.id, { sideMode: id })}
              />
              {label}
            </label>
          ))}
        </fieldset>

        <fieldset className="alert-prefs">
          <legend className="section-title">Avisos del marcador</legend>
          <label className="backup-mode" htmlFor={soundId}>
            <input
              id={soundId}
              type="checkbox"
              checked={alerts.sound}
              onChange={(e) => setAlertSound(e.target.checked)}
            />
            Sonido (suave)
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
          {canSpeak() && (
            <label className="backup-mode" htmlFor={speakId}>
              <input
                id={speakId}
                type="checkbox"
                checked={alerts.speakStep}
                onChange={(e) => setSpeakStep(e.target.checked)}
              />
              Leer el siguiente paso al completar una vuelta
            </label>
          )}
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
          disabled={locked || (active.rows === 0 && active.stitches === 0)}
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
          className={`counter-fs${locked ? ' counter-fs--locked' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label="Contador a pantalla completa"
        >
          <p className="counter-fs__project">{active.name}</p>
          {formatRowSide(active.rows, active.sideMode) ? (
            <p className="counter-fs__side">
              {formatRowSide(active.rows, active.sideMode)}
            </p>
          ) : null}
          {active.photoDataUrl ? (
            <img
              className="counter-fs__photo"
              src={active.photoDataUrl}
              alt={`Foto de ${active.name}`}
            />
          ) : null}
          {(() => {
            const thisStep = patternStepForRow(active)
            const nextStep = nextPendingPatternStep(active)
            if (!thisStep && !nextStep) return null
            return (
              <p className="counter-fs__step">
                {thisStep
                  ? `Fila ${thisStep.row}${thisStep.done ? ' hecha' : ''}: ${thisStep.instruction}`
                  : `Siguiente — fila ${nextStep?.row}: ${nextStep?.instruction}`}
              </p>
            )
          })()}
          {(() => {
            const thisStep = patternStepForRow(active)
            if (!thisStep || stepRepeatTimes(thisStep) <= 0) return null
            return (
              <div className="counter-fs__repeat">
                <p>{formatStepRepeat(thisStep)}</p>
                <div className="counter-fs__actions">
                  <button
                    type="button"
                    className="counter-fs__btn counter-fs__btn--primary"
                    disabled={
                      locked ||
                      stepRepeatDone(thisStep) >= stepRepeatTimes(thisStep)
                    }
                    onClick={() => bumpStepRepeat(thisStep.id, 1)}
                  >
                    +1 repetición
                  </button>
                  <button
                    type="button"
                    className="counter-fs__btn"
                    disabled={locked || stepRepeatDone(thisStep) === 0}
                    onClick={() => bumpStepRepeat(thisStep.id, -1)}
                  >
                    −1
                  </button>
                </div>
              </div>
            )
          })()}
          {active.leaveNote.trim() ? (
            <p className="counter-fs__leave">Dónde lo dejé: {active.leaveNote}</p>
          ) : null}
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
          {goalHit && (
            <p className="counter-fs__goal" role="alert">
              Meta alcanzada: {active.rows} de {active.targetRows}
            </p>
          )}
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
                  disabled={locked}
                  {...rowHold}
                >
                  +1 vuelta
                </button>
                <button
                  type="button"
                  className="counter-fs__btn"
                  aria-label="Restar vueltas. Mantén pulsado para restar más rápido"
                  disabled={locked || active.rows === 0}
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
                  disabled={locked}
                  {...stitchHold}
                >
                  +1 punto
                </button>
                <button
                  type="button"
                  className="counter-fs__btn"
                  aria-label="Restar puntos. Mantén pulsado para restar más rápido"
                  disabled={locked || active.stitches === 0}
                  {...stitchHoldDown}
                >
                  −1
                </button>
              </div>
            </div>
          </div>
          {pieceOn && (
            <div className="counter-fs__grid counter-fs__grid--piece">
              <div>
                <div className="counter-fs__label">
                  Vueltas · {active.pieceLabel}
                </div>
                <div
                  className={`counter-fs__value counter-fs__value--sm${bump ? ' animate-bump' : ''}`}
                  aria-live="polite"
                >
                  {active.pieceRows}
                </div>
                <div className="counter-fs__actions">
                  <button
                    type="button"
                    className="counter-fs__btn counter-fs__btn--primary"
                    aria-label={`Sumar vueltas de ${active.pieceLabel}`}
                    disabled={locked}
                    {...pieceRowHold}
                  >
                    +1 vuelta
                  </button>
                  <button
                    type="button"
                    className="counter-fs__btn"
                    aria-label={`Restar vueltas de ${active.pieceLabel}`}
                    disabled={locked || active.pieceRows === 0}
                    {...pieceRowHoldDown}
                  >
                    −1
                  </button>
                </div>
              </div>
              <div>
                <div className="counter-fs__label">
                  Punto · {active.pieceLabel}
                </div>
                <div
                  className={`counter-fs__value counter-fs__value--sm${bump ? ' animate-bump' : ''}`}
                  aria-live="polite"
                >
                  {active.pieceStitches}
                </div>
                <div className="counter-fs__actions">
                  <button
                    type="button"
                    className="counter-fs__btn counter-fs__btn--primary"
                    aria-label={`Sumar puntos de ${active.pieceLabel}`}
                    disabled={locked}
                    {...pieceStitchHold}
                  >
                    +1 punto
                  </button>
                  <button
                    type="button"
                    className="counter-fs__btn"
                    aria-label={`Restar puntos de ${active.pieceLabel}`}
                    disabled={locked || active.pieceStitches === 0}
                    {...pieceStitchHoldDown}
                  >
                    −1
                  </button>
                </div>
              </div>
            </div>
          )}
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
            className={`counter-fs__close${locked ? ' counter-fs__close--lock' : ''}`}
            aria-pressed={locked}
            onClick={() =>
              updateProject(active.id, { tapsLocked: !active.tapsLocked })
            }
          >
            {locked ? 'Desbloquear toques' : 'Bloquear toques'}
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
