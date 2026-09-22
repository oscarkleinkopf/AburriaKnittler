import { useId, useState, type FormEvent } from 'react'
import { BigButton } from '../BigButton'
import type { AnalyzeResult } from '../../lib/analyze'

type AnalyzeEditModalProps = {
  initialData: AnalyzeResult
  onSave: (result: AnalyzeResult) => void
  onCancel: () => void
}

export function AnalyzeEditModal({
  initialData,
  onSave,
  onCancel,
}: AnalyzeEditModalProps) {
  const stitchesId = useId()
  const rowsId = useId()
  const typeId = useId()
  const structId = useId()
  const confId = useId()
  const notesId = useId()

  const [stitches, setStitches] = useState(
    initialData.estimatedStitches != null ? String(initialData.estimatedStitches) : '',
  )
  const [rows, setRows] = useState(
    initialData.estimatedRows != null ? String(initialData.estimatedRows) : '',
  )
  const [stitchType, setStitchType] = useState(initialData.stitchType)
  const [patternStructure, setPatternStructure] = useState(
    initialData.patternStructure,
  )
  const [confidence, setConfidence] = useState(initialData.confidence || 'media')
  const [notes, setNotes] = useState(initialData.notes)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const stNum = Number.parseInt(stitches, 10)
    const rowNum = Number.parseInt(rows, 10)
    onSave({
      estimatedStitches: Number.isFinite(stNum) && stNum >= 0 ? stNum : null,
      estimatedRows: Number.isFinite(rowNum) && rowNum >= 0 ? rowNum : null,
      stitchType: stitchType.trim() || 'No determinado',
      patternStructure: patternStructure.trim() || 'No determinado',
      confidence,
      notes: notes.trim(),
    })
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-analysis-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div className="modal-card">
        <div className="modal-card__header">
          <h2 id="edit-analysis-title" className="modal-card__title">
            Corregir resultado
          </h2>
          <button
            type="button"
            className="modal-card__close-btn"
            onClick={onCancel}
            aria-label="Cerrar ventana de corrección"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-card__body">
          <div className="field-row">
            <div className="field">
              <label htmlFor={stitchesId}>Puntos aproximados:</label>
              <input
                id={stitchesId}
                type="number"
                min="0"
                value={stitches}
                onChange={(e) => setStitches(e.target.value)}
                placeholder="Ej. 64"
                autoFocus
              />
            </div>
            <div className="field">
              <label htmlFor={rowsId}>Filas aproximadas:</label>
              <input
                id={rowsId}
                type="number"
                min="0"
                value={rows}
                onChange={(e) => setRows(e.target.value)}
                placeholder="Ej. 80"
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor={typeId}>Tipo de punto:</label>
            <input
              id={typeId}
              type="text"
              value={stitchType}
              onChange={(e) => setStitchType(e.target.value)}
              placeholder="Ej. Punto jersey, Punto bobo / musgo"
            />
          </div>

          <div className="field">
            <label htmlFor={structId}>Estructura del patrón:</label>
            <textarea
              id={structId}
              rows={2}
              value={patternStructure}
              onChange={(e) => setPatternStructure(e.target.value)}
              placeholder="Ej. 1 der, 1 rev (repetir)"
            />
          </div>

          <div className="field">
            <label htmlFor={confId}>Nivel de confianza:</label>
            <select
              id={confId}
              value={confidence}
              onChange={(e) => setConfidence(e.target.value)}
            >
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor={notesId}>Notas u observaciones:</label>
            <textarea
              id={notesId}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="modal-card__footer">
            <BigButton type="button" variant="ghost" onClick={onCancel}>
              Cancelar
            </BigButton>
            <BigButton type="submit" variant="primary">
              Guardar corrección
            </BigButton>
          </div>
        </form>
      </div>
    </div>
  )
}
