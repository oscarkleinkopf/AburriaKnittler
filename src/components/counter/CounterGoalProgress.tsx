import { useId, useState, type FormEvent } from 'react'
import { BigButton } from '../BigButton'
import type { GoalProgress } from '../../lib/projects'

type CounterGoalProgressProps = {
  progress: GoalProgress | null
  targetRows: number
  goalHit: boolean
  onSetTargetRows: (n: number) => void
}

export function CounterGoalProgress({
  progress,
  targetRows,
  goalHit,
  onSetTargetRows,
}: CounterGoalProgressProps) {
  const inputId = useId()
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(() => (targetRows > 0 ? String(targetRows) : ''))

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const n = Number.parseInt(val, 10)
    onSetTargetRows(Number.isFinite(n) && n > 0 ? n : 0)
    setEditing(false)
  }

  const percent = progress ? Math.round(progress.ratio * 100) : 0

  return (
    <section className="counter-goal" aria-label="Meta de vueltas">
      <div className="counter-goal__header">
        <h3 className="counter-goal__title">Meta de vueltas</h3>
        <button
          type="button"
          className="counter-goal__edit-btn"
          onClick={() => {
            setVal(targetRows > 0 ? String(targetRows) : '')
            setEditing((prev) => !prev)
          }}
        >
          {editing ? 'Cancelar' : targetRows > 0 ? 'Cambiar meta' : '+ Añadir meta'}
        </button>
      </div>

      {goalHit && (
        <div className="counter-goal__celebration" role="alert">
          🎉 <strong>¡Meta alcanzada!</strong> Has llegado a las {targetRows} vueltas.
        </div>
      )}

      {progress && !editing && (
        <div className="counter-goal__progress">
          <div className="counter-goal__bar-wrap">
            <div
              className="counter-goal__bar"
              style={{ width: `${percent}%` }}
              role="progressbar"
              aria-valuenow={progress.current}
              aria-valuemin={0}
              aria-valuemax={progress.target}
              aria-label={`Progreso: ${percent}%`}
            />
          </div>
          <div className="counter-goal__stats">
            <span>
              {progress.current} de {progress.target} vueltas ({percent}%)
            </span>
            <span>
              {progress.done
                ? '¡Completado!'
                : `Faltan ${progress.remaining} ${
                    progress.remaining === 1 ? 'vuelta' : 'vueltas'
                  }`}
            </span>
          </div>
        </div>
      )}

      {editing && (
        <form onSubmit={onSubmit} className="counter-goal__form">
          <div className="field">
            <label htmlFor={inputId}>Número de vueltas objetivo (0 para quitarla):</label>
            <input
              id={inputId}
              type="number"
              min="0"
              max="9999"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              placeholder="Ej. 120"
              autoFocus
            />
          </div>
          <div className="form-actions">
            <BigButton type="submit" variant="primary">
              Guardar meta
            </BigButton>
          </div>
        </form>
      )}
    </section>
  )
}
