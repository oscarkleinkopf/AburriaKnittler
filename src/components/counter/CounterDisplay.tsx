import type { PatternStep } from '../../lib/projects'

type CounterDisplayProps = {
  rows: number
  stitches: number
  bump: boolean
  locked: boolean
  fullscreen: boolean
  currentStep: PatternStep | null
  onToggleFullscreen: () => void
}

export function CounterDisplay({
  rows,
  stitches,
  bump,
  locked,
  fullscreen,
  currentStep,
  onToggleFullscreen,
}: CounterDisplayProps) {
  return (
    <div
      className={`counter-display ${bump ? 'counter-display--bump' : ''} ${
        locked ? 'counter-display--locked' : ''
      }`}
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="counter-display__header">
        <div className="counter-display__tags">
          {locked && (
            <span className="counter-display__locked-badge" role="status">
              🔒 Bloqueado
            </span>
          )}
        </div>
        <button
          type="button"
          className="counter-display__fullscreen-btn"
          onClick={onToggleFullscreen}
          aria-label={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          title={fullscreen ? 'Salir de pantalla completa (f)' : 'Pantalla completa (f)'}
        >
          {fullscreen ? '✕ Salir' : '⛶ Pantalla completa'}
        </button>
      </div>

      <div className="counter-display__main">
        <div className="counter-display__row-count">
          <span className="counter-display__row-num">{rows}</span>
          <span className="counter-display__row-label">
            {rows === 1 ? 'vuelta' : 'vueltas'}
          </span>
        </div>

        {stitches > 0 && (
          <div className="counter-display__stitch-count">
            <span className="counter-display__stitch-num">{stitches}</span>
            <span className="counter-display__stitch-label">
              {stitches === 1 ? 'punto' : 'puntos'}
            </span>
          </div>
        )}
      </div>

      {currentStep && (
        <div className="counter-display__step-hint">
          <span className="counter-display__step-badge">Fila {currentStep.row}</span>
          <span className="counter-display__step-text">
            {currentStep.instruction}
          </span>
        </div>
      )}
    </div>
  )
}
