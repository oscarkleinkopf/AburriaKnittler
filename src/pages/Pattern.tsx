import { useEffect, useId, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Banner } from '../components/Banner'
import { BigButton } from '../components/BigButton'
import { useProjects } from '../lib/ProjectsContext'
import {
  currentPatternStep,
  parsePatternText,
  parseRepeatSpec,
  patternStepToSpeech,
  patternStepsToText,
} from '../lib/projects'
import { canSpeak, speakText, stopSpeaking } from '../lib/speech'

export function PatternPage() {
  const {
    active,
    addPatternStep,
    addPatternSteps,
    repeatPatternRange,
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
  const [paste, setPaste] = useState('')
  const [speaking, setSpeaking] = useState(false)
  const pasteId = useId()
  const [editRow, setEditRow] = useState('')
  const [editInstruction, setEditInstruction] = useState('')
  const [repeatText, setRepeatText] = useState('')
  const [repeatFrom, setRepeatFrom] = useState('')
  const [repeatTo, setRepeatTo] = useState('')
  const [repeatTimes, setRepeatTimes] = useState('4')
  const repeatTextId = useId()
  const repeatFromId = useId()
  const repeatToId = useId()
  const repeatTimesId = useId()

  useEffect(() => {
    markOpened()
  }, [active?.id, markOpened])

  useEffect(() => {
    return () => stopSpeaking()
  }, [])

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

  function onPasteText(e: FormEvent) {
    e.preventDefault()
    const start = Number.parseInt(row, 10)
    const steps = parsePatternText(
      paste,
      Number.isFinite(start) ? start : 1,
    )
    if (steps.length === 0) {
      setMessage('No encontré filas en el texto. Una por línea, p. ej. «12: 2 juntos».')
      return
    }
    addPatternSteps(steps)
    setPaste('')
    setMessage(`Añadidas ${steps.length} instrucciones desde el texto.`)
  }

  function fileSafeName(name: string): string {
    const slug = name
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-|-$/g, '')
    return slug || 'patron'
  }

  async function copyPattern() {
    if (!active) return
    const text = patternStepsToText(active.patternSteps)
    if (!text) {
      setMessage('Aún no hay patrón para copiar.')
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      setMessage('Patrón copiado. Pégalo donde quieras.')
    } catch {
      setMessage('No pude copiar. Usa «Descargar texto».')
    }
  }

  function downloadPattern() {
    if (!active) return
    const text = patternStepsToText(active.patternSteps)
    if (!text) {
      setMessage('Aún no hay patrón para exportar.')
      return
    }
    const blob = new Blob([`${text}\n`], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${fileSafeName(active.name)}-patron.txt`
    a.click()
    URL.revokeObjectURL(url)
    setMessage('Descargado el patrón en texto.')
  }

  function applyRepeat(from: number, to: number, times: number) {
    const result = repeatPatternRange(from, to, times)
    if (!result.ok) {
      setMessage(result.error)
      return
    }
    setMessage(
      `Repetidas filas ${Math.min(from, to)}–${Math.max(from, to)} ${times} veces (+${result.added} pasos).`,
    )
  }

  function onRepeatText(e: FormEvent) {
    e.preventDefault()
    const spec = parseRepeatSpec(repeatText)
    if (!spec) {
      setMessage(
        'No entendí la repetición. Prueba «filas 10-20, 4 veces» o «10-20 x 4».',
      )
      return
    }
    applyRepeat(spec.from, spec.to, spec.times)
    setRepeatText('')
  }

  function onRepeatForm(e: FormEvent) {
    e.preventDefault()
    const from = Number.parseInt(repeatFrom, 10)
    const to = Number.parseInt(repeatTo, 10)
    const times = Number.parseInt(repeatTimes, 10)
    if (![from, to, times].every((n) => Number.isFinite(n))) {
      setMessage('Indica fila inicial, final y cuántas veces.')
      return
    }
    applyRepeat(from, to, times)
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
          <div className="row-actions">
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
            {canSpeak() && (
              <BigButton
                type="button"
                variant="ghost"
                onClick={() => {
                  if (speaking) {
                    stopSpeaking()
                    setSpeaking(false)
                    return
                  }
                  speakText(patternStepToSpeech(nextStep))
                  setSpeaking(true)
                }}
              >
                {speaking ? 'Detener' : 'Leer paso'}
              </BigButton>
            )}
          </div>
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

      <form className="stack" onSubmit={onPasteText}>
        <h2 className="section-title">Pegar patrón</h2>
        <p className="muted">
          Una instrucción por línea. Acepta «12: 2 juntos», «Fila 8 lazada» o
          líneas sin número (sigue desde la fila de arriba).
        </p>
        <div className="field">
          <label htmlFor={pasteId}>Texto del patrón</label>
          <textarea
            id={pasteId}
            rows={5}
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder={'12: 2 juntos, lazada\n13: derecho hasta el final'}
          />
        </div>
        <BigButton type="submit" variant="ghost" block disabled={!paste.trim()}>
          Añadir desde texto
        </BigButton>
      </form>

      <div className="stack">
        <h2 className="section-title">Exportar patrón</h2>
        <p className="muted">
          Copia o descarga el mismo formato que puedes pegar luego.
        </p>
        <div className="row-actions">
          <BigButton
            type="button"
            variant="secondary"
            onClick={() => void copyPattern()}
            disabled={active.patternSteps.length === 0}
          >
            Copiar texto
          </BigButton>
          <BigButton
            type="button"
            variant="ghost"
            onClick={downloadPattern}
            disabled={active.patternSteps.length === 0}
          >
            Descargar texto
          </BigButton>
        </div>
      </div>

      <form className="stack" onSubmit={onRepeatText}>
        <h2 className="section-title">Repetir un tramo</h2>
        <p className="muted">
          Ejemplo: «filas 10-20, 4 veces» o «10-20 x 4». Copia esas filas a
          continuación y desplaza lo que vaya después.
        </p>
        <div className="field">
          <label htmlFor={repeatTextId}>Repetición en texto</label>
          <input
            id={repeatTextId}
            value={repeatText}
            onChange={(e) => setRepeatText(e.target.value)}
            placeholder="filas 10-20, 4 veces"
          />
        </div>
        <BigButton
          type="submit"
          variant="ghost"
          block
          disabled={!repeatText.trim() || active.patternSteps.length === 0}
        >
          Repetir desde el texto
        </BigButton>
      </form>

      <form className="stack" onSubmit={onRepeatForm}>
        <div className="field">
          <label htmlFor={repeatFromId}>Desde la fila</label>
          <input
            id={repeatFromId}
            type="number"
            min={0}
            inputMode="numeric"
            value={repeatFrom}
            onChange={(e) => setRepeatFrom(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor={repeatToId}>Hasta la fila</label>
          <input
            id={repeatToId}
            type="number"
            min={0}
            inputMode="numeric"
            value={repeatTo}
            onChange={(e) => setRepeatTo(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor={repeatTimesId}>Veces (incluye la original)</label>
          <input
            id={repeatTimesId}
            type="number"
            min={2}
            max={40}
            inputMode="numeric"
            value={repeatTimes}
            onChange={(e) => setRepeatTimes(e.target.value)}
            required
          />
        </div>
        <BigButton
          type="submit"
          variant="secondary"
          block
          disabled={active.patternSteps.length === 0}
        >
          Repetir ese tramo
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
