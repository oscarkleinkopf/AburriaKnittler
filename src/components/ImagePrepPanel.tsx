import { useId } from 'react'
import { BigButton } from './BigButton'
import {
  nextRotation,
  prevRotation,
  type PrepState,
} from '../lib/imagePrep'

type Props = {
  prep: PrepState
  onChange: (next: PrepState) => void
  onApply: () => void
  onReset: () => void
  busy?: boolean
}

export function ImagePrepPanel({
  prep,
  onChange,
  onApply,
  onReset,
  busy = false,
}: Props) {
  const cropId = useId()

  return (
    <div className="image-prep stack">
      <h2 className="section-title">Preparar foto</h2>
      <p className="muted">
        Rota o acerca el recuadro al tejido antes de analizar.
      </p>

      <div className="image-prep__stage">
        <div
          className="image-prep__frame"
          style={{
            ['--crop-inset' as string]: `${prep.cropInset}%`,
          }}
        >
          <img
            className="image-prep__img"
            src={prep.sourceUrl}
            alt="Foto a preparar"
            style={{ transform: `rotate(${prep.rotation}deg)` }}
          />
          <div className="image-prep__crop" aria-hidden="true" />
        </div>
      </div>

      <div className="row-actions">
        <BigButton
          type="button"
          variant="secondary"
          onClick={() =>
            onChange({ ...prep, rotation: prevRotation(prep.rotation) })
          }
          disabled={busy}
        >
          Rotar ↺
        </BigButton>
        <BigButton
          type="button"
          variant="secondary"
          onClick={() =>
            onChange({ ...prep, rotation: nextRotation(prep.rotation) })
          }
          disabled={busy}
        >
          Rotar ↻
        </BigButton>
      </div>

      <div className="field">
        <label htmlFor={cropId}>
          Acercar recorte ({prep.cropInset}%)
        </label>
        <input
          id={cropId}
          type="range"
          min={0}
          max={40}
          step={1}
          value={prep.cropInset}
          disabled={busy}
          onChange={(e) =>
            onChange({
              ...prep,
              cropInset: Number.parseInt(e.target.value, 10) || 0,
            })
          }
        />
      </div>

      <div className="row-actions">
        <BigButton
          type="button"
          variant="primary"
          onClick={onApply}
          disabled={busy}
        >
          {busy ? 'Aplicando…' : 'Usar esta foto'}
        </BigButton>
        <BigButton
          type="button"
          variant="ghost"
          onClick={onReset}
          disabled={busy}
        >
          Quitar foto
        </BigButton>
      </div>
    </div>
  )
}
