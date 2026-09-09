import { useId } from 'react'
import { PROJECT_FILTERS, type ProjectFilter } from '../../lib/projects'

export type SortMode = 'recent' | 'name' | 'rows'

type ProjectFiltersBarProps = {
  query: string
  onQueryChange: (q: string) => void
  filter: ProjectFilter
  onFilterChange: (f: ProjectFilter) => void
  sortMode: SortMode
  onSortModeChange: (s: SortMode) => void
}

export function ProjectFiltersBar({
  query,
  onQueryChange,
  filter,
  onFilterChange,
  sortMode,
  onSortModeChange,
}: ProjectFiltersBarProps) {
  const searchId = useId()
  const sortId = useId()

  return (
    <div className="project-filters-bar">
      <div className="project-filters-bar__top">
        <div className="field search-field">
          <label htmlFor={searchId}>Buscar por nombre</label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Buscar por nombre, lana o notas..."
          />
        </div>

        <div className="field sort-field">
          <label htmlFor={sortId}>Ordenar:</label>
          <select
            id={sortId}
            value={sortMode}
            onChange={(e) => onSortModeChange(e.target.value as SortMode)}
          >
            <option value="recent">Más recientes</option>
            <option value="name">Alfabético (A-Z)</option>
            <option value="rows">Más vueltas tejidas</option>
          </select>
        </div>
      </div>

      <div className="filter-chips" role="toolbar" aria-label="Filtros de proyectos">
        {PROJECT_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`filter-chip ${filter === f.id ? 'filter-chip--active' : ''}`}
            onClick={() => onFilterChange(f.id)}
            aria-pressed={filter === f.id}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  )
}
