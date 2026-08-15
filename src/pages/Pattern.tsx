import { useEffect, useId, useMemo, useState, type FormEvent } from 'react'
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
    updatePatternStep,
    removePatternStep,
    markOpened,
  } = useProjects()
  const rowId = useId()
  const instrId = useId()
  const [row, setRow] = useState(() => String(active?.rows ?? 1))
  const [instruction, setInstruction] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [hideDone, setHideDone] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRow, setEditRow] = useState('')
  const [editInstruction, setEditInstruction] = useState('')

  useEffect(() => {
    markOpened()
  }, [active?.id, markOpened])

  useEffect(() => {
    if (active) setRow(String(Math.max(0, active.rows)))
  }, [active?.id])

  const sorted = useMemo(() => {
    if (!active) return []
    return [...active.patternSteps]
      .filter((s) => !hideDone || !s.done)
      .sort((a, b) => a.row - b.row || Number(a.done) - Number(b.done))
  }, [active, hideDone])

  const nextStep = active ? currentPatternStep(active) : null
  const doneCount = active?.patternSteps.filter((s) => s.done).length ?? 0

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
    setRow(String(n + 1))
    setMessage(`Añadida instrucción para la fila ${n}.`)
  }

  function startEdit(id: string) {
    const step = active?.patternSteps.find((s) => s.id === id)
    if (!step) return
    setEditingId(id)
    setEditRow(String(step.row))
    setEditInstruction(step.instruction)
  }

  function saveEdit(e: FormEvent) {
    e.preventDefault()
    if (!editingId) return
    const n = Number.parseInt(editRow, 10)
    if (!Number.isFinite(n) || n < 0) {
      setMessage('Indica un número de fila válido.')
      return
    }
    updatePatternStep(editingId, {
      row: n,
      instruction: editInstruction,
    })
    setEditingId(null)
    setMessage(`Fila ${n} actualizada.`)
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
        {doneCount > 0 && (
          <label className="backup-mode">
            <input
              type="checkbox"
              checked={hideDone}
              onChange={(e) => setHideDone(e.target.checked)}
            />
            Ocultar hechas ({doneCount})
          </label>
        )}
        {sorted.length === 0 ? (
          <p className="muted">
            {hideDone
              ? 'No quedan pasos pendientes. Desmarca «Ocultar hechas» para verlos.'
              : 'Aún no hay pasos. Añade algo como «fila 12: 2 juntos, lazada» y márcalo cuando lo tejas.'}
          </p>
        ) : (
          <ul className="pattern-list">
            {sorted.map((step) => (
              <li
                key={step.id}
                className={`pattern-item${step.done ? ' pattern-item--done' : ''}`}
              >
                {editingId === step.id ? (
                  <form className="stack" onSubmit={saveEdit}>
                    <div className="field">
                      <label htmlFor={`edit-row-${step.id}`}>Fila</label>
                      <input
                        id={`edit-row-${step.id}`}
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={editRow}
                        onChange={(e) => setEditRow(e.target.value)}
                        required
                      />
                    </div>
                    <div className="field">
                      <label htmlFor={`edit-instr-${step.id}`}>
                        Instrucción
                      </label>
                      <textarea
                        id={`edit-instr-${step.id}`}
                        rows={2}
                        value={editInstruction}
                        onChange={(e) => setEditInstruction(e.target.value)}
                        required
                      />
                    </div>
                    <div className="row-actions">
                      <BigButton type="submit" variant="primary">
                        Guardar
                      </BigButton>
                      <BigButton
                        type="button"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                      >
                        Cancelar
                      </BigButton>
                    </div>
                  </form>
                ) : (
                  <>
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
                        variant="ghost"
                        onClick={() => startEdit(step.id)}
                      >
                        Editar
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
                  </>
                )}
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
