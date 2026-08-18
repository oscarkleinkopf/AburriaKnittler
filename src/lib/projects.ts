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
const MAX_NAMED_MARKERS = 40
/** Sesión en curso más de 3 h: preguntar si sigue. */
export const LONG_SESSION_MS = 3 * 60 * 60 * 1000

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
    targetRows: 0,
    namedMarkers: [],
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

function normalizeNamedMarker(m: NamedMarker): NamedMarker {
  return {
    id: m.id || createId(),
    row: Math.max(0, Math.round(Number(m.row) || 0)),
    label: String(m.label ?? '').trim() || 'Marcador',
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
    targetRows: Math.max(0, Number(p.targetRows) || 0),
    namedMarkers: Array.isArray(p.namedMarkers)
      ? p.namedMarkers.map(normalizeNamedMarker).slice(0, MAX_NAMED_MARKERS)
      : [],
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

export function patternStepToSpeech(step: PatternStep): string {
  return `Fila ${step.row}. ${step.instruction}.`
}

const NUMBERED_LINE =
  /^(?:(?:fila|vuelta|row|r|f)\.?\s*)?(\d+)\s*[:.)\-–—]\s*(.+)$/i
const FILA_SPACE_LINE = /^(?:fila|vuelta|row)\s+(\d+)\s+(.+)$/i

/** Convierte texto pegado en pasos de patrón (una línea = una fila). */
export function parsePatternText(
  text: string,
  startRow = 1,
): PatternStep[] {
  const lines = text.split(/\r?\n/)
  const steps: PatternStep[] = []
  let nextRow = Math.max(0, Math.round(startRow) || 1)
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    const numbered = line.match(NUMBERED_LINE) ?? line.match(FILA_SPACE_LINE)
    if (numbered) {
      const row = Math.max(0, Number.parseInt(numbered[1], 10))
      const instruction = numbered[2].trim()
      if (!instruction) continue
      steps.push({
        id: createId(),
        row,
        instruction,
        done: false,
      })
      nextRow = row + 1
      continue
    }
    steps.push({
      id: createId(),
      row: nextRow,
      instruction: line,
      done: false,
    })
    nextRow += 1
  }
  return steps.slice(0, MAX_PATTERN_STEPS)
}

export function appendPatternSteps(
  project: Project,
  incoming: PatternStep[],
): Project {
  if (incoming.length === 0) return project
  return {
    ...project,
    patternSteps: [...project.patternSteps, ...incoming].slice(
      0,
      MAX_PATTERN_STEPS,
    ),
  }
}

export function namedMarkerAt(
  project: Project,
  row: number,
): NamedMarker | undefined {
  return project.namedMarkers.find((m) => m.row === row)
}

export type GoalProgress = {
  current: number
  target: number
  remaining: number
  ratio: number
  done: boolean
}

export function goalProgress(project: Project): GoalProgress | null {
  if (project.targetRows <= 0) return null
  const current = project.rows
  const target = project.targetRows
  const remaining = Math.max(0, target - current)
  return {
    current,
    target,
    remaining,
    ratio: Math.min(1, current / target),
    done: current >= target,
  }
}

export function isLongRunningSession(
  project: Project,
  now = Date.now(),
): boolean {
  if (!project.timerStartedAt) return false
  const started = Date.parse(project.timerStartedAt)
  if (!Number.isFinite(started)) return false
  return now - started >= LONG_SESSION_MS
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

export type ProjectShareFile = {
  app: 'AburriaKnittler'
  format: 1
  kind: 'project'
  exportedAt: string
  project: Project
}

export function buildProjectShare(project: Project): ProjectShareFile {
  return {
    app: 'AburriaKnittler',
    format: 1,
    kind: 'project',
    exportedAt: new Date().toISOString(),
    project: normalizeProject(project),
  }
}

function safeFileSlug(name: string): string {
  return (
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'proyecto'
  )
}

export function downloadProject(project: Project): void {
  const json = `${JSON.stringify(buildProjectShare(project), null, 2)}\n`
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `aburriaknittler-${safeFileSlug(project.name)}.json`
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Intenta Web Share; si no, descarga el JSON del proyecto. */
export async function shareProject(project: Project): Promise<'shared' | 'downloaded'> {
  const file = buildProjectShare(project)
  const json = `${JSON.stringify(file, null, 2)}\n`
  const blob = new Blob([json], { type: 'application/json' })
  const filename = `aburriaknittler-${safeFileSlug(project.name)}.json`
  const shareFile = new File([blob], filename, { type: 'application/json' })

  try {
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      (!navigator.canShare || navigator.canShare({ files: [shareFile] }))
    ) {
      await navigator.share({
        title: `AburriaKnittler — ${project.name}`,
        text: `Proyecto de tejido: ${project.name}`,
        files: [shareFile],
      })
      return 'shared'
    }
  } catch (err) {
    // Usuario canceló o el sistema no pudo compartir con archivo
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err
    }
  }

  downloadProject(project)
  return 'downloaded'
}

