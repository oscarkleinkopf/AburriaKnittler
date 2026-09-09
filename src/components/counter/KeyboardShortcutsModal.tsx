import { useEffect, useRef } from 'react'
import { BigButton } from '../BigButton'

type KeyboardShortcutsModalProps = {
  isOpen: boolean
  onClose: () => void
}

const SHORTCUTS = [
  { key: 'Espacio / ↑', desc: 'Sumar 1 vuelta' },
  { key: '↓', desc: 'Restar 1 vuelta' },
  { key: 'u', desc: 'Deshacer último toque' },
  { key: 'l', desc: 'Bloquear / Desbloquear toques' },
  { key: 'f', desc: 'Alternar pantalla completa' },
  { key: 's', desc: 'Leer paso en voz alta' },
  { key: 'Esc', desc: 'Cerrar modal / Salir de pantalla completa' },
]

export function KeyboardShortcutsModal({
  isOpen,
  onClose,
}: KeyboardShortcutsModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal-card" ref={dialogRef}>
        <div className="modal-card__header">
          <h2 id="shortcuts-modal-title" className="modal-card__title">
            ⌨ Atajos de teclado
          </h2>
          <button
            type="button"
            className="modal-card__close-btn"
            onClick={onClose}
            aria-label="Cerrar ventana de atajos"
          >
            ✕
          </button>
        </div>

        <div className="modal-card__body">
          <p className="modal-card__intro">
            Puedes controlar el contador sin tocar la pantalla usando estos atajos:
          </p>
          <ul className="shortcuts-list">
            {SHORTCUTS.map((s) => (
              <li key={s.key} className="shortcuts-list__item">
                <kbd className="shortcuts-list__key">{s.key}</kbd>
                <span className="shortcuts-list__desc">{s.desc}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="modal-card__footer">
          <BigButton type="button" variant="primary" onClick={onClose}>
            Entendido
          </BigButton>
        </div>
      </div>
    </div>
  )
}
