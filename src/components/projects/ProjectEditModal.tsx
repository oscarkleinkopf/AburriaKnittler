import { useId, useState, type FormEvent } from 'react'
import { BigButton } from '../BigButton'

type ProjectEditModalProps = {
  initialName: string
  initialNotes: string
  onSave: (name: string, notes: string) => void
  onCancel: () => void
}

export function ProjectEditModal({
  initialName,
  initialNotes,
  onSave,
  onCancel,
}: ProjectEditModalProps) {
  const nameId = useId()
  const notesId = useId()
  const [name, setName] = useState(initialName)
  const [notes, setNotes] = useState(initialNotes)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSave(name, notes)
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-project-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div className="modal-card">
        <div className="modal-card__header">
          <h2 id="edit-project-title" className="modal-card__title">
            Editar proyecto
          </h2>
          <button
            type="button"
            className="modal-card__close-btn"
            onClick={onCancel}
            aria-label="Cerrar ventana de edición"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-card__body">
          <div className="field">
            <label htmlFor={nameId}>Nombre del proyecto:</label>
            <input
              id={nameId}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="field">
            <label htmlFor={notesId}>Notas o detalles:</label>
            <textarea
              id={notesId}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Color, talla, modificaciones..."
            />
          </div>

          <div className="modal-card__footer">
            <BigButton type="button" variant="ghost" onClick={onCancel}>
              Cancelar
            </BigButton>
            <BigButton type="submit" variant="primary">
              Guardar cambios
            </BigButton>
          </div>
        </form>
      </div>
    </div>
  )
}
