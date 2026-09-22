import { BigButton } from '../BigButton'

type ErgonomicsModalProps = {
  isOpen: boolean
  sessionMinutes: number
  onClose: () => void
  onRestCompleted: () => void
}

export function ErgonomicsModal({
  isOpen,
  sessionMinutes,
  onClose,
  onRestCompleted,
}: ErgonomicsModalProps) {
  if (!isOpen) return null

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ergo-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal-card modal-card--ergo">
        <div className="modal-card__header">
          <h2 id="ergo-title" className="modal-card__title">
            🧘 Pausa ergonómica ({Math.round(sessionMinutes)} min tejiendo)
          </h2>
          <button
            type="button"
            className="modal-card__close-btn"
            onClick={onClose}
            aria-label="Cerrar ventana de pausa"
          >
            ✕
          </button>
        </div>

        <div className="modal-card__body">
          <p className="ergo-intro">
            Llevas un buen rato en la labor. Cuidar tus articulaciones evita tendinitis y sobrecargas.
            Dedica 2 minutos a estos tres estiramientos suaves:
          </p>

          <ol className="ergo-exercises-list">
            <li className="ergo-exercise">
              <div className="ergo-exercise__icon">🔄</div>
              <div className="ergo-exercise__desc">
                <strong>Rotación de muñecas:</strong> Cierra suavemente los puños y gira las muñecas en círculos lentos, 10 veces en sentido horario y 10 en sentido antihorario.
              </div>
            </li>

            <li className="ergo-exercise">
              <div className="ergo-exercise__icon">✋</div>
              <div className="ergo-exercise__desc">
                <strong>Estiramiento de flexores y dedos:</strong> Extiende un brazo al frente con la palma hacia arriba. Con la otra mano, tira suavemente de los dedos hacia tu cuerpo durante 15 segundos. Repite con la otra mano.
              </div>
            </li>

            <li className="ergo-exercise">
              <div className="ergo-exercise__icon">🙆</div>
              <div className="ergo-exercise__desc">
                <strong>Liberación de hombros y cuello:</strong> Deja caer los brazos a los costados, sube los hombros hacia las orejas y haz 5 círculos amplios hacia atrás respirando hondo.
              </div>
            </li>
          </ol>
        </div>

        <div className="modal-card__footer">
          <BigButton type="button" variant="ghost" onClick={onClose}>
            Posponer 10 min
          </BigButton>
          <BigButton
            type="button"
            variant="primary"
            onClick={() => {
              onRestCompleted()
              onClose()
            }}
          >
            ✓ He descansado (reiniciar pausa)
          </BigButton>
        </div>
      </div>
    </div>
  )
}
