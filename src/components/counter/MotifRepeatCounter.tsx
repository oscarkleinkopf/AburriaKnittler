import { useState, useId } from 'react'
import type { Project } from '../../lib/projects'
import { motifProgress } from '../../lib/projects'

type MotifRepeatCounterProps = {
  project: Project
  onUpdate: (patch: Partial<Project>) => void
}

export function MotifRepeatCounter({ project, onUpdate }: MotifRepeatCounterProps) {
  const [editing, setEditing] = useState(false)
  const lengthId = useId()
  const targetId = useId()

  const enabled = Boolean(project.motifEnabled)
  const prog = motifProgress(project)

  const [lengthInput, setLengthInput] = useState(
    project.motifLength ? String(project.motifLength) : '8',
  )
  const [targetInput, setTargetInput] = useState(
    project.motifTargetRepeats ? String(project.motifTargetRepeats) : '',
  )

  function saveConfig(e: React.FormEvent) {
    e.preventDefault()
    const l = Math.max(1, Number.parseInt(lengthInput, 10) || 1)
    const t = Math.max(0, Number.parseInt(targetInput, 10) || 0)
    onUpdate({
      motifEnabled: true,
      motifLength: l,
      motifTargetRepeats: t,
    })
    setEditing(false)
  }

  function toggleActive() {
    if (!enabled && (!project.motifLength || project.motifLength <= 0)) {
      setEditing(true)
    } else {
      onUpdate({ motifEnabled: !enabled })
    }
  }

  return (
    <section className="motif-counter-card" aria-label="Subcontador de motivos">
      <div className="motif-counter-header">
        <div className="motif-counter-title-wrap">
          <h3 className="motif-counter-title">
            🔁 Repetición de motivo / sección
          </h3>
          <span className="motif-counter-badge">
            {enabled ? 'Activo' : 'Inactivo'}
          </span>
        </div>

        <div className="motif-counter-top-actions">
          <button
            type="button"
            className="motif-toggle-btn"
            onClick={toggleActive}
            aria-label={enabled ? 'Desactivar contador de motivo' : 'Activar contador de motivo'}
          >
            {enabled ? 'Pausar' : 'Activar'}
          </button>
          {enabled && (
            <button
              type="button"
              className="motif-edit-btn"
              onClick={() => setEditing((prev) => !prev)}
              aria-label="Configurar vueltas del motivo"
            >
              ⚙ {editing ? 'Cerrar' : 'Configurar'}
            </button>
          )}
        </div>
      </div>

      {editing && (
        <form onSubmit={saveConfig} className="motif-config-form">
          <div className="field-row">
            <div className="field">
              <label htmlFor={lengthId}>Vueltas por repetición:</label>
              <input
                id={lengthId}
                type="number"
                min="1"
                max="500"
                value={lengthInput}
                onChange={(e) => setLengthInput(e.target.value)}
                placeholder="Ej. 8"
                autoFocus
              />
            </div>

            <div className="field">
              <label htmlFor={targetId}>Total repeticiones (opcional):</label>
              <input
                id={targetId}
                type="number"
                min="0"
                max="500"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                placeholder="Ej. 5"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="big-button big-button--primary">
              Guardar motivo
            </button>
          </div>
        </form>
      )}

      {enabled && prog && (
        <div className="motif-progress-display">
          <div className="motif-metrics">
            <div className="motif-metric">
              <span className="motif-metric__label">Repetición</span>
              <span className="motif-metric__val">
                {prog.currentRepeat}
                {prog.targetRepeats > 0 ? ` / ${prog.targetRepeats}` : ''}
              </span>
            </div>

            <div className="motif-metric">
              <span className="motif-metric__label">Vuelta en motivo</span>
              <span className="motif-metric__val">
                {prog.currentRowInMotif} / {prog.motifLength}
              </span>
            </div>
          </div>

          <div
            className="motif-progress-bar-wrap"
            role="progressbar"
            aria-valuenow={prog.currentRowInMotif}
            aria-valuemin={0}
            aria-valuemax={prog.motifLength}
            aria-label={`Vuelta ${prog.currentRowInMotif} de ${prog.motifLength} del motivo`}
          >
            <div
              className="motif-progress-bar"
              style={{
                width: `${Math.min(100, (prog.currentRowInMotif / prog.motifLength) * 100)}%`,
              }}
            />
          </div>

          {prog.done && (
            <p className="motif-done-banner" role="status">
              🎉 ¡Todas las repeticiones del motivo han sido completadas!
            </p>
          )}
        </div>
      )}
    </section>
  )
}
