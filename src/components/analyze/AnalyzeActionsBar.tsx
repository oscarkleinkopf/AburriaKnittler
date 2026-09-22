import { BigButton } from '../BigButton'
import type { AnalyzeResult } from '../../lib/analyze'
import { MAX_PHOTOS } from '../../lib/projects'

type AnalyzeActionsBarProps = {
  result: AnalyzeResult
  hasCounters: boolean
  hasStructure: boolean
  hasPhotoToSave: boolean
  photoCount: number
  onApplyToCounters: () => void
  onSetTarget: () => void
  onConvertToPattern: () => void
  onSaveToGallery: () => void
}

export function AnalyzeActionsBar({
  result,
  hasCounters,
  hasStructure,
  hasPhotoToSave,
  photoCount,
  onApplyToCounters,
  onSetTarget,
  onConvertToPattern,
  onSaveToGallery,
}: AnalyzeActionsBarProps) {
  return (
    <section className="analyze-actions-section" aria-label="Acciones con el resultado">
      <h3 className="section-title">Aplicar al proyecto activo</h3>
      <div className="analyze-actions-grid">
        {hasCounters && (
          <BigButton
            type="button"
            variant="primary"
            onClick={onApplyToCounters}
          >
            📊 Pasar al contador ({result.estimatedRows ?? 0} vueltas, {result.estimatedStitches ?? 0} puntos)
          </BigButton>
        )}

        {result.estimatedRows != null && result.estimatedRows > 0 && (
          <BigButton
            type="button"
            variant="secondary"
            onClick={onSetTarget}
          >
            🎯 Fijar como meta ({result.estimatedRows} vueltas)
          </BigButton>
        )}

        {hasStructure && (
          <BigButton
            type="button"
            variant="secondary"
            onClick={onConvertToPattern}
          >
            📝 Convertir estructura en pasos del patrón
          </BigButton>
        )}

        {hasPhotoToSave && photoCount < MAX_PHOTOS && (
          <BigButton
            type="button"
            variant="ghost"
            onClick={onSaveToGallery}
          >
            🖼 Guardar foto en la galería del proyecto ({photoCount}/{MAX_PHOTOS})
          </BigButton>
        )}
      </div>
    </section>
  )
}
