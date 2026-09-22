import { DEFAULT_GAUGE_CM } from './models'
import { collectPhotos } from './photos'
import type { Project, ProjectFilter, ProjectsState } from './types'

export function sortProjectsByRecent(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => {
    const ta = Date.parse(a.lastOpenedAt || a.updatedAt || a.createdAt)
    const tb = Date.parse(b.lastOpenedAt || b.updatedAt || b.createdAt)
    const na = Number.isFinite(ta) ? ta : 0
    const nb = Number.isFinite(tb) ? tb : 0
    if (nb !== na) return nb - na
    return a.name.localeCompare(b.name, 'es')
  })
}

export function isArchived(project: Project): boolean {
  return Boolean(project.archivedAt)
}

export function openProjects(projects: Project[]): Project[] {
  return projects.filter((p) => !p.archivedAt)
}

export function archivedProjects(projects: Project[]): Project[] {
  return projects.filter((p) => Boolean(p.archivedAt))
}

export function foldSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
}

export function projectMatchesQuery(project: Project, query: string): boolean {
  const q = foldSearch(query.trim())
  if (!q) return true
  const haystack = [
    project.name,
    project.notes,
    project.yarn,
    project.needles,
  ].join(' ')
  return foldSearch(haystack).includes(q)
}

export const PROJECT_FILTERS: Array<{ id: ProjectFilter; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'inProgress', label: 'En curso' },
  { id: 'withPattern', label: 'Con patrón' },
  { id: 'withPhoto', label: 'Con foto' },
  { id: 'withGoal', label: 'Con meta' },
]

export function projectMatchesFilter(
  project: Project,
  filter: ProjectFilter,
): boolean {
  if (filter === 'all') return true
  if (filter === 'inProgress') return project.rows > 0 || project.stitches > 0
  if (filter === 'withPattern') return project.patternSteps.length > 0
  if (filter === 'withPhoto') return collectPhotos(project).length > 0
  if (filter === 'withGoal') return project.targetRows > 0
  return true
}

export function formatGauge(project: Project): string | null {
  const bits: string[] = []
  if (project.gaugeStitches > 0 || project.gaugeRows > 0) {
    const cm = project.gaugeCm > 0 ? project.gaugeCm : DEFAULT_GAUGE_CM
    const stitches =
      project.gaugeStitches > 0 ? `${project.gaugeStitches} puntos` : null
    const rows = project.gaugeRows > 0 ? `${project.gaugeRows} filas` : null
    const counts = [stitches, rows].filter(Boolean).join(' × ')
    bits.push(`Muestra ${cm} cm: ${counts}`)
  }
  if (project.gaugeMeters > 0) {
    const m = project.gaugeMeters
    const label = Number.isInteger(m)
      ? `${m} m`
      : `${String(m).replace('.', ',')} m`
    bits.push(`${label} en la muestra`)
  }
  if (project.needles.trim()) bits.push(`Aguja ${project.needles.trim()}`)
  if (project.yarn.trim()) bits.push(project.yarn.trim())
  if (bits.length === 0) return null
  return bits.join(' · ')
}

export function archiveProjectInState(
  state: ProjectsState,
  id: string,
  at = new Date().toISOString(),
): ProjectsState {
  const target = state.projects.find((p) => p.id === id)
  if (!target || target.archivedAt) return state
  if (openProjects(state.projects).length <= 1) return state
  const projects = state.projects.map((p) =>
    p.id === id ? { ...p, archivedAt: at, updatedAt: at } : p,
  )
  let activeId = state.activeId
  if (activeId === id) {
    activeId = openProjects(projects)[0]?.id ?? activeId
  }
  return { ...state, projects, activeId }
}

export function restoreProjectInState(
  state: ProjectsState,
  id: string,
): ProjectsState {
  const target = state.projects.find((p) => p.id === id)
  if (!target?.archivedAt) return state
  const now = new Date().toISOString()
  const projects = state.projects.map((p) =>
    p.id === id
      ? { ...p, archivedAt: null, lastOpenedAt: now, updatedAt: now }
      : p,
  )
  return { ...state, projects, activeId: id }
}
