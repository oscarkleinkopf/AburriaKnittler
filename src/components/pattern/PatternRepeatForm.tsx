import { useId, useState, type FormEvent } from 'react'
import { BigButton } from '../BigButton'
import { parseRepeatSpec, type RepeatRangeResult } from '../../lib/projects'

type PatternRepeatFormProps = {
  onRepeat: (from: number, to: number, times: number) => RepeatRangeResult
  onMessage: (msg: string) => void
}

export function PatternRepeatForm({
  onRepeat,
  onMessage,
}: PatternRepeatFormProps) {
  const quickId = useId()
  const fromId = useId()
  const toId = useId()
  const timesId = useId()
  const [quickText, setQuickText] = useState('')
  const [fromRow, setFromRow] = useState('')
  const [toRow, setToRow] = useState('')
  const [times, setTimes] = useState('4')
  const [error, setError] = useState<string | null>(null)

  function handleQuickSubmit(e: FormEvent) {
    e.preventDefault()
    const spec = parseRepeatSpec(quickText)
    if (!spec) {
      setError('Escribe algo como «filas 10-20, 4 veces» o «10-20 x 4».')
      return
    }
    const res = onRepeat(spec.from, spec.to, spec.times)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setError(null)
    setQuickText('')
    onMessage(`Añadidas ${res.added} instrucciones al repetir el tramo ${spec.from}–${spec.to}.`)
  }

  function handleManualSubmit(e: FormEvent) {
    e.preventDefault()
    const from = Number.parseInt(fromRow, 10)
    const to = Number.parseInt(toRow, 10)
    const t = Number.parseInt(times, 10)
    if (!Number.isFinite(from) || !Number.isFinite(to) || !Number.isFinite(t)) {
      setError('Completa los números de fila y cantidad de repeticiones.')
      return
    }
    const res = onRepeat(from, to, t)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setError(null)
    onMessage(`Añadidas ${res.added} instrucciones al repetir el tramo ${from}–${to}.`)
  }

  return (
    <div className="pattern-repeat-section">
      <h3 className="section-subtitle">Repetir un tramo de filas</h3>
      <p className="section-desc">
        Duplica una secuencia de vueltas y desplaza automáticamente las siguientes.
      </p>

      <form onSubmit={handleQuickSubmit} className="pattern-repeat-quick">
        <div className="field">
          <label htmlFor={quickId}>Escribir en texto libre:</label>
          <div className="field-with-btn">
            <input
              id={quickId}
              type="text"
              value={quickText}
              onChange={(e) => setQuickText(e.target.value)}
              placeholder="Ej. filas 1 a 8, 4 veces"
            />
            <BigButton type="submit" variant="secondary">
              Aplicar
            </BigButton>
          </div>
        </div>
      </form>

      <details className="pattern-repeat-manual">
        <summary>O indicar filas a mano</summary>
        <form onSubmit={handleManualSubmit} className="pattern-repeat-manual-form">
          <div className="field-row">
            <div className="field">
              <label htmlFor={fromId}>Desde fila:</label>
              <input
                id={fromId}
                type="number"
                min="0"
                value={fromRow}
                onChange={(e) => setFromRow(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor={toId}>Hasta fila:</label>
              <input
                id={toId}
                type="number"
                min="0"
                value={toRow}
                onChange={(e) => setToRow(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor={timesId}>Veces en total:</label>
              <input
                id={timesId}
                type="number"
                min="2"
                max="40"
                value={times}
                onChange={(e) => setTimes(e.target.value)}
              />
            </div>
          </div>
          <div className="form-actions">
            <BigButton type="submit" variant="secondary">
              Repetir tramo
            </BigButton>
          </div>
        </form>
      </details>

      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  )
}
