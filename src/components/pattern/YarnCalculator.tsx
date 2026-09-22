import { useState, useId } from 'react'
import type { Project } from '../../lib/projects'
import { BigButton } from '../BigButton'

type YarnCalculatorProps = {
  project: Project
  onSetTargetRows?: (rows: number) => void
}

export function YarnCalculator({ project, onSetTargetRows }: YarnCalculatorProps) {
  const widthId = useId()
  const heightId = useId()
  const metersPerSkeinId = useId()

  const [widthCm, setWidthCm] = useState<string>('30')
  const [heightCm, setHeightCm] = useState<string>('40')
  const [metersPerSkein, setMetersPerSkein] = useState<string>('200')
  const [copied, setCopied] = useState(false)

  const w = Math.max(0, Number.parseFloat(widthCm) || 0)
  const h = Math.max(0, Number.parseFloat(heightCm) || 0)
  const skeinMeters = Math.max(1, Number.parseFloat(metersPerSkein) || 200)

  const gaugeCm = project.gaugeCm || 10
  const stitchesPerCm = project.gaugeStitches > 0 ? project.gaugeStitches / gaugeCm : 0
  const rowsPerCm = project.gaugeRows > 0 ? project.gaugeRows / gaugeCm : 0

  const hasGauge = stitchesPerCm > 0 && rowsPerCm > 0

  const calculatedStitches = hasGauge && w > 0 ? Math.round(w * stitchesPerCm) : 0
  const calculatedRows = hasGauge && h > 0 ? Math.round(h * rowsPerCm) : 0

  // Estimación de yardaje: punto medio estándar ~0.025m a 0.035m de hilo por punto tejido
  // + 10% de margen de seguridad para remates y tensión
  const totalStitchesKnitted = calculatedStitches * calculatedRows
  const estimatedMeters = totalStitchesKnitted > 0 ? Math.round(totalStitchesKnitted * 0.03 * 1.1) : 0
  const estimatedSkeins = estimatedMeters > 0 ? Math.ceil(estimatedMeters / skeinMeters) : 0

  function copySummary() {
    if (!hasGauge) return
    const text = `Cálculo para ${project.name}:
- Medidas deseadas: ${w} cm ancho × ${h} cm alto
- Muestra base (${gaugeCm} cm): ${project.gaugeStitches} pts × ${project.gaugeRows} filas
- Puntos a montar recomendados: ${calculatedStitches} puntos
- Vueltas a tejer: ${calculatedRows} vueltas
- Lana estimada: ~${estimatedMeters} m (${estimatedSkeins} ovillos de ${skeinMeters} m aprox.)`

    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <section className="yarn-calculator-section" aria-label="Calculadora de lana y medidas">
      <div className="yarn-calculator-header">
        <h2 className="section-title">Calculadora de medidas y lana</h2>
        <p className="section-desc">
          Calcula puntos a montar, vueltas y lana requerida a partir de la muestra de tu proyecto.
        </p>
      </div>

      {!hasGauge && (
        <div className="banner banner--warn" role="alert">
          <span>
            Para calcular medidas necesitas completar la <strong>muestra de tensión</strong> (puntos y filas) en la sección anterior.
          </span>
        </div>
      )}

      <div className="yarn-calculator-grid">
        <div className="field">
          <label htmlFor={widthId}>Ancho deseado (cm):</label>
          <input
            id={widthId}
            type="number"
            min="1"
            max="500"
            step="0.5"
            value={widthCm}
            onChange={(e) => setWidthCm(e.target.value)}
            placeholder="30"
          />
        </div>

        <div className="field">
          <label htmlFor={heightId}>Largo / Alto deseado (cm):</label>
          <input
            id={heightId}
            type="number"
            min="1"
            max="500"
            step="0.5"
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
            placeholder="40"
          />
        </div>

        <div className="field">
          <label htmlFor={metersPerSkeinId}>Metros por ovillo (opcional):</label>
          <input
            id={metersPerSkeinId}
            type="number"
            min="10"
            max="2000"
            value={metersPerSkein}
            onChange={(e) => setMetersPerSkein(e.target.value)}
            placeholder="200"
          />
        </div>
      </div>

      {hasGauge && calculatedStitches > 0 && calculatedRows > 0 && (
        <div className="yarn-calc-results">
          <div className="yarn-calc-card">
            <span className="yarn-calc-card__num">{calculatedStitches}</span>
            <span className="yarn-calc-card__label">Puntos a montar</span>
          </div>

          <div className="yarn-calc-card">
            <span className="yarn-calc-card__num">{calculatedRows}</span>
            <span className="yarn-calc-card__label">Vueltas requeridas</span>
          </div>

          <div className="yarn-calc-card">
            <span className="yarn-calc-card__num">~{estimatedMeters} m</span>
            <span className="yarn-calc-card__label">Lana estimada (+10% margen)</span>
          </div>

          <div className="yarn-calc-card">
            <span className="yarn-calc-card__num">~{estimatedSkeins}</span>
            <span className="yarn-calc-card__label">Ovillos aprox. ({skeinMeters} m/ov.)</span>
          </div>
        </div>
      )}

      {hasGauge && calculatedRows > 0 && (
        <div className="yarn-calc-actions">
          {onSetTargetRows && (
            <BigButton
              type="button"
              variant="primary"
              onClick={() => onSetTargetRows(calculatedRows)}
            >
              🎯 Fijar {calculatedRows} vueltas como meta
            </BigButton>
          )}

          <BigButton
            type="button"
            variant="ghost"
            onClick={copySummary}
          >
            {copied ? '✓ Copiado al portapapeles' : '📋 Copiar cálculo'}
          </BigButton>
        </div>
      )}
    </section>
  )
}
