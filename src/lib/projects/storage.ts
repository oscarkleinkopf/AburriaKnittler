import { createProject, normalizeProject } from './models'
import type { ProjectsState, SaveResult } from './types'

export const STORAGE_KEY = 'aburriaknittler.projects.v1'
export const LEGACY_ROW_KEY = 'aburriaknittler.rowCount'

export function emptyState(): ProjectsState {
  const project = createProject('Mi primer proyecto')
  return { version: 1, activeId: project.id, projects: [project] }
}

export function migrateLegacy(): ProjectsState | null {
  try {
    const raw = localStorage.getItem(LEGACY_ROW_KEY)
    if (raw == null) return null
    const n = Number.parseInt(raw, 10)
    const rows = Number.isFinite(n) && n >= 0 ? n : 0
    const project = createProject('Mi primer proyecto')
    project.rows = rows
    if (rows > 0) {
      project.history = [
        { at: new Date().toISOString(), rows, stitches: 0 },
      ]
    }
    localStorage.removeItem(LEGACY_ROW_KEY)
    return { version: 1, activeId: project.id, projects: [project] }
  } catch {
    return null
  }
}

export function loadState(): ProjectsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return migrateLegacy() ?? emptyState()
    }
    const parsed = JSON.parse(raw) as ProjectsState
    if (
      !parsed ||
      parsed.version !== 1 ||
      !Array.isArray(parsed.projects) ||
      parsed.projects.length === 0
    ) {
      return emptyState()
    }
    const projects = parsed.projects.map(normalizeProject)
    const activeExists = projects.some((p) => p.id === parsed.activeId)
    let activeId = activeExists ? parsed.activeId : projects[0].id
    const active = projects.find((p) => p.id === activeId)
    if (active?.archivedAt) {
      const open = projects.find((p) => !p.archivedAt)
      if (open) activeId = open.id
    }
    return {
      version: 1,
      activeId,
      projects,
    }
  } catch {
    return emptyState()
  }
}

let lastSaveResult: SaveResult = { ok: true }

export function getLastSaveResult(): SaveResult {
  return lastSaveResult
}

export function isQuotaError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as { name?: string; code?: number }
  return (
    e.name === 'QuotaExceededError' ||
    e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    e.code === 22
  )
}

export function saveState(state: ProjectsState): SaveResult {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    lastSaveResult = { ok: true }
    return lastSaveResult
  } catch (err) {
    lastSaveResult = {
      ok: false,
      reason: isQuotaError(err) ? 'quota' : 'unavailable',
    }
    return lastSaveResult
  }
}
