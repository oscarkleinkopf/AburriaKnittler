import { useId, useState, type FormEvent } from 'react'
import { BigButton } from '../BigButton'
import { parsePatternText, type PatternStep } from '../../lib/projects'

type PatternPasteFormProps = {
  suggestedStartRow: number
  onAddSteps: (steps: PatternStep[]) => void
}

export function PatternPasteForm({
  suggestedStartRow,
  onAddSteps,
}: PatternPasteFormProps) {
  const pasteId = useId()
  const startRowId = useId()
  const [paste, setPaste] = useState('')
  const [startRow, setStartRow] = useState(String(suggestedStartRow))
  const [error, setError] = useState<string | null>(null)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const n = Number.parseInt(startRow, 10)
    const steps = parsePatternText(paste, Number.isFinite(n) ? n : 1)
    if (steps.length === 0) {
      setError('No encontré filas en el texto. Pon una por línea, p. ej. «12: 2 juntos».')
      return
    }
    setError(null)
    onAddSteps(steps)
    setPaste('')
  }

  return (
    <form onSubmit={onSubmit} className="pattern-paste-form" aria-label="Pegar texto multilínea">
      <div className="field">
        <label htmlFor={pasteId}>Pegar texto del patrón (una línea por vuelta):</label>
        <textarea
          id={pasteId}
          rows={4}
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder={`Fila 1: 1 der, 1 rev\nFila 2: todo del derecho\nFila 3: 2 juntos, hebra...`}
          required
        />
      </div>

      <div className="field-row">
        <div className="field field--short">
          <label htmlFor={startRowId}>Fila inicial (si no viene numerada):</label>
          <input
            id={startRowId}
            type="number"
            min="0"
            max="9999"
            value={startRow}
            onChange={(e) => setStartRow(e.target.value)}
          />
        </div>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="form-actions">
        <BigButton type="submit" variant="secondary">
          Procesar y añadir texto
        </BigButton>
      </div>
    </form>
  )
}
