import { useId } from 'react'
import type { Project } from '../../lib/projects'
import { formatNeedleHint } from '../../lib/knitTools'

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
  const gaugeMetersId = useId()

  const needleHint = formatNeedleHint(project.needles)

  return (
    <section className="gauge-section stack" aria-label="Muestra y tensión">
      <h2 className="section-title">Muestra / tensión</h2>
      <p className="section-desc muted">
        Anota la lana, aguja y la muestra para calcular medidas exactas.
      </p>

      <div className="gauge-grid">
        <div className="field">
          <label htmlFor={yarnId}>Lana / hilo</label>
          <input
            id={yarnId}
            type="text"
            value={project.yarn}
            onChange={(e) => onUpdate({ yarn: e.target.value })}
            placeholder="Ej. Merino DK 100g, Algodón rústico"
          />
        </div>

        <div className="field">
          <label htmlFor={needlesId}>Agujas</label>
          <input
            id={needlesId}
            type="text"
            value={project.needles}
            onChange={(e) => onUpdate({ needles: e.target.value })}
            placeholder="4,5 mm"
          />
          {needleHint ? <p className="calc-result">{needleHint}</p> : null}
        </div>

        <div className="field field--short">
          <label htmlFor={gaugeCmId}>Muestra en cm</label>
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
          <label htmlFor={gaugeStitchesId}>Puntos en esa muestra</label>
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
            placeholder="0 = no"
          />
        </div>

        <div className="field field--short">
          <label htmlFor={gaugeRowsId}>Filas en esa muestra</label>
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
            placeholder="0 = no"
          />
        </div>

        <div className="field field--short">
          <label htmlFor={gaugeMetersId}>Metros en esa muestra</label>
          <input
            id={gaugeMetersId}
            type="number"
            min="0"
            step="0.1"
            inputMode="decimal"
            value={project.gaugeMeters || ''}
            onChange={(e) => {
              const n = Number.parseFloat(e.target.value.replace(',', '.'))
              onUpdate({
                gaugeMeters: Number.isFinite(n) && n >= 0 ? n : 0,
              })
            }}
            placeholder="0 = no"
          />
        </div>
      </div>
    </section>
  )
}
