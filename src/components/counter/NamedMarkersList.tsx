import { useId, useState, type FormEvent } from 'react'
import { BigButton } from '../BigButton'
import type { NamedMarker } from '../../lib/projects'

type NamedMarkersListProps = {
  markers: NamedMarker[]
  currentRow: number
  onAddMarker: (row: number, label: string) => void
  onRemoveMarker: (id: string) => void
}

export function NamedMarkersList({
  markers,
  currentRow,
  onAddMarker,
  onRemoveMarker,
}: NamedMarkersListProps) {
  const rowId = useId()
  const labelId = useId()
  const [row, setRow] = useState(() => String(currentRow))
  const [label, setLabel] = useState('')
  const [showForm, setShowForm] = useState(false)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const n = Number.parseInt(row, 10)
    if (!Number.isFinite(n) || n < 0) return
    const text = label.trim() || `Marcador fila ${n}`
    onAddMarker(n, text)
    setLabel('')
    setShowForm(false)
  }

  return (
    <section className="named-markers" aria-label="Marcadores con nombre">
      <div className="named-markers__header">
        <h3 className="named-markers__title">Marcadores con nombre</h3>
        <button
          type="button"
          className="named-markers__toggle-btn"
          onClick={() => {
            setRow(String(currentRow))
            setShowForm((prev) => !prev)
          }}
        >
          {showForm ? 'Cerrar' : '+ Añadir marcador'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="named-markers__form">
          <div className="field-row">
            <div className="field">
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
              <label htmlFor={labelId}>Nombre o nota:</label>
              <input
                id={labelId}
                type="text"
                maxLength={40}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ej. Sisa, Escote, Trenza"
              />
            </div>
          </div>
          <div className="form-actions">
            <BigButton type="submit" variant="primary">
              Guardar marcador
            </BigButton>
          </div>
        </form>
      )}

      {markers.length > 0 ? (
        <ul className="named-markers__list">
          {markers
            .slice()
            .sort((a, b) => a.row - b.row)
            .map((m) => (
              <li
                key={m.id}
                className={`named-markers__item ${
                  m.row === currentRow ? 'named-markers__item--current' : ''
                }`}
              >
                <div className="named-markers__info">
                  <span className="named-markers__badge">Fila {m.row}</span>
                  <span className="named-markers__name">{m.label}</span>
                </div>
                <button
                  type="button"
                  className="named-markers__del-btn"
                  onClick={() => onRemoveMarker(m.id)}
                  aria-label={`Eliminar marcador ${m.label} en fila ${m.row}`}
                >
                  ✕
                </button>
              </li>
            ))}
        </ul>
      ) : (
        !showForm && (
          <p className="named-markers__empty">
            No hay marcadores aún. Añade avisos para recordar cambios de punto, aumentos o sisas.
          </p>
        )
      )}
    </section>
  )
}
