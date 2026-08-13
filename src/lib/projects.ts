import type { AnalyzeResult } from './analyze'

export type HistoryEntry = {
  at: string
  rows: number
  stitches: number
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

export type Project = {
  id: string
  name: string
  notes: string
  photoDataUrl: string | null
  createdAt: string
  updatedAt: string
  rows: number
  stitches: number
  /** 0 = desactivado */
  markerEvery: number
  history: HistoryEntry[]
  lastAnalysis: AnalyzeResult | null
  patternSteps: PatternStep[]
  sessions: KnitSession[]
  /** ISO si hay un temporizador en curso */
  timerStartedAt: string | null
  /** Última vez que se abrió el proyecto (retomar) */
  lastOpenedAt: string | null
}

export type ProjectsState = {
  version: 1
  activeId: string | null
  projects: Project[]
}

const STORAGE_KEY = 'aburriaknittler.projects.v1'
const LEGACY_ROW_KEY = 'aburriaknittler.rowCount'
const MAX_HISTORY = 40
const MAX_SESSIONS = 80
const MAX_PATTERN_STEPS = 200

export function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function createProject(name: string, notes = ''): Project {
  const now = new Date().toISOString()
  return {
    id: createId(),
    name: name.trim() || 'Sin nombre',
    notes: notes.trim(),
    photoDataUrl: null,
    createdAt: now,
    updatedAt: now,
    rows: 0,
    stitches: 0,
    markerEvery: 0,
    history: [],
    lastAnalysis: null,
    patternSteps: [],
    sessions: [],
    timerStartedAt: null,
    lastOpenedAt: now,
  }
}

function emptyState(): ProjectsState {
  const project = createProject('Mi primer proyecto')
  return { version: 1, activeId: project.id, projects: [project] }
}

function migrateLegacy(): ProjectsState | null {
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
    const activeExists = parsed.projects.some((p) => p.id === parsed.activeId)
    return {
      version: 1,
      activeId: activeExists ? parsed.activeId : parsed.projects[0].id,
      projects: parsed.projects.map(normalizeProject),
    }
  } catch {
    return emptyState()
  }
}

function normalizePatternStep(s: PatternStep): PatternStep {
  return {
    id: s.id || createId(),
    row: Math.max(0, Math.round(Number(s.row) || 0)),
    instruction: String(s.instruction ?? '').trim() || 'Sin instrucción',
    done: Boolean(s.done),
  }
}

function normalizeSession(s: KnitSession): KnitSession {
  return {
    id: s.id || createId(),
    startedAt: s.startedAt || new Date().toISOString(),
    endedAt: s.endedAt || new Date().toISOString(),
    durationMs: Math.max(0, Number(s.durationMs) || 0),
  }
}

function normalizeProject(p: Project): Project {
  return {
    id: p.id || createId(),
    name: p.name || 'Sin nombre',
    notes: p.notes ?? '',
    photoDataUrl: p.photoDataUrl ?? null,
    createdAt: p.createdAt || new Date().toISOString(),
    updatedAt: p.updatedAt || new Date().toISOString(),
    rows: Math.max(0, Number(p.rows) || 0),
    stitches: Math.max(0, Number(p.stitches) || 0),
    markerEvery: Math.max(0, Number(p.markerEvery) || 0),
    history: Array.isArray(p.history) ? p.history.slice(0, MAX_HISTORY) : [],
    lastAnalysis: p.lastAnalysis ?? null,
    patternSteps: Array.isArray(p.patternSteps)
      ? p.patternSteps.map(normalizePatternStep).slice(0, MAX_PATTERN_STEPS)
      : [],
    sessions: Array.isArray(p.sessions)
      ? p.sessions.map(normalizeSession).slice(0, MAX_SESSIONS)
      : [],
    timerStartedAt:
      typeof p.timerStartedAt === 'string' && p.timerStartedAt
        ? p.timerStartedAt
        : null,
    lastOpenedAt:
      typeof p.lastOpenedAt === 'string' && p.lastOpenedAt
        ? p.lastOpenedAt
        : p.updatedAt || null,
  }
}

export function totalSessionMs(project: Project): number {
  const closed = project.sessions.reduce((sum, s) => sum + s.durationMs, 0)
  if (!project.timerStartedAt) return closed
  const started = Date.parse(project.timerStartedAt)
  if (!Number.isFinite(started)) return closed
  return closed + Math.max(0, Date.now() - started)
}

export function sessionMsToday(project: Project, now = new Date()): number {
  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime()
  let total = 0
  for (const s of project.sessions) {
    const end = Date.parse(s.endedAt)
    if (!Number.isFinite(end) || end < startOfDay) continue
    const start = Date.parse(s.startedAt)
    if (!Number.isFinite(start)) {
      total += s.durationMs
      continue
    }
    const overlapStart = Math.max(start, startOfDay)
    total += Math.max(0, end - overlapStart)
  }
  if (project.timerStartedAt) {
    const started = Date.parse(project.timerStartedAt)
    if (Number.isFinite(started)) {
      const overlapStart = Math.max(started, startOfDay)
      total += Math.max(0, Date.now() - overlapStart)
    }
  }
  return total
}

export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) {
    return `${h}h ${String(m).padStart(2, '0')}m`
  }
  if (m > 0) {
    return `${m}m ${String(s).padStart(2, '0')}s`
  }
  return `${s}s`
}

