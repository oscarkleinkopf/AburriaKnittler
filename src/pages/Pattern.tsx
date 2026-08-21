import { useEffect, useId, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Banner } from '../components/Banner'
import { BigButton } from '../components/BigButton'
import { useProjects } from '../lib/ProjectsContext'
import {
  currentPatternStep,
  fileSlug,
  formatGauge,
  parsePatternText,
  parseRepeatSpec,
  patternStepToSpeech,
  patternStepsToText,
  sharePattern,
  sortedPatternSteps,
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
    movePatternStep,
    updateProject,
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
  const yarnId = useId()
  const needlesId = useId()
  const gaugeCmId = useId()
  const gaugeStitchesId = useId()
  const gaugeRowsId = useId()

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
  const orderIds = useMemo(
    () => (active ? sortedPatternSteps(active.patternSteps).map((s) => s.id) : []),
    [active],
  )

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
    a.download = `${fileSlug(active.name)}-patron.txt`
    a.click()
    URL.revokeObjectURL(url)
    setMessage('Descargado el patrón en texto.')
  }

  async function onSharePattern() {
    if (!active || active.patternSteps.length === 0) {
      setMessage('Aún no hay patrón para compartir.')
      return
    }
    try {
      const mode = await sharePattern(active)
      setMessage(
        mode === 'shared'
          ? 'Patrón listo para compartir (sin fotos ni contador).'
          : 'Descargado el patrón (.json), sin fotos ni contador.',
      )
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setMessage('No se pudo compartir el patrón.')
    }
  }

  function printPattern() {
    window.print()
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
    <section className="stack animate-enter pattern-page" aria-labelledby="pattern-title">
      <div className="no-print">
        <h1 id="pattern-title" className="page-title">
          Patrón por filas
        </h1>
        <p className="page-lead">
          Proyecto: <strong>{active.name}</strong>. Anota instrucciones por
          fila y márcalas cuando las completes.
        </p>
        {formatGauge(active) ? (
          <p className="project-notes-preview">{formatGauge(active)}</p>
        ) : null}
      </div>

      <article className="print-sheet" aria-hidden="true">
        <h1>{active.name}</h1>
        {formatGauge(active) ? <p>{formatGauge(active)}</p> : null}
        {active.notes.trim() ? <p>{active.notes}</p> : null}
        <ol>
          {sortedPatternSteps(active.patternSteps).map((step) => (
            <li key={step.id}>
              <strong>Fila {step.row}.</strong> {step.instruction}
            </li>
          ))}
        </ol>
      </article>

      {message && <Banner tone="info">{message}</Banner>}

      {nextStep && (
        <div className="pattern-next no-print">
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

      <form className="stack no-print" onSubmit={onAdd}>
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

      <form className="stack no-print" onSubmit={onPasteText}>
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

      <div className="stack no-print">
        <h2 className="section-title">Muestra / tensión</h2>
        <p className="muted">
          Para acertar la talla. Sale al imprimir y al compartir el patrón.
        </p>
        <div className="field">
          <label htmlFor={yarnId}>Lana o hilo</label>
          <input
            id={yarnId}
            value={active.yarn}
            onChange={(e) => updateProject(active.id, { yarn: e.target.value })}
            placeholder="Merina, algodón…"
          />
        </div>
        <div className="field">
          <label htmlFor={needlesId}>Agujas</label>
          <input
            id={needlesId}
            value={active.needles}
            onChange={(e) =>
              updateProject(active.id, { needles: e.target.value })
            }
            placeholder="4,5 mm"
          />
        </div>
        <div className="field">
          <label htmlFor={gaugeCmId}>Muestra en cm</label>
          <input
            id={gaugeCmId}
            type="number"
            min={1}
            inputMode="numeric"
            value={active.gaugeCm}
            onChange={(e) => {
              const n = Number.parseInt(e.target.value, 10)
              updateProject(active.id, {
                gaugeCm: Number.isFinite(n) ? n : 10,
              })
            }}
          />
        </div>
        <div className="field">
          <label htmlFor={gaugeStitchesId}>Puntos en esa muestra</label>
          <input
            id={gaugeStitchesId}
            type="number"
            min={0}
            inputMode="numeric"
            value={active.gaugeStitches || ''}
            onChange={(e) => {
              const n = Number.parseInt(e.target.value, 10)
              updateProject(active.id, {
                gaugeStitches: Number.isFinite(n) ? n : 0,
              })
            }}
            placeholder="0 = no"
          />
        </div>
        <div className="field">
          <label htmlFor={gaugeRowsId}>Filas en esa muestra</label>
          <input
            id={gaugeRowsId}
            type="number"
            min={0}
            inputMode="numeric"
            value={active.gaugeRows || ''}
            onChange={(e) => {
              const n = Number.parseInt(e.target.value, 10)
              updateProject(active.id, {
                gaugeRows: Number.isFinite(n) ? n : 0,
              })
            }}
            placeholder="0 = no"
          />
        </div>
      </div>

      <div className="stack no-print">
        <h2 className="section-title">Exportar patrón</h2>
        <p className="muted">
          Copia, descarga, comparte solo el patrón (sin fotos ni contador) o
          imprímelo.
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
          <BigButton
            type="button"
            variant="secondary"
            onClick={() => void onSharePattern()}
            disabled={active.patternSteps.length === 0}
          >
            Compartir patrón
          </BigButton>
          <BigButton
            type="button"
            variant="ghost"
            onClick={printPattern}
            disabled={active.patternSteps.length === 0}
          >
            Imprimir
          </BigButton>
        </div>
      </div>

      <form className="stack no-print" onSubmit={onRepeatText}>
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

      <form className="stack no-print" onSubmit={onRepeatForm}>
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

      <div className="stack no-print">
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
                        variant="ghost"
                        disabled={orderIds.indexOf(step.id) <= 0}
                        onClick={() => movePatternStep(step.id, -1)}
                      >
                        Subir
                      </BigButton>
                      <BigButton
                        type="button"
                        variant="ghost"
                        disabled={
                          orderIds.indexOf(step.id) >= orderIds.length - 1
                        }
                        onClick={() => movePatternStep(step.id, 1)}
                      >
                        Bajar
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

      <BigButton to="/contador" variant="secondary" block className="no-print">
        Ir al contador
      </BigButton>
    </section>
  )
}
