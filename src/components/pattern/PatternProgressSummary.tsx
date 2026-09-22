import type { PatternStep } from '../../lib/projects'

type PatternProgressSummaryProps = {
  steps: PatternStep[]
}

export function PatternProgressSummary({ steps }: PatternProgressSummaryProps) {
  if (steps.length === 0) return null

  const total = steps.length
  const completed = steps.filter((s) => s.done).length
  const percent = Math.round((completed / total) * 100)

  return (
    <div className="pattern-progress" aria-label="Progreso del patrón">
      <div className="pattern-progress__bar-wrap">
        <div
          className="pattern-progress__bar"
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={completed}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={`Progreso del patrón: ${percent}%`}
        />
      </div>
      <div className="pattern-progress__stats">
        <span>
          <strong>{completed}</strong> de <strong>{total}</strong> pasos completados ({percent}%)
        </span>
        <span>
          {completed === total
            ? '🎉 ¡Patrón completado!'
            : `${total - completed} ${
                total - completed === 1 ? 'paso pendiente' : 'pasos pendientes'
              }`}
        </span>
      </div>
    </div>
  )
}
