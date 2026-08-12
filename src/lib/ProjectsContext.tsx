import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import type { AnalyzeResult } from './analyze'
import {
  createProject,
  loadState,
  parseBackupJson,
  pushHistory,
  saveState,
  touch,
  type ImportMode,
  type ImportResult,
  type Project,
  type ProjectsState,
} from './projects'

type ProjectsApi = {
  state: ProjectsState
  active: Project | null
  setActive: (id: string) => void
  addProject: (name: string, notes?: string) => Project
  updateProject: (id: string, patch: Partial<Project>) => void
  deleteProject: (id: string) => void
  bumpRows: (delta: number) => void
  bumpStitches: (delta: number) => void
  resetCounters: () => void
  setMarkerEvery: (n: number) => void
  saveAnalysis: (result: AnalyzeResult) => void
  setPhoto: (dataUrl: string | null) => void
  replaceState: (next: ProjectsState) => void
  importBackup: (jsonText: string, mode: ImportMode) => ImportResult
}

let memory = loadState()
const listeners = new Set<() => void>()

function emit() {
  saveState(memory)
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return memory
}

function patchActive(
  fn: (project: Project) => Project,
  recordHistory = false,
): void {
  const id = memory.activeId
  if (!id) return
  memory = {
    ...memory,
    projects: memory.projects.map((p) => {
      if (p.id !== id) return p
      let next = touch(fn(p))
      if (recordHistory) {
        next = pushHistory(next, next.rows, next.stitches)
      }
      return next
    }),
  }
  emit()
}

const ProjectsContext = createContext<ProjectsApi | null>(null)

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const active = useMemo(
    () => state.projects.find((p) => p.id === state.activeId) ?? null,
    [state],
  )

  const setActive = useCallback((id: string) => {
    if (!memory.projects.some((p) => p.id === id)) return
    memory = { ...memory, activeId: id }
    emit()
  }, [])

  const addProject = useCallback((name: string, notes = '') => {
    const project = createProject(name, notes)
    memory = {
      ...memory,
      activeId: project.id,
      projects: [project, ...memory.projects],
    }
    emit()
    return project
  }, [])

  const updateProject = useCallback((id: string, patch: Partial<Project>) => {
    memory = {
      ...memory,
      projects: memory.projects.map((p) =>
        p.id === id ? touch({ ...p, ...patch, id: p.id }) : p,
      ),
    }
    emit()
  }, [])

  const deleteProject = useCallback((id: string) => {
    if (memory.projects.length <= 1) return
    const projects = memory.projects.filter((p) => p.id !== id)
    const activeId =
      memory.activeId === id ? projects[0]?.id ?? null : memory.activeId
    memory = { ...memory, projects, activeId }
    emit()
  }, [])

  const bumpRows = useCallback((delta: number) => {
    patchActive((p) => {
      const rows = Math.max(0, p.rows + delta)
      return { ...p, rows, stitches: delta !== 0 && rows !== p.rows ? 0 : p.stitches }
    }, true)
  }, [])

  const bumpStitches = useCallback((delta: number) => {
    patchActive(
      (p) => ({ ...p, stitches: Math.max(0, p.stitches + delta) }),
      true,
    )
  }, [])

  const resetCounters = useCallback(() => {
    patchActive((p) => ({ ...p, rows: 0, stitches: 0 }), true)
  }, [])

  const setMarkerEvery = useCallback((n: number) => {
    patchActive((p) => ({ ...p, markerEvery: Math.max(0, Math.floor(n)) }))
  }, [])

  const saveAnalysis = useCallback((result: AnalyzeResult) => {
    patchActive((p) => ({ ...p, lastAnalysis: result }))
  }, [])

  const setPhoto = useCallback((dataUrl: string | null) => {
    patchActive((p) => ({ ...p, photoDataUrl: dataUrl }))
  }, [])

  const replaceState = useCallback((next: ProjectsState) => {
    memory = next
    emit()
  }, [])

  const importBackup = useCallback((jsonText: string, mode: ImportMode) => {
    const result = parseBackupJson(jsonText, memory, mode)
    memory = result.state
    emit()
    return result
  }, [])

  const api = useMemo<ProjectsApi>(
    () => ({
      state,
      active,
      setActive,
      addProject,
      updateProject,
      deleteProject,
      bumpRows,
      bumpStitches,
      resetCounters,
      setMarkerEvery,
      saveAnalysis,
      setPhoto,
      replaceState,
      importBackup,
    }),
    [
      state,
      active,
      setActive,
      addProject,
      updateProject,
      deleteProject,
      bumpRows,
      bumpStitches,
      resetCounters,
      setMarkerEvery,
      saveAnalysis,
      setPhoto,
      replaceState,
      importBackup,
    ],
  )

  return (
    <ProjectsContext.Provider value={api}>{children}</ProjectsContext.Provider>
  )
}

export function useProjects(): ProjectsApi {
  const ctx = useContext(ProjectsContext)
  if (!ctx) {
    throw new Error('useProjects debe usarse dentro de ProjectsProvider')
  }
  return ctx
}
