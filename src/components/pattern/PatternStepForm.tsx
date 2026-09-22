import { useId, useState, type FormEvent } from 'react'
import { BigButton } from '../BigButton'

type PatternStepFormProps = {
  suggestedRow: number
  onAddStep: (row: number, instruction: string) => void
}

export function PatternStepForm({
  suggestedRow,
  onAddStep,
}: PatternStepFormProps) {
  const rowId = useId()
  const instrId = useId()
  const [row, setRow] = useState(String(suggestedRow))
  const [instruction, setInstruction] = useState('')

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const n = Number.parseInt(row, 10)
    if (!Number.isFinite(n) || n < 0 || !instruction.trim()) return
    onAddStep(n, instruction.trim())
    setInstruction('')
    setRow(String(n + 1))
  }

  return (
    <form onSubmit={onSubmit} className="pattern-step-form" aria-label="Añadir paso al patrón">
      <div className="field-row">
        <div className="field field--short">
          <label htmlFor={rowId}>Fila:</label>
          <input
            id={rowId}
            type="number"
            min="0"
            max="9999"
            value={row}
            onChange={(e) => setRow(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor={instrId}>Instrucción de la fila:</label>
          <input
            id={instrId}
            type="text"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="Ej. 1 der, *1 hebra, 2 juntos*, 1 der"
            required
          />
        </div>
      </div>
      <div className="form-actions">
        <BigButton type="submit" variant="primary">
          Añadir al patrón
        </BigButton>
      </div>
    </form>
  )
}
