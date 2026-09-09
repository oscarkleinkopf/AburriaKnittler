import { useState, type FormEvent } from 'react'
import { BigButton } from '../BigButton'
import { patternStepToSpeech, type PatternStep } from '../../lib/projects'
import { canSpeak, speakText } from '../../lib/speech'

type PatternStepItemProps = {
  step: PatternStep
  isCurrentRow: boolean
  isFirst: boolean
  isLast: boolean
  onToggle: (id: string) => void
  onUpdate: (id: string, patch: { row?: number; instruction?: string }) => void
  onDelete: (id: string) => void
  onMove: (id: string, direction: -1 | 1) => void
}

export function PatternStepItem({
  step,
  isCurrentRow,
  isFirst,
  isLast,
  onToggle,
  onUpdate,
  onDelete,
  onMove,
}: PatternStepItemProps) {
  const [editing, setEditing] = useState(false)
  const [editRow, setEditRow] = useState(String(step.row))
  const [editInstruction, setEditInstruction] = useState(step.instruction)
  const [speaking, setSpeaking] = useState(false)

  function handleSave(e: FormEvent) {
    e.preventDefault()
    const n = Number.parseInt(editRow, 10)
    onUpdate(step.id, {
      row: Number.isFinite(n) && n >= 0 ? n : step.row,
      instruction: editInstruction.trim() || step.instruction,
    })
    setEditing(false)
  }

  function handleSpeak() {
    setSpeaking(true)
    speakText(patternStepToSpeech(step))
    window.setTimeout(() => setSpeaking(false), 2000)
  }

  if (editing) {
    return (
      <li className="pattern-step pattern-step--editing">
        <form onSubmit={handleSave} className="pattern-step__edit-form">
          <div className="field-row">
            <div className="field field--short">
              <label htmlFor={`edit-row-${step.id}`}>Fila:</label>
              <input
                id={`edit-row-${step.id}`}
                type="number"
                min="0"
                max="9999"
                value={editRow}
                onChange={(e) => setEditRow(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor={`edit-instr-${step.id}`}>Instrucción:</label>
              <input
                id={`edit-instr-${step.id}`}
                type="text"
                value={editInstruction}
                onChange={(e) => setEditInstruction(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>
          <div className="form-actions">
            <BigButton type="submit" variant="primary">
              Guardar
            </BigButton>
            <BigButton
              type="button"
              variant="ghost"
              onClick={() => {
                setEditRow(String(step.row))
                setEditInstruction(step.instruction)
                setEditing(false)
              }}
            >
              Cancelar
            </BigButton>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li
      className={`pattern-step ${step.done ? 'pattern-step--done' : ''} ${
        isCurrentRow ? 'pattern-step--current' : ''
      }`}
    >
      <div className="pattern-step__check-wrap">
        <input
          id={`step-${step.id}`}
          type="checkbox"
          checked={step.done}
          onChange={() => onToggle(step.id)}
          aria-label={`Fila ${step.row}: marcar ${step.done ? 'pendiente' : 'completada'}`}
        />
      </div>

      <div className="pattern-step__content">
        <label htmlFor={`step-${step.id}`} className="pattern-step__label">
          <span className="pattern-step__row-badge">Fila {step.row}</span>
          <span className="pattern-step__text">{step.instruction}</span>
        </label>
        {isCurrentRow && (
          <span className="pattern-step__current-indicator">
            ← Vuelta actual
          </span>
        )}
      </div>

      <div className="pattern-step__actions">
        {canSpeak() && (
          <button
            type="button"
            className="step-icon-btn"
            disabled={speaking}
            onClick={handleSpeak}
            aria-label={`Leer fila ${step.row} en voz alta`}
            title="Leer en voz alta"
          >
            {speaking ? '🔊' : '🗣'}
          </button>
        )}

        <button
          type="button"
          className="step-icon-btn"
          disabled={isFirst}
          onClick={() => onMove(step.id, -1)}
          aria-label={`Subir fila ${step.row}`}
          title="Subir"
        >
          ▲
        </button>

        <button
          type="button"
          className="step-icon-btn"
          disabled={isLast}
          onClick={() => onMove(step.id, 1)}
          aria-label={`Bajar fila ${step.row}`}
          title="Bajar"
        >
          ▼
        </button>

        <button
          type="button"
          className="step-icon-btn"
          onClick={() => setEditing(true)}
          aria-label={`Editar instrucción de fila ${step.row}`}
          title="Editar"
        >
          ✎
        </button>

        <button
          type="button"
          className="step-icon-btn step-icon-btn--danger"
          onClick={() => onDelete(step.id)}
          aria-label={`Eliminar fila ${step.row}`}
          title="Eliminar"
        >
          ✕
        </button>
      </div>
    </li>
  )
}