export function currentPatternStep(
  project: Project,
): PatternStep | null {
  const pending = project.patternSteps
    .filter((s) => !s.done)
    .sort((a, b) => a.row - b.row || a.instruction.localeCompare(b.instruction))
  if (pending.length === 0) return null
  const forCurrentRow = pending.find((s) => s.row === project.rows)
  return forCurrentRow ?? pending[0]
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

export function buildBackup(state: ProjectsState): BackupFile {
  return {
    app: 'AburriaKnittler',
    format: 1,
    exportedAt: new Date().toISOString(),
    activeId: state.activeId,
    projects: state.projects.map(normalizeProject),
  }
}

export function backupToJson(state: ProjectsState): string {
  return `${JSON.stringify(buildBackup(state), null, 2)}\n`
}

export function downloadBackup(state: ProjectsState): void {
  const json = backupToJson(state)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const stamp = new Date().toISOString().slice(0, 10)
  const a = document.createElement('a')
  a.href = url
  a.download = `aburriaknittler-respaldo-${stamp}.json`
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function extractProjects(raw: unknown): {
  projects: Project[]
  activeId: string | null
} {
  if (!raw || typeof raw !== 'object') {
    throw new Error('El archivo no es un JSON válido de AburriaKnittler.')
  }
  const obj = raw as Record<string, unknown>

  // Formato de respaldo
  if (obj.app === 'AburriaKnittler' || obj.format === 1) {
    if (!Array.isArray(obj.projects) || obj.projects.length === 0) {
      throw new Error('El respaldo no contiene proyectos.')
    }
    return {
      projects: (obj.projects as Project[]).map(normalizeProject),
      activeId: typeof obj.activeId === 'string' ? obj.activeId : null,
    }
  }

  // Estado interno v1
  if (obj.version === 1 && Array.isArray(obj.projects)) {
    if (obj.projects.length === 0) {
      throw new Error('El archivo no contiene proyectos.')
    }
    return {
      projects: (obj.projects as Project[]).map(normalizeProject),
      activeId: typeof obj.activeId === 'string' ? obj.activeId : null,
    }
  }

  // Lista suelta de proyectos
  if (Array.isArray(raw) && raw.length > 0) {
    return {
      projects: (raw as Project[]).map(normalizeProject),
      activeId: null,
    }
  }

  throw new Error(
    'No reconozco este archivo. Exporta un respaldo desde AburriaKnittler.',
  )
}

export function parseBackupJson(
  text: string,
  current: ProjectsState,
  mode: ImportMode,
): ImportResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('No se pudo leer el JSON. ¿Es un archivo de texto válido?')
  }

  const { projects: incoming, activeId } = extractProjects(raw)

  if (mode === 'replace') {
    const normalized = incoming.map(normalizeProject)
    const activeExists = normalized.some((p) => p.id === activeId)
    const state: ProjectsState = {
      version: 1,
      activeId: activeExists ? activeId : normalized[0].id,
      projects: normalized,
    }
    return {
      state,
      added: normalized.length,
      updated: 0,
      total: normalized.length,
    }
  }

  // merge: same id → replace with imported; new ids → append
  const byId = new Map(current.projects.map((p) => [p.id, p]))
  let added = 0
  let updated = 0
  for (const p of incoming) {
    if (byId.has(p.id)) {
      byId.set(p.id, normalizeProject(p))
      updated += 1
    } else {
      byId.set(p.id, normalizeProject(p))
      added += 1
    }
  }
  const projects = Array.from(byId.values())
  const preferred = activeId && projects.some((p) => p.id === activeId)
    ? activeId
    : current.activeId && projects.some((p) => p.id === current.activeId)
      ? current.activeId
      : projects[0].id

  return {
    state: { version: 1, activeId: preferred, projects },
    added,
    updated,
    total: projects.length,
  }
}

export async function readBackupFile(file: File): Promise<string> {
  if (
    file.type &&
    !file.type.includes('json') &&
    !file.type.includes('text') &&
    !file.name.toLowerCase().endsWith('.json')
  ) {
    throw new Error('Elige un archivo .json de respaldo.')
  }
  return file.text()
}

export function saveState(state: ProjectsState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // quota / private mode
  }
}

export function touch(project: Project): Project {
  return { ...project, updatedAt: new Date().toISOString() }
}

export function pushHistory(
  project: Project,
  rows: number,
  stitches: number,
): Project {
  const entry: HistoryEntry = {
    at: new Date().toISOString(),
    rows,
    stitches,
  }
  return {
    ...project,
    history: [entry, ...project.history].slice(0, MAX_HISTORY),
  }
}

/** Reduce una imagen para guardarla en localStorage sin llenar la cuota. */
export function compressImageFile(
  file: File,
  maxSide = 720,
  quality = 0.72,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('No se pudo preparar la imagen'))
        return
      }
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la imagen'))
    }
    img.src = url
  })
}

export function formatRelativeDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  const time = d.toLocaleTimeString('es', {
    hour: '2-digit',
    minute: '2-digit',
  })
  if (sameDay) return `Hoy ${time}`
  return (
    d.toLocaleDateString('es', {
      day: 'numeric',
      month: 'short',
    }) + ` ${time}`
  )
}
