import { useId } from 'react'

export type PatternFilterMode = 'all' | 'pending' | 'done'

type PatternFilterBarProps = {
  filter: PatternFilterMode
  onFilterChange: (mode: PatternFilterMode) => void
  query: string
  onQueryChange: (q: string) => void
  totalCount: number
  pendingCount: number
  doneCount: number
}

export function PatternFilterBar({
  filter,
  onFilterChange,
  query,
  onQueryChange,
  totalCount,
  pendingCount,
  doneCount,
}: PatternFilterBarProps) {
  const searchId = useId()

  return (
    <div className="pattern-filter-bar">
      <div className="pattern-filter-chips" role="toolbar" aria-label="Filtrar instrucciones">
        <button
          type="button"
          className={`filter-chip ${filter === 'all' ? 'filter-chip--active' : ''}`}
          onClick={() => onFilterChange('all')}
          aria-pressed={filter === 'all'}
        >
          Todas ({totalCount})
        </button>
        <button
          type="button"
          className={`filter-chip ${filter === 'pending' ? 'filter-chip--active' : ''}`}
          onClick={() => onFilterChange('pending')}
          aria-pressed={filter === 'pending'}
        >
          Pendientes ({pendingCount})
        </button>
        <button
          type="button"
          className={`filter-chip ${filter === 'done' ? 'filter-chip--active' : ''}`}
          onClick={() => onFilterChange('done')}
          aria-pressed={filter === 'done'}
        >
          Completadas ({doneCount})
        </button>
      </div>

      <div className="field search-field">
        <label htmlFor={searchId} className="sr-only">
          Buscar en el patrón
        </label>
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Buscar instrucciones o filas..."
        />
      </div>
    </div>
  )
}
