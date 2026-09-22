import type { DOMAttributes } from 'react'
import { BigButton } from '../BigButton'

type CounterControlsProps = {
  locked: boolean
  canUndo: boolean
  rowHoldProps: DOMAttributes<HTMLButtonElement>
  rowHoldDownProps: DOMAttributes<HTMLButtonElement>
  stitchHoldProps: DOMAttributes<HTMLButtonElement>
  stitchHoldDownProps: DOMAttributes<HTMLButtonElement>
  onToggleLock: () => void
  onUndo: () => void
  onReset: () => void
  onShowShortcuts?: () => void
}

export function CounterControls({
  locked,
  canUndo,
  rowHoldProps,
  rowHoldDownProps,
  stitchHoldProps,
  stitchHoldDownProps,
  onToggleLock,
  onUndo,
  onReset,
  onShowShortcuts,
}: CounterControlsProps) {
  return (
    <section className="counter-controls" aria-label="Controles del contador">
      <div className="counter-controls__primary">
        <button
          type="button"
          className="counter-btn counter-btn--main counter-btn--plus"
          disabled={locked}
          aria-label="Sumar vueltas (+1, mantén para +5 o +10)"
          {...rowHoldProps}
        >
          <span className="counter-btn__icon">+1</span>
          <span className="counter-btn__text">Sumar vuelta</span>
        </button>

        <button
          type="button"
          className="counter-btn counter-btn--minus"
          disabled={locked}
          aria-label="Restar vueltas (-1, mantén para -5 o -10)"
          {...rowHoldDownProps}
        >
          <span className="counter-btn__icon">−1</span>
          <span className="counter-btn__text">Restar vuelta</span>
        </button>
      </div>

      <div className="counter-controls__secondary">
        <button
          type="button"
          className="counter-btn counter-btn--stitch"
          disabled={locked}
          aria-label="Sumar punto (+1)"
          {...stitchHoldProps}
        >
          <span>+1 punto</span>
        </button>

        <button
          type="button"
          className="counter-btn counter-btn--stitch"
          disabled={locked}
          aria-label="Restar punto (-1)"
          {...stitchHoldDownProps}
        >
          <span>−1 punto</span>
        </button>
      </div>

      <div className="counter-controls__actions">
        <BigButton
          type="button"
          variant="secondary"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Deshacer último cambio"
          title="Deshacer último toque (u)"
        >
          ↩ Deshacer
        </BigButton>

        <BigButton
          type="button"
          variant={locked ? 'primary' : 'secondary'}
          onClick={onToggleLock}
          aria-pressed={locked}
          aria-label={locked ? 'Desbloquear toques' : 'Bloquear toques'}
          title={locked ? 'Desbloquear toques (l)' : 'Bloquear toques (l)'}
        >
          {locked ? '🔓 Desbloquear' : '🔒 Bloquear toques'}
        </BigButton>

        {onShowShortcuts && (
          <BigButton
            type="button"
            variant="ghost"
            onClick={onShowShortcuts}
            aria-label="Ver atajos de teclado"
            title="Atajos de teclado (?)"
          >
            ⌨ Atajos
          </BigButton>
        )}

        <BigButton
          type="button"
          variant="ghost"
          onClick={onReset}
          aria-label="Poner contadores a cero"
        >
          Reiniciar
        </BigButton>
      </div>
    </section>
  )
}
