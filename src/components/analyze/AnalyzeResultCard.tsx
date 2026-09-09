import { BigButton } from '../BigButton'
import {
  isLocalAnalysis,
  LOCAL_ANALYSIS_NOTICE,
  type AnalyzeResult,
} from '../../lib/analyze'
import { canSpeak } from '../../lib/speech'

type AnalyzeResultCardProps = {
  result: AnalyzeResult
  speaking: boolean
  onSpeak: () => void
  onEdit: () => void
  onOpenHandEntry: () => void
}

export function AnalyzeResultCard({
  result,
  speaking,
  onSpeak,
  onEdit,
  onOpenHandEntry,
}: AnalyzeResultCardProps) {
  const isLocal = isLocalAnalysis(result)

  return (
    <article className="analyze-result-card" aria-label="Resultado del análisis">
      {isLocal && (
        <div className="analyze-local-warning" role="note">
          <p className="analyze-local-warning__text">{LOCAL_ANALYSIS_NOTICE}</p>
          <BigButton
            type="button"
            variant="secondary"
            className="analyze-local-warning__btn"
            onClick={onOpenHandEntry}
          >
            Escribir conteo a mano
          </BigButton>
        </div>
      )}

      <div className="analyze-result-card__header">
        <div className="analyze-result-card__badges">
          <span
            className={`confidence-badge confidence-badge--${result.confidence}`}
          >
            Confianza {result.confidence}
          </span>
          {isLocal && (
            <span className="local-badge">Estimación local</span>
          )}
        </div>

        <div className="analyze-result-card__top-actions">
          {canSpeak() && (
            <button
              type="button"
              className="analyze-speak-btn"
              disabled={speaking}
              onClick={onSpeak}
              aria-label="Escuchar resultado en voz alta"
            >
              {speaking ? '🔊 Leyendo...' : '🗣 Escuchar'}
            </button>
          )}
          <button
            type="button"
            className="analyze-edit-btn"
            onClick={onEdit}
          >
            ✎ Corregir
          </button>
        </div>
      </div>

      <div className="analyze-metrics-grid">
        <div className="analyze-metric">
          <span className="analyze-metric__num">
            {result.estimatedStitches != null ? result.estimatedStitches : '—'}
          </span>
          <span className="analyze-metric__label">Puntos estimados</span>
        </div>

        <div className="analyze-metric">
          <span className="analyze-metric__num">
            {result.estimatedRows != null ? result.estimatedRows : '—'}
          </span>
          <span className="analyze-metric__label">Filas estimadas</span>
        </div>
      </div>

      <div className="analyze-details">
        <div className="analyze-detail-item">
          <strong>Tipo de punto:</strong> {result.stitchType}
        </div>
        {result.patternStructure && (
          <div className="analyze-detail-item">
            <strong>Estructura:</strong> {result.patternStructure}
          </div>
        )}
        {result.notes && (
          <div className="analyze-detail-item">
            <strong>Observaciones:</strong> {result.notes}
          </div>
        )}
      </div>
    </article>
  )
}
