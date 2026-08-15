import { useId, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Banner } from '../components/Banner'
import { BigButton } from '../components/BigButton'
import { useProjects } from '../lib/ProjectsContext'
import { currentPatternStep } from '../lib/projects'

export function PatternPage() {
  const {
    active,
    addPatternStep,
    togglePatternStep,
    removePatternStep,
  } = useProjects()
  const rowId = useId()
  const instrId = useId()
  const [row, setRow] = useState(() => String(active?.rows ?? 1))
  const [instruction, setInstruction] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const sorted = useMemo(() => {
    if (!active) return []
    return [...active.patternSteps].sort(
      (a, b) => a.row - b.row || Number(a.done) - Number(b.done),
    )
  }, [active])

  const nextStep = active ? currentPatternStep(active) : null

  function onAdd(e: FormEvent) {
    e.preventDefault()
    if (!active) return
    const n = Number.parseInt(row, 10)
    if (!Number.isFinite(n) || n < 0) {
      setMessage('Indica un número de fila válido.')
      return
    }
    if (!instruction.trim()) {
      setMessage('Escribe la instrucción de la fila.')
      return
    }
    addPatternStep(n, instruction)
    setInstruction('')
    setMessage(`Añadida instrucción para la fila ${n}.`)
  }

  if (!active) {
    return (
      <section className="stack animate-enter">
        <Banner tone="warn">
          No hay proyecto activo.{' '}
          <Link to="/proyectos">Crea uno en Proyectos</Link>.
        </Banner>
      </section>
    )
  }

  return (
    <section className="stack animate-enter" aria-labelledby="pattern-title">
      <div>
        <h1 id="pattern-title" className="page-title">
          Patrón por filas
        </h1>
        <p className="page-lead">
          Proyecto: <strong>{active.name}</strong>. Anota instrucciones por
          fila y márcalas cuando las completes.
        </p>
      </div>

      {message && <Banner tone="info">{message}</Banner>}

      {nextStep && (
        <div className="pattern-next">
          <p className="project-active__label">Siguiente paso</p>
          <p className="pattern-next__row">Fila {nextStep.row}</p>
          <p className="pattern-next__text">{nextStep.instruction}</p>
          <BigButton
            type="button"
            variant="primary"
            onClick={() => {
              togglePatternStep(nextStep.id)
              setMessage(`Fila ${nextStep.row} marcada como hecha.`)
            }}
          >
            Marcar hecha
          </BigButton>
        </div>
      )}

      <form className="stack" onSubmit={onAdd}>
        <h2 className="section-title">Nueva instrucción</h2>
        <div className="field">
          <label htmlFor={rowId}>Fila</label>
          <input
            id={rowId}
            type="number"
            min={0}
            inputMode="numeric"
            value={row}
            onChange={(e) => setRow(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor={instrId}>Instrucción</label>
          <textarea
            id={instrId}
            rows={2}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="Ej. 2 juntos, lazada, derecho hasta el final"
            required
          />
        </div>
        <BigButton type="submit" variant="secondary" block>
          Añadir al patrón
        </BigButton>
      </form>

      <div className="stack">
        <h2 className="section-title">Instrucciones</h2>
        {sorted.length === 0 ? (
          <p className="muted">
            Aún no hay pasos. Añade algo como «fila 12: 2 juntos, lazada» y
            márcalo cuando lo tejas.
          </p>
        ) : (
          <ul className="pattern-list">
            {sorted.map((step) => (
              <li
                key={step.id}
                className={`pattern-item${step.done ? ' pattern-item--done' : ''}`}
              >
                <div>
                  <p className="pattern-item__row">Fila {step.row}</p>
                  <p className="pattern-item__text">{step.instruction}</p>
                </div>
                <div className="row-actions">
                  <BigButton
                    type="button"
                    variant={step.done ? 'ghost' : 'primary'}
                    onClick={() => togglePatternStep(step.id)}
                  >
                    {step.done ? 'Desmarcar' : 'Hecha'}
                  </BigButton>
                  <BigButton
                    type="button"
                    variant="danger"
                    onClick={() => {
                      if (window.confirm('¿Borrar esta instrucción?')) {
                        removePatternStep(step.id)
                      }
                    }}
                  >
                    Borrar
                  </BigButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <BigButton to="/contador" variant="secondary" block>
        Ir al contador
      </BigButton>
    </section>
  )
}
