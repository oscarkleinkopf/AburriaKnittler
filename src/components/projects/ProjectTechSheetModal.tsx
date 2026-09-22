import { BigButton } from '../BigButton'
import type { Project } from '../../lib/projects'
import {
  formatDuration,
  formatGauge,
  goalProgress,
  sortedPatternSteps,
  totalSessionMs,
} from '../../lib/projects'

type ProjectTechSheetModalProps = {
  project: Project | null
  isOpen: boolean
  onClose: () => void
}

export function ProjectTechSheetModal({
  project,
  isOpen,
  onClose,
}: ProjectTechSheetModalProps) {
  if (!isOpen || !project) return null

  const progress = goalProgress(project)
  const gaugeText = formatGauge(project)
  const steps = sortedPatternSteps(project.patternSteps)
  const totalMs = totalSessionMs(project)

  function handlePrint() {
    window.print()
  }

  return (
    <div
      className="modal-overlay modal-overlay--techsheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="techsheet-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal-card modal-card--techsheet">
        <div className="modal-card__header no-print">
          <h2 id="techsheet-title" className="modal-card__title">
            📋 Ficha técnica de labor
          </h2>
          <button
            type="button"
            className="modal-card__close-btn"
            onClick={onClose}
            aria-label="Cerrar ficha técnica"
          >
            ✕
          </button>
        </div>

        <div className="modal-card__body techsheet-printable-area">
          <div className="techsheet-header">
            <div className="techsheet-header__info">
              <h1 className="techsheet-title">{project.name}</h1>
              <p className="techsheet-meta">
                Iniciado: {new Date(project.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}
                {project.archivedAt ? ' · [Archivado]' : ' · [En curso]'}
              </p>
            </div>
            {project.photoDataUrl && (
              <img
                src={project.photoDataUrl}
                alt={`Portada de ${project.name}`}
                className="techsheet-cover-thumb"
              />
            )}
          </div>

          <hr className="techsheet-divider" />

          <section className="techsheet-specs-grid" aria-label="Especificaciones">
            <div className="techsheet-spec-item">
              <span className="techsheet-spec-label">Lana / Hilo:</span>
              <strong className="techsheet-spec-val">{project.yarn || 'No especificada'}</strong>
            </div>

            <div className="techsheet-spec-item">
              <span className="techsheet-spec-label">Agujas:</span>
              <strong className="techsheet-spec-val">{project.needles || 'No especificadas'}</strong>
            </div>

            <div className="techsheet-spec-item">
              <span className="techsheet-spec-label">Muestra de tensión:</span>
              <strong className="techsheet-spec-val">{gaugeText || 'Sin muestra registrada'}</strong>
            </div>

            <div className="techsheet-spec-item">
              <span className="techsheet-spec-label">Avance actual:</span>
              <strong className="techsheet-spec-val">
                {project.rows} vueltas · {project.stitches} puntos
                {progress ? ` (${Math.round(progress.ratio * 100)}% de meta ${progress.target})` : ''}
              </strong>
            </div>

            <div className="techsheet-spec-item">
              <span className="techsheet-spec-label">Tiempo invertido:</span>
              <strong className="techsheet-spec-val">
                {formatDuration(totalMs)} ({project.sessions.length} sesiones)
              </strong>
            </div>

            {project.leaveNote && (
              <div className="techsheet-spec-item techsheet-spec-item--full">
                <span className="techsheet-spec-label">Dónde lo dejé:</span>
                <p className="techsheet-leave-note">{project.leaveNote}</p>
              </div>
            )}

            {project.notes && (
              <div className="techsheet-spec-item techsheet-spec-item--full">
                <span className="techsheet-spec-label">Notas del proyecto:</span>
                <p className="techsheet-notes">{project.notes}</p>
              </div>
            )}
          </section>

          {steps.length > 0 && (
            <section className="techsheet-pattern-section" aria-label="Instrucciones para imprimir">
              <h2 className="techsheet-subheading">Patrón por filas ({steps.length} pasos)</h2>
              <table className="techsheet-table">
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>Hecho</th>
                    <th style={{ width: '70px' }}>Fila</th>
                    <th>Instrucción</th>
                  </tr>
                </thead>
                <tbody>
                  {steps.map((s) => (
                    <tr key={s.id} className={s.done ? 'is-done' : ''}>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={s.done}
                          readOnly
                          aria-label={`Fila ${s.row} completada`}
                        />
                      </td>
                      <td style={{ fontWeight: 'bold' }}>Fila {s.row}</td>
                      <td>{s.instruction}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>

        <div className="modal-card__footer no-print">
          <BigButton type="button" variant="ghost" onClick={onClose}>
            Cerrar
          </BigButton>
          <BigButton type="button" variant="primary" onClick={handlePrint}>
            🖨 Imprimir ficha técnica
          </BigButton>
        </div>
      </div>
    </div>
  )
}
