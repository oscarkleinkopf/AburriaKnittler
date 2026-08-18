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
  applyAnalysisToCounters,
  createId,
  createProject,
  duplicateProject,
  loadState,
  parseBackupJson,
  pushHistory,
  saveState,
  touch,
  undoLastChange,
  updatePatternStep,
  type ImportMode,
  type ImportResult,
  type PatternStep,
  type Project,
  type ProjectsState,
} from './projects'

type ProjectsApi = {
  state: ProjectsState
  active: Project | null
  setActive: (id: string) => void
  addProject: (name: string, notes?: string) => Project
  duplicateProject: (id: string) => Project | null
  updateProject: (id: string, patch: Partial<Project>) => void
  deleteProject: (id: string) => void
  bumpRows: (delta: number) => void
  bumpStitches: (delta: number) => void
  undoLast: () => void
  resetCounters: () => void
  setMarkerEvery: (n: number) => void
  saveAnalysis: (result: AnalyzeResult) => void
  applyAnalysisToCounters: (result: AnalyzeResult) => void
  setPhoto: (dataUrl: string | null) => void
  replaceState: (next: ProjectsState) => void
  importBackup: (jsonText: string, mode: ImportMode) => ImportResult
  markOpened: () => void
  addPatternStep: (row: number, instruction: string) => void
  togglePatternStep: (stepId: string) => void
  updatePatternStep: (
    stepId: string,
    patch: { row?: number; instruction?: string },
  ) => void
  removePatternStep: (stepId: string) => void
  startTimer: () => void
  stopTimer: () => void
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
    const now = new Date().toISOString()
    memory = {
      ...memory,
      activeId: id,
      projects: memory.projects.map((p) =>
        p.id === id ? touch({ ...p, lastOpenedAt: now }) : p,
      ),
    }
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

  const duplicateById = useCallback((id: string) => {
    const source = memory.projects.find((p) => p.id === id)
    if (!source) return null
    const copy = duplicateProject(
      source,
      memory.projects.map((p) => p.name),
    )
    memory = {
      ...memory,
      activeId: copy.id,
      projects: [copy, ...memory.projects],
    }
    emit()
    return copy
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
      return {
        ...p,
        rows,
        stitches: delta !== 0 && rows !== p.rows ? 0 : p.stitches,
      }
    }, true)
  }, [])

  const bumpStitches = useCallback((delta: number) => {
    patchActive(
      (p) => ({ ...p, stitches: Math.max(0, p.stitches + delta) }),
      true,
    )
  }, [])

  const undoLast = useCallback(() => {
    patchActive((p) => undoLastChange(p))
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

  const applyAnalysis = useCallback((result: AnalyzeResult) => {
    patchActive((p) => applyAnalysisToCounters(p, result))
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

  const markOpened = useCallback(() => {
    patchActive((p) => ({
      ...p,
      lastOpenedAt: new Date().toISOString(),
    }))
  }, [])

  const addPatternStep = useCallback((row: number, instruction: string) => {
    const text = instruction.trim()
    if (!text) return
    const step: PatternStep = {
      id: createId(),
      row: Math.max(0, Math.round(row)),
      instruction: text,
      done: false,
    }
    patchActive((p) => ({
      ...p,
      patternSteps: [...p.patternSteps, step],
    }))
  }, [])

  const togglePatternStep = useCallback((stepId: string) => {
    patchActive((p) => ({
      ...p,
      patternSteps: p.patternSteps.map((s) =>
        s.id === stepId ? { ...s, done: !s.done } : s,
      ),
    }))
  }, [])

  const updateStep = useCallback(
    (stepId: string, patch: { row?: number; instruction?: string }) => {
      patchActive((p) => updatePatternStep(p, stepId, patch))
    },
    [],
  )

  const removePatternStep = useCallback((stepId: string) => {
    patchActive((p) => ({
      ...p,
      patternSteps: p.patternSteps.filter((s) => s.id !== stepId),
    }))
  }, [])

  const startTimer = useCallback(() => {
    patchActive((p) => {
      if (p.timerStartedAt) return p
      return { ...p, timerStartedAt: new Date().toISOString() }
    })
  }, [])

  const stopTimer = useCallback(() => {
    patchActive((p) => {
      if (!p.timerStartedAt) return p
      const started = Date.parse(p.timerStartedAt)
      const endedAt = new Date().toISOString()
      const durationMs = Number.isFinite(started)
        ? Math.max(0, Date.now() - started)
        : 0
      return {
        ...p,
        timerStartedAt: null,
        sessions: [
          {
            id: createId(),
            startedAt: p.timerStartedAt,
            endedAt,
            durationMs,
          },
          ...p.sessions,
        ].slice(0, 80),
      }
    })
  }, [])

  const api = useMemo<ProjectsApi>(
    () => ({
      state,
      active,
      setActive,
      addProject,
      duplicateProject: duplicateById,
      updateProject,
      deleteProject,
      bumpRows,
      bumpStitches,
      undoLast,
      resetCounters,
      setMarkerEvery,
      saveAnalysis,
      applyAnalysisToCounters: applyAnalysis,
      setPhoto,
      replaceState,
      importBackup,
      markOpened,
      addPatternStep,
      togglePatternStep,
      updatePatternStep: updateStep,
      removePatternStep,
      startTimer,
      stopTimer,
    }),
    [
      state,
      active,
      setActive,
      addProject,
      duplicateById,
      updateProject,
      deleteProject,
      bumpRows,
      bumpStitches,
      undoLast,
      resetCounters,
      setMarkerEvery,
      saveAnalysis,
      applyAnalysis,
      setPhoto,
      replaceState,
      importBackup,
      markOpened,
      addPatternStep,
      togglePatternStep,
      updateStep,
      removePatternStep,
      startTimer,
      stopTimer,
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
