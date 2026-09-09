import { useState, useId } from 'react'
import type { AnalyzeResult } from '../../lib/analyze'
import { BigButton } from '../BigButton'

type ScaleCalibrationPanelProps = {
  result: AnalyzeResult
  onSaveGauge: (gauge: { gaugeCm: number; gaugeStitches: number; gaugeRows: number }) => void
}

export function ScaleCalibrationPanel({
  result,
  onSaveGauge,
}: ScaleCalibrationPanelProps) {
  const [cmWidth, setCmWidth] = useState<string>('10')
  const [saved, setSaved] = useState(false)
  const cmId = useId()

  const measuredCm = Math.max(1, Number.parseFloat(cmWidth) || 10)
  const estStitches = result.estimatedStitches ?? 0
  const estRows = result.estimatedRows ?? 0

  // Escalado estándar a 10 cm
  const normalizedStitches = estStitches > 0 ? Math.round((estStitches / measuredCm) * 10) : 0
  const normalizedRows = estRows > 0 ? Math.round((estRows / measuredCm) * 10) : 0

  function handleApply() {
    onSaveGauge({
      gaugeCm: 10,
      gaugeStitches: normalizedStitches,
      gaugeRows: normalizedRows,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (estStitches === 0 && estRows === 0) return null

  return (
    <section className="scale-calibration-card" aria-label="Calibración de escala">
      <div className="scale-calibration-header">
        <h3 className="scale-calibration-title">
          📏 Calibrar escala de la muestra
        </h3>
        <p className="scale-calibration-desc">
          Si incluiste una regla o sabes la medida del recuadro analizado, calibra la muestra a 10 cm:
        </p>
      </div>

      <div className="scale-calibration-form">
        <div className="field field--short">
          <label htmlFor={cmId}>Medida real del recorte (cm):</label>
          <input
            id={cmId}
            type="number"
            min="1"
            max="100"
            step="0.5"
            value={cmWidth}
            onChange={(e) => setCmWidth(e.target.value)}
          />
        </div>

        <div className="scale-calibration-result">
          <span className="scale-calibration-res-text">
            Equivalente en 10 cm:{' '}
            <strong>
              {normalizedStitches} puntos × {normalizedRows} filas
            </strong>
          </span>

          <BigButton
            type="button"
            variant="secondary"
            onClick={handleApply}
            disabled={normalizedStitches === 0 && normalizedRows === 0}
          >
            {saved ? '✓ Guardado en el proyecto' : '💾 Guardar en muestra del proyecto'}
          </BigButton>
        </div>
      </div>
    </section>
  )
}
