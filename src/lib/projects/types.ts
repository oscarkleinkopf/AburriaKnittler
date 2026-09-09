import type { AnalyzeResult } from '../analyze'

export type HistoryEntry = {
  at: string
  rows: number
  stitches: number
  /** Pasos del patrón marcados al llegar a esta vuelta (para deshacer). */
  autoMarkedIds?: string[]
}

export type PatternStep = {
  id: string
  /** Fila del patrón a la que aplica la instrucción */
  row: number
  instruction: string
  done: boolean
}

export type KnitSession = {
  id: string
  startedAt: string
  endedAt: string
  durationMs: number
}

export type NamedMarker = {
  id: string
  row: number
  label: string
}

export type Project = {
  id: string
  name: string
  notes: string
  photoDataUrl: string | null
  /** Hasta MAX_PHOTOS; photoDataUrl es la portada (la primera). */
  photos: string[]
  /** Lana o hilo */
  yarn: string
  /** Agujas, p. ej. 4,5 mm */
  needles: string
  /** 0 = sin muestra */
  gaugeStitches: number
  gaugeRows: number
  /** Centímetros de la muestra (por defecto 10) */
  gaugeCm: number
  createdAt: string
  updatedAt: string
  rows: number
  stitches: number
  /** 0 = desactivado */
  markerEvery: number
  /** 0 = sin meta */
  targetRows: number
  namedMarkers: NamedMarker[]
  history: HistoryEntry[]
  lastAnalysis: AnalyzeResult | null
  patternSteps: PatternStep[]
  sessions: KnitSession[]
  /** ISO si hay un temporizador en curso */
  timerStartedAt: string | null
  /** Última vez que se abrió el proyecto (retomar) */
  lastOpenedAt: string | null
  /** ISO si está archivado (oculto de la lista principal) */
  archivedAt: string | null
  /** Recado corto de dónde se dejó el tejido */
  leaveNote: string
  /** Bloquea sumar/restar (evita toques accidentales) */
  tapsLocked: boolean
  /** Subcontador de motivo/sección repetitiva */
  motifEnabled?: boolean
  motifLength?: number
  motifTargetRepeats?: number
}

export type MotifProgress = {
  active: boolean
  currentRepeat: number
  targetRepeats: number
  currentRowInMotif: number
  motifLength: number
  done: boolean
}

export type ProjectsState = {
  version: 1
  activeId: string | null
  projects: Project[]
}

export type RepeatSpec = {
  from: number
  to: number
  times: number
}

export type RepeatRangeResult =
  | { ok: true; steps: PatternStep[]; added: number }
  | { ok: false; error: string }

export type GoalProgress = {
  current: number
  target: number
  remaining: number
  ratio: number
  done: boolean
}

export type BackupFile = {
  app: 'AburriaKnittler'
  format: 1
  exportedAt: string
  activeId: string | null
  projects: Project[]
}

export type ImportMode = 'merge' | 'replace'

export type ImportResult = {
  state: ProjectsState
  added: number
  updated: number
  total: number
}

export type ProjectShareFile = {
  app: 'AburriaKnittler'
  format: 1
  kind: 'project'
  exportedAt: string
  project: Project
}

export type PatternShareFile = {
  app: 'AburriaKnittler'
  format: 1
  kind: 'pattern'
  exportedAt: string
  name: string
  yarn: string
  needles: string
  gaugeStitches: number
  gaugeRows: number
  gaugeCm: number
  notes: string
  steps: Array<{ row: number; instruction: string }>
}

export type ProjectFilter =
  | 'all'
  | 'inProgress'
  | 'withPattern'
  | 'withPhoto'
  | 'withGoal'

export type SaveResult =
  | { ok: true }
  | { ok: false; reason: 'quota' | 'unavailable' }

export type SessionDayGroup = {
  dayKey: string
  label: string
  sessions: KnitSession[]
  totalMs: number
}
