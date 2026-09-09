import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Banner } from '../components/Banner'
import { BigButton } from '../components/BigButton'
import { GaugeForm } from '../components/pattern/GaugeForm'
import {
  PatternFilterBar,
  type PatternFilterMode,
} from '../components/pattern/PatternFilterBar'
import { PatternPasteForm } from '../components/pattern/PatternPasteForm'
import { PatternProgressSummary } from '../components/pattern/PatternProgressSummary'
import { PatternRepeatForm } from '../components/pattern/PatternRepeatForm'
import { PatternStepForm } from '../components/pattern/PatternStepForm'
import { PatternStepItem } from '../components/pattern/PatternStepItem'
import { YarnCalculator } from '../components/pattern/YarnCalculator'
import { useProjects } from '../lib/ProjectsContext'
import {
  fileSlug,
  patternStepsToText,
  sharePattern,
  sortedPatternSteps,
} from '../lib/projects'
import { stopSpeaking } from '../lib/speech'

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

  const [message, setMessage] = useState<string | null>(null)
  const [filterMode, setFilterMode] = useState<PatternFilterMode>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    markOpened()
  }, [active?.id, markOpened])

  useEffect(() => {
    return () => stopSpeaking()
  }, [])

  const allSorted = useMemo(() => {
    if (!active) return []
    return sortedPatternSteps(active.patternSteps)
  }, [active])

  const pendingCount = useMemo(
    () => allSorted.filter((s) => !s.done).length,
    [allSorted],
  )
  const doneCount = allSorted.length - pendingCount

  const visibleSteps = useMemo(() => {
    return allSorted.filter((s) => {
      if (filterMode === 'pending' && s.done) return false
      if (filterMode === 'done' && !s.done) return false
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase()
        const text = `fila ${s.row} ${s.instruction}`.toLowerCase()
        if (!text.includes(q)) return false
      }
      return true
    })
  }, [allSorted, filterMode, searchQuery])

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
      const outcome = await sharePattern(active)
      if (outcome === 'downloaded') {
        setMessage('Patrón descargado en formato JSON.')
      }
    } catch {
      // Ignorar cancelaciones
    }
  }

  function handlePrint() {
    window.print()
  }

  if (!active) {
    return (
      <div className="page page--pattern">
        <Banner tone="info">
          No hay ningún proyecto activo. Ve a{' '}
          <Link to="/proyectos">Proyectos</Link> para crear o elegir uno.
        </Banner>
      </div>
    )
  }

  const suggestedNextRow =
    active.patternSteps.length > 0
      ? Math.max(...active.patternSteps.map((s) => s.row)) + 1
      : active.rows > 0
        ? active.rows
        : 1

  return (
    <div className="page page--pattern">
      <header className="page-header">
        <div className="page-header__main">
          <h1 className="page-title">Patrón por filas</h1>
          <p className="page-lead">{active.name}</p>
        </div>

        <div className="page-header__actions">
          <BigButton
            type="button"
            variant="secondary"
            onClick={onSharePattern}
            disabled={active.patternSteps.length === 0}
          >
            Compartir patrón
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
            variant="ghost"
            onClick={handlePrint}
            disabled={active.patternSteps.length === 0}
          >
            Imprimir
          </BigButton>
        </div>
      </header>

      {message && (
        <Banner tone="info">
          <div className="banner__inline-wrap">
            <span>{message}</span>
            <button
              type="button"
              className="banner-close-btn"
              onClick={() => setMessage(null)}
              aria-label="Cerrar mensaje"
            >
              ✕
            </button>
          </div>
        </Banner>
      )}

      <PatternProgressSummary steps={active.patternSteps} />

      <section className="pattern-steps-section" aria-label="Instrucciones del patrón">
        <div className="pattern-steps-section__header">
          <h2 className="section-title">
            Instrucciones ({active.patternSteps.length})
          </h2>
        </div>

        {active.patternSteps.length > 0 && (
          <PatternFilterBar
            filter={filterMode}
            onFilterChange={setFilterMode}
            query={searchQuery}
            onQueryChange={setSearchQuery}
            totalCount={active.patternSteps.length}
            pendingCount={pendingCount}
            doneCount={doneCount}
          />
        )}

        {visibleSteps.length > 0 ? (
          <ol className="pattern-steps-list">
            {visibleSteps.map((step, idx) => (
              <PatternStepItem
                key={step.id}
                step={step}
                isCurrentRow={step.row === active.rows}
                isFirst={idx === 0}
                isLast={idx === visibleSteps.length - 1}
                onToggle={togglePatternStep}
                onUpdate={updatePatternStep}
                onDelete={removePatternStep}
                onMove={movePatternStep}
              />
            ))}
          </ol>
        ) : (
          <p className="pattern-empty">
            {active.patternSteps.length === 0
              ? 'Aún no hay instrucciones en este patrón. Añade filas sueltas o pega un bloque de texto.'
              : 'No hay instrucciones que coincidan con los filtros de búsqueda.'}
          </p>
        )}
      </section>

      <section className="pattern-add-section">
        <h2 className="section-title">Añadir instrucciones</h2>
        <PatternStepForm
          suggestedRow={suggestedNextRow}
          onAddStep={(row, instr) => {
            addPatternStep(row, instr)
            setMessage(`Añadida instrucción para la fila ${row}.`)
          }}
        />

        <details className="pattern-paste-details">
          <summary>Pegar texto con varias filas a la vez</summary>
          <PatternPasteForm
            suggestedStartRow={suggestedNextRow}
            onAddSteps={(steps) => {
              addPatternSteps(steps)
              setMessage(`Añadidas ${steps.length} instrucciones desde el texto.`)
            }}
          />
        </details>

        {active.patternSteps.length > 1 && (
          <PatternRepeatForm
            onRepeat={repeatPatternRange}
            onMessage={setMessage}
          />
        )}
      </section>

      <GaugeForm project={active} onUpdate={(patch) => updateProject(active.id, patch)} />

      <YarnCalculator
        project={active}
        onSetTargetRows={(rows) => updateProject(active.id, { targetRows: rows })}
      />
    </div>
  )
}
