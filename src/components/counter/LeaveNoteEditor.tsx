import { useId, useState, useEffect } from 'react'
import { MAX_LEAVE_NOTE } from '../../lib/projects'

type LeaveNoteEditorProps = {
  note: string
  onSave: (note: string) => void
}

export function LeaveNoteEditor({ note, onSave }: LeaveNoteEditorProps) {
  const id = useId()
  const [text, setText] = useState(note)

  useEffect(() => {
    setText(note)
  }, [note])

  function handleChange(val: string) {
    const next = val.slice(0, MAX_LEAVE_NOTE)
    setText(next)
    onSave(next)
  }

  const remaining = MAX_LEAVE_NOTE - text.length

  return (
    <section className="leave-note-editor" aria-label="Recado de dónde lo dejé">
      <div className="leave-note-editor__header">
        <label htmlFor={id} className="leave-note-editor__label">
          Dónde lo dejé
        </label>
        <span
          className={`leave-note-editor__counter ${
            remaining < 30 ? 'leave-note-editor__counter--warn' : ''
          }`}
          aria-live="polite"
        >
          {remaining} caracteres
        </span>
      </div>

      <textarea
        id={id}
        className="leave-note-editor__textarea"
        rows={2}
        maxLength={MAX_LEAVE_NOTE}
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Ej. Fila 14 terminada. Toca menguar 1 p. a cada lado en la siguiente vuelta..."
      />
    </section>
  )
}
