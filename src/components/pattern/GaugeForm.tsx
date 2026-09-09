import { useId } from 'react'
import type { Project } from '../../lib/projects'

type GaugeFormProps = {
  project: Project
  onUpdate: (patch: Partial<Project>) => void
}

export function GaugeForm({ project, onUpdate }: GaugeFormProps) {
  const yarnId = useId()
  const needlesId = useId()
  const gaugeCmId = useId()
  const gaugeStitchesId = useId()
  const gaugeRowsId = useId()

  return (
    <section className="gauge-section" aria-label="Muestra y tensión">
      <h2 className="section-title">Muestra / tensión</h2>
      <p className="section-desc">
        Anota la lana, aguja y la muestra para calcular medidas exactas.
      </p>

      <div className="gauge-grid">
        <div className="field">
          <label htmlFor={yarnId}>Lana / hilo:</label>
          <input
            id={yarnId}
            type="text"
            value={project.yarn}
            onChange={(e) => onUpdate({ yarn: e.target.value })}
            placeholder="Ej. Merino DK 100g, Algodón rústico"
          />
        </div>

        <div className="field">
          <label htmlFor={needlesId}>Agujas:</label>
          <input
            id={needlesId}
            type="text"
            value={project.needles}
            onChange={(e) => onUpdate({ needles: e.target.value })}
            placeholder="Ej. 4,5 mm / US 7"
          />
        </div>

        <div className="field field--short">
          <label htmlFor={gaugeCmId}>Medida (cm):</label>
          <input
            id={gaugeCmId}
            type="number"
            min="1"
            max="100"
            value={project.gaugeCm || 10}
            onChange={(e) => {
              const n = Number.parseInt(e.target.value, 10)
              onUpdate({ gaugeCm: Number.isFinite(n) && n > 0 ? n : 10 })
            }}
          />
        </div>

        <div className="field field--short">
          <label htmlFor={gaugeStitchesId}>Puntos en la muestra:</label>
          <input
            id={gaugeStitchesId}
            type="number"
            min="0"
            max="500"
            value={project.gaugeStitches > 0 ? String(project.gaugeStitches) : ''}
            onChange={(e) => {
              const n = Number.parseInt(e.target.value, 10)
              onUpdate({ gaugeStitches: Number.isFinite(n) && n >= 0 ? n : 0 })
            }}
            placeholder="0"
          />
        </div>

        <div className="field field--short">
          <label htmlFor={gaugeRowsId}>Filas en la muestra:</label>
          <input
            id={gaugeRowsId}
            type="number"
            min="0"
            max="500"
            value={project.gaugeRows > 0 ? String(project.gaugeRows) : ''}
            onChange={(e) => {
              const n = Number.parseInt(e.target.value, 10)
              onUpdate({ gaugeRows: Number.isFinite(n) && n >= 0 ? n : 0 })
            }}
            placeholder="0"
          />
        </div>
      </div>
    </section>
  )
}