function extractProjects(raw: unknown): {
  projects: Project[]
  activeId: string | null
} {
  if (!raw || typeof raw !== 'object') {
    throw new Error('El archivo no es un JSON válido de AburriaKnittler.')
  }
  const obj = raw as Record<string, unknown>

  // Formato de un solo proyecto
  if (
    (obj.app === 'AburriaKnittler' || obj.format === 1) &&
    obj.kind === 'project' &&
    obj.project &&
    typeof obj.project === 'object'
  ) {
    const project = normalizeProject(obj.project as Project)
    return { projects: [project], activeId: project.id }
  }

  // Formato de respaldo completo
  if (obj.app === 'AburriaKnittler' || obj.format === 1) {
    if (Array.isArray(obj.projects) && obj.projects.length > 0) {
      return {
        projects: (obj.projects as Project[]).map(normalizeProject),
        activeId: typeof obj.activeId === 'string' ? obj.activeId : null,
      }
    }
    throw new Error('El respaldo no contiene proyectos.')
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

export type SaveResult =
  | { ok: true }
  | { ok: false; reason: 'quota' | 'unavailable' }

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

/** Restaura el contador al estado anterior al último toque. */
export function undoLastChange(project: Project): Project {
  if (project.history.length === 0) return project
  if (project.history.length === 1) {
    return { ...project, rows: 0, stitches: 0, history: [] }
  }
  const prev = project.history[1]
  return {
    ...project,
    rows: Math.max(0, prev.rows),
    stitches: Math.max(0, prev.stitches),
    history: project.history.slice(1),
  }
}

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

export function updatePatternStep(
  project: Project,
  stepId: string,
  patch: { row?: number; instruction?: string },
): Project {
  return {
    ...project,
    patternSteps: project.patternSteps.map((s) => {
      if (s.id !== stepId) return s
      const instruction =
        patch.instruction !== undefined
          ? patch.instruction.trim() || s.instruction
          : s.instruction
      const row =
        patch.row === undefined ? s.row : Math.max(0, Math.round(patch.row))
      return { ...s, instruction, row }
    }),
  }
}

export function nextCopyName(
  original: string,
  existingNames: string[],
): string {
  const base =
    original.replace(/\s*\(copia(?: \d+)?\)\s*$/i, '').trim() || original
  const taken = new Set(existingNames.map((n) => n.toLowerCase()))
  const first = `${base} (copia)`
  if (!taken.has(first.toLowerCase())) return first
  let n = 2
  while (taken.has(`${base} (copia ${n})`.toLowerCase())) n += 1
  return `${base} (copia ${n})`
}

/** Copia patrón, notas, foto y análisis; el contador y las sesiones empiezan de cero. */
export function duplicateProject(
  project: Project,
  existingNames: string[],
): Project {
  const now = new Date().toISOString()
  return {
    ...project,
    id: createId(),
    name: nextCopyName(project.name, existingNames),
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
    rows: 0,
    stitches: 0,
    history: [],
    sessions: [],
    timerStartedAt: null,
    patternSteps: project.patternSteps.map((s) => ({
      ...s,
      id: createId(),
      done: false,
    })),
    namedMarkers: project.namedMarkers.map((m) => ({
      ...m,
      id: createId(),
    })),
  }
}

export function analysisHasCounters(result: AnalyzeResult): boolean {
  return result.estimatedRows != null || result.estimatedStitches != null
}

export function applyAnalysisToCounters(
  project: Project,
  analysis: AnalyzeResult,
): Project {
  const rows =
    analysis.estimatedRows == null || Number.isNaN(analysis.estimatedRows)
      ? project.rows
      : Math.max(0, Math.round(analysis.estimatedRows))
  const stitches =
    analysis.estimatedStitches == null ||
    Number.isNaN(analysis.estimatedStitches)
      ? project.stitches
      : Math.max(0, Math.round(analysis.estimatedStitches))
  if (rows === project.rows && stitches === project.stitches) return project
  return pushHistory({ ...project, rows, stitches }, rows, stitches)
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

export function formatClock(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('es', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function localDayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export type SessionDayGroup = {
  dayKey: string
  label: string
  sessions: KnitSession[]
  totalMs: number
}

/** Agrupa sesiones por día local (más reciente primero). */
export function groupSessionsByDay(
  sessions: KnitSession[],
  now = new Date(),
): SessionDayGroup[] {
  const today = localDayKey(now)
  const yesterdayDate = new Date(now)
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  const yesterday = localDayKey(yesterdayDate)

  const map = new Map<string, KnitSession[]>()
  for (const s of sessions) {
    const ended = new Date(s.endedAt)
    const key = Number.isNaN(ended.getTime()) ? 'unknown' : localDayKey(ended)
    const list = map.get(key)
    if (list) list.push(s)
    else map.set(key, [s])
  }

  const keys = [...map.keys()].sort((a, b) => {
    if (a === 'unknown') return 1
    if (b === 'unknown') return -1
    return b.localeCompare(a)
  })

  return keys.map((dayKey) => {
    const list = map.get(dayKey) ?? []
    let label = dayKey
    if (dayKey === today) label = 'Hoy'
    else if (dayKey === yesterday) label = 'Ayer'
    else if (dayKey !== 'unknown') {
      const d = new Date(`${dayKey}T12:00:00`)
      label = d.toLocaleDateString('es', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    } else {
      label = 'Sin fecha'
    }
    return {
      dayKey,
      label,
      sessions: list,
      totalMs: list.reduce((sum, s) => sum + s.durationMs, 0),
    }
  })
}
