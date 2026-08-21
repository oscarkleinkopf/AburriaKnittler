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
  appendPatternSteps,
  addProjectPhoto,
  applyAnalysisToCounters,
  archiveProjectInState,
  collectPhotos,
  createId,
  createProject,
  duplicateProject,
  loadState,
  MAX_PHOTOS,
  parseBackupJson,
  pushHistory,
  removeProjectPhoto,
  applyRowAdvanceToPattern,
  repeatPatternRange as expandPatternRange,
  movePatternStep as shiftPatternStep,
  restoreProjectInState,
  saveState,
  touch,
  undoLastChange,
  updatePatternStep,
  type ImportMode,
  type ImportResult,
  type NamedMarker,
  type PatternStep,
  type Project,
  type ProjectsState,
  type RepeatRangeResult,
} from './projects'

type ProjectsApi = {
  state: ProjectsState
  active: Project | null
  setActive: (id: string) => void
  addProject: (name: string, notes?: string) => Project
  duplicateProject: (id: string) => Project | null
  updateProject: (id: string, patch: Partial<Project>) => void
  archiveProject: (id: string) => void
  restoreProject: (id: string) => void
  deleteProject: (id: string) => void
  bumpRows: (delta: number) => void
  bumpStitches: (delta: number) => void
  undoLast: () => void
  resetCounters: () => void
  setMarkerEvery: (n: number) => void
  setTargetRows: (n: number) => void
  addNamedMarker: (row: number, label: string) => void
  removeNamedMarker: (id: string) => void
  saveAnalysis: (result: AnalyzeResult) => void
  applyAnalysisToCounters: (result: AnalyzeResult) => void
  setPhoto: (dataUrl: string | null) => void
  addPhoto: (dataUrl: string) => boolean
  removePhoto: (dataUrl: string) => void
  replaceState: (next: ProjectsState) => void
  importBackup: (jsonText: string, mode: ImportMode) => ImportResult
  markOpened: () => void
  addPatternStep: (row: number, instruction: string) => void
  addPatternSteps: (steps: PatternStep[]) => void
  repeatPatternRange: (
    from: number,
    to: number,
    times: number,
  ) => RepeatRangeResult
  togglePatternStep: (stepId: string) => void
  updatePatternStep: (
    stepId: string,
    patch: { row?: number; instruction?: string },
  ) => void
  removePatternStep: (stepId: string) => void
  movePatternStep: (stepId: string, direction: -1 | 1) => void
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

  const archiveById = useCallback((id: string) => {
    memory = archiveProjectInState(memory, id)
    emit()
  }, [])

  const restoreById = useCallback((id: string) => {
    memory = restoreProjectInState(memory, id)
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
    const current = memory.projects.find((p) => p.id === memory.activeId)
    if (!current || current.tapsLocked) return
    patchActive((p) => {
      const prevRows = p.rows
      const rows = Math.max(0, p.rows + delta)
      const stitches = delta !== 0 && rows !== p.rows ? 0 : p.stitches
      const advanced = applyRowAdvanceToPattern(
        p.patternSteps,
        prevRows,
        rows,
      )
      return pushHistory(
        {
          ...p,
          rows,
          stitches,
          patternSteps: advanced.steps,
        },
        rows,
        stitches,
        advanced.markedIds,
      )
    })
  }, [])

  const bumpStitches = useCallback((delta: number) => {
    const current = memory.projects.find((p) => p.id === memory.activeId)
    if (!current || current.tapsLocked) return
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

  const setTargetRows = useCallback((n: number) => {
    patchActive((p) => ({ ...p, targetRows: Math.max(0, Math.floor(n)) }))
  }, [])

  const addNamedMarker = useCallback((row: number, label: string) => {
    const text = label.trim()
    if (!text) return
    const marker: NamedMarker = {
      id: createId(),
      row: Math.max(0, Math.round(row)),
      label: text,
    }
    patchActive((p) => ({
      ...p,
      namedMarkers: [...p.namedMarkers, marker].slice(0, 40),
    }))
  }, [])

  const removeNamedMarker = useCallback((id: string) => {
    patchActive((p) => ({
      ...p,
      namedMarkers: p.namedMarkers.filter((m) => m.id !== id),
    }))
  }, [])

  const saveAnalysis = useCallback((result: AnalyzeResult) => {
    patchActive((p) => ({ ...p, lastAnalysis: result }))
  }, [])

  const applyAnalysis = useCallback((result: AnalyzeResult) => {
    patchActive((p) => applyAnalysisToCounters(p, result))
  }, [])

  const setPhoto = useCallback((dataUrl: string | null) => {
    patchActive((p) => {
      if (dataUrl == null) {
        return { ...p, photoDataUrl: null, photos: [] }
      }
      return addProjectPhoto({ ...p, photos: [], photoDataUrl: null }, dataUrl)
    })
  }, [])

  const addPhoto = useCallback((dataUrl: string) => {
    if (!dataUrl) return false
    const current = memory.projects.find((p) => p.id === memory.activeId)
    if (!current) return false
    if (collectPhotos(current).length >= MAX_PHOTOS) return false
    patchActive((p) => addProjectPhoto(p, dataUrl))
    return true
  }, [])

  const removePhoto = useCallback((dataUrl: string) => {
    patchActive((p) => removeProjectPhoto(p, dataUrl))
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

  const addPatternSteps = useCallback((steps: PatternStep[]) => {
    if (steps.length === 0) return
    patchActive((p) => appendPatternSteps(p, steps))
  }, [])

  const repeatRange = useCallback(
    (from: number, to: number, times: number): RepeatRangeResult => {
      const id = memory.activeId
      const project = memory.projects.find((p) => p.id === id)
      if (!project) {
        return { ok: false, error: 'No hay proyecto activo.' }
      }
      const result = expandPatternRange(project.patternSteps, from, to, times)
      if (!result.ok) return result
      patchActive((p) => ({ ...p, patternSteps: result.steps }))
      return result
    },
    [],
  )

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

  const moveStep = useCallback((stepId: string, direction: -1 | 1) => {
    patchActive((p) => ({
      ...p,
      patternSteps: shiftPatternStep(p.patternSteps, stepId, direction),
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
      archiveProject: archiveById,
      restoreProject: restoreById,
      deleteProject,
      bumpRows,
      bumpStitches,
      undoLast,
      resetCounters,
      setMarkerEvery,
      setTargetRows,
      addNamedMarker,
      removeNamedMarker,
      saveAnalysis,
      applyAnalysisToCounters: applyAnalysis,
      setPhoto,
      addPhoto,
      removePhoto,
      replaceState,
      importBackup,
      markOpened,
      addPatternStep,
      addPatternSteps,
      repeatPatternRange: repeatRange,
      togglePatternStep,
      updatePatternStep: updateStep,
      removePatternStep,
      movePatternStep: moveStep,
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
      archiveById,
      restoreById,
      deleteProject,
      bumpRows,
      bumpStitches,
      undoLast,
      resetCounters,
      setMarkerEvery,
      setTargetRows,
      addNamedMarker,
      removeNamedMarker,
      saveAnalysis,
      applyAnalysis,
      setPhoto,
      addPhoto,
      removePhoto,
      replaceState,
      importBackup,
      markOpened,
      addPatternStep,
      addPatternSteps,
      repeatRange,
      togglePatternStep,
      updateStep,
      removePatternStep,
      moveStep,
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
