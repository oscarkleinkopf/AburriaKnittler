import type { AnalyzeResult } from './analyze'

export type HistoryEntry = {
  at: string
  rows: number
  stitches: number
  /** Pasos del patrón marcados al llegar a esta vuelta (para deshacer). */
  autoMarkedIds?: string[]
  pieceRows?: number
  pieceStitches?: number
}

export type PatternStep = {
  id: string
  /** Fila del patrón a la que aplica la instrucción */
  row: number
  instruction: string
  done: boolean
  /** 0 o ausente = sin contador de repeticiones en la fila */
  repeatTimes?: number
  repeatDone?: number
}

export type KnitSession = {
  id: string
  startedAt: string
  endedAt: string
  durationMs: number
}

export type SideMode = 'flat' | 'round' | 'off'

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
  /** Metros de lana usados en esa muestra (0 = no) */
  gaugeMeters: number
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
  /** Segunda pieza (manga, cuello…). Vacío = oculta. */
  pieceLabel: string
  pieceRows: number
  pieceStitches: number
  /** Derecho/revés según la vuelta */
  sideMode: SideMode
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
export const MAX_PATTERN_STEPS = 200
const MAX_NAMED_MARKERS = 40
export const MAX_PHOTOS = 4
export const DEFAULT_GAUGE_CM = 10
export const MAX_LEAVE_NOTE = 280
export const MAX_STEP_REPEATS = 80
export const MAX_PIECE_LABEL = 32
export const DEFAULT_PIECE_LABEL = 'Manga'
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
    photos: [],
    yarn: '',
    needles: '',
    gaugeStitches: 0,
    gaugeRows: 0,
    gaugeCm: DEFAULT_GAUGE_CM,
    gaugeMeters: 0,
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
    archivedAt: null,
    leaveNote: '',
    tapsLocked: false,
    pieceLabel: '',
    pieceRows: 0,
    pieceStitches: 0,
    sideMode: 'flat',
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

function normalizePatternStep(s: PatternStep): PatternStep {
  const repeatTimes = Math.min(
    MAX_STEP_REPEATS,
    Math.max(0, Math.round(Number(s.repeatTimes) || 0)),
  )
  const repeatDone = Math.min(
    repeatTimes,
    Math.max(0, Math.round(Number(s.repeatDone) || 0)),
  )
  return {
    id: s.id || createId(),
    row: Math.max(0, Math.round(Number(s.row) || 0)),
    instruction: String(s.instruction ?? '').trim() || 'Sin instrucción',
    done: Boolean(s.done),
    repeatTimes,
    repeatDone,
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

export function collectPhotos(p: {
  photoDataUrl?: string | null
  photos?: string[] | null
}): string[] {
  const fromArray = Array.isArray(p.photos) ? p.photos : []
  const cover =
    typeof p.photoDataUrl === 'string' && p.photoDataUrl ? [p.photoDataUrl] : []
  const seen = new Set<string>()
  const out: string[] = []
  for (const url of [...cover, ...fromArray]) {
    if (!url || seen.has(url)) continue
    seen.add(url)
    out.push(url)
    if (out.length >= MAX_PHOTOS) break
  }
  return out
}

export function addProjectPhoto(
  project: Project,
  dataUrl: string,
): Project {
  const photos = collectPhotos({
    photoDataUrl: project.photoDataUrl,
    photos: [...project.photos, dataUrl],
  })
  return {
    ...project,
    photos,
    photoDataUrl: photos[0] ?? null,
  }
}

export function removeProjectPhoto(
  project: Project,
  dataUrl: string,
): Project {
  const photos = collectPhotos({
    photos: project.photos.filter((url) => url !== dataUrl),
  })
  return {
    ...project,
    photos,
    photoDataUrl: photos[0] ?? null,
  }
}

export function setCoverPhoto(project: Project, dataUrl: string): Project {
  const photos = collectPhotos(project)
  if (!photos.includes(dataUrl)) return project
  const next = [dataUrl, ...photos.filter((url) => url !== dataUrl)]
  return {
    ...project,
    photos: next,
    photoDataUrl: next[0] ?? null,
  }
}

function normalizeProject(p: Project): Project {
  const photos = collectPhotos(p)
  return {
    id: p.id || createId(),
    name: p.name || 'Sin nombre',
    notes: p.notes ?? '',
    photoDataUrl: photos[0] ?? null,
    photos,
    yarn: String(p.yarn ?? '').trim(),
    needles: String(p.needles ?? '').trim(),
    gaugeStitches: Math.max(0, Math.round(Number(p.gaugeStitches) || 0)),
    gaugeRows: Math.max(0, Math.round(Number(p.gaugeRows) || 0)),
    gaugeCm: Math.max(
      1,
      Math.round(Number(p.gaugeCm) || DEFAULT_GAUGE_CM) || DEFAULT_GAUGE_CM,
    ),
    gaugeMeters: Math.min(
      500,
      Math.max(0, Math.round((Number(p.gaugeMeters) || 0) * 10) / 10),
    ),
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
    archivedAt:
      typeof p.archivedAt === 'string' && p.archivedAt ? p.archivedAt : null,
    leaveNote: clipLeaveNote(String(p.leaveNote ?? '')).trim(),
    tapsLocked: Boolean(p.tapsLocked),
    pieceLabel: clipPieceLabel(String(p.pieceLabel ?? '')),
    pieceRows: Math.max(0, Math.round(Number(p.pieceRows) || 0)),
    pieceStitches: Math.max(0, Math.round(Number(p.pieceStitches) || 0)),
    sideMode: normalizeSideMode(p.sideMode),
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

export function clipLeaveNote(text: string): string {
  return text.slice(0, MAX_LEAVE_NOTE)
}

export function clipPieceLabel(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, MAX_PIECE_LABEL)
}

export function hasPiece(project: Project): boolean {
  return Boolean(project.pieceLabel.trim())
}

export function normalizeSideMode(value: unknown): SideMode {
  if (value === 'round' || value === 'off' || value === 'flat') return value
  return 'flat'
}

export function formatRowSide(row: number, mode: SideMode): string | null {
  if (mode === 'off' || row <= 0) return null
  if (mode === 'round') return 'Circular · del derecho'
  return row % 2 === 1
    ? 'Vuelta impar · del derecho'
    : 'Vuelta par · del revés'
}

export function stepRepeatTimes(step: PatternStep): number {
  return Math.max(0, Math.round(Number(step.repeatTimes) || 0))
}

export function stepRepeatDone(step: PatternStep): number {
  const times = stepRepeatTimes(step)
  return Math.min(times, Math.max(0, Math.round(Number(step.repeatDone) || 0)))
}

export function formatStepRepeat(step: PatternStep): string | null {
  const times = stepRepeatTimes(step)
  if (times <= 0) return null
  return `Van ${stepRepeatDone(step)} de ${times}`
}

export function bumpPatternRepeat(
  steps: PatternStep[],
  id: string,
  delta: number,
): PatternStep[] {
  if (!delta) return steps
  return steps.map((s) => {
    if (s.id !== id) return s
    const times = stepRepeatTimes(s)
    if (times <= 0) return s
    const next = Math.min(times, Math.max(0, stepRepeatDone(s) + delta))
    return { ...s, repeatTimes: times, repeatDone: next }
  })
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

/** Paso de esta vuelta (pendiente primero; si ya está hecha, la muestra igual). */
export function patternStepForRow(
  project: Project,
  row = project.rows,
): PatternStep | null {
  const matches = project.patternSteps
    .filter((s) => s.row === row)
    .sort(
      (a, b) =>
        Number(a.done) - Number(b.done) ||
        a.instruction.localeCompare(b.instruction, 'es'),
    )
  return matches[0] ?? null
}

export function nextPendingPatternStep(project: Project): PatternStep | null {
  const pending = project.patternSteps
    .filter((s) => !s.done)
    .sort(
      (a, b) =>
        a.row - b.row || a.instruction.localeCompare(b.instruction, 'es'),
    )
  return pending[0] ?? null
}

/** Marca los pasos pendientes de las filas recién completadas. */
export function applyRowAdvanceToPattern(
  steps: PatternStep[],
  fromRows: number,
  toRows: number,
): { steps: PatternStep[]; markedIds: string[] } {
  if (toRows <= fromRows) return { steps, markedIds: [] }
  const markedIds: string[] = []
  const next = steps.map((s) => {
    if (s.done) return s
    if (s.row > fromRows && s.row <= toRows) {
      markedIds.push(s.id)
      return { ...s, done: true }
    }
    return s
  })
  return { steps: next, markedIds }
}

export function unmarkPatternSteps(
  steps: PatternStep[],
  ids: string[] | undefined,
): PatternStep[] {
  if (!ids || ids.length === 0) return steps
  const set = new Set(ids)
  return steps.map((s) => (set.has(s.id) ? { ...s, done: false } : s))
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

const PLACEHOLDER_STRUCTURE = /^(no determinado|n\/d|n\.?\s*d\.?|-|—|–)$/i

function splitStructureChunks(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length > 1) return lines
  const numbered = text
    .split(/(?=\b\d+[.)]\s)/)
    .map((s) => s.replace(/^\d+[.)]\s*/, '').trim())
    .filter((s) => s.length > 1)
  if (numbered.length > 1) return numbered
  return text
    .split(/[.;]\s+/)
    .map((s) => s.replace(/[.;]+$/g, '').trim())
    .filter((s) => s.length > 2)
}

/** Convierte la estructura del análisis en pasos de patrón. */
export function structureToPatternSteps(
  text: string,
  startRow = 1,
): PatternStep[] {
  const trimmed = text.trim()
  if (!trimmed || PLACEHOLDER_STRUCTURE.test(trimmed)) return []
  const lines = trimmed.split(/\r?\n/)
  const hasExplicitNumbers = lines.some((raw) => {
    const line = raw.trim()
    return NUMBERED_LINE.test(line) || FILA_SPACE_LINE.test(line)
  })
  if (hasExplicitNumbers) {
    return parsePatternText(trimmed, startRow)
  }
  const chunks = splitStructureChunks(trimmed)
  if (chunks.length === 0) return []
  const start = Math.max(1, Math.round(startRow) || 1)
  return chunks.slice(0, MAX_PATTERN_STEPS).map((instruction, i) => ({
    id: createId(),
    row: start + i,
    instruction,
    done: false,
  }))
}

/** Texto pegable: inverso de parsePatternText. */
export function patternStepsToText(steps: PatternStep[]): string {
  return [...steps]
    .sort((a, b) => a.row - b.row || a.instruction.localeCompare(b.instruction))
    .map((s) => `Fila ${s.row}: ${s.instruction}`)
    .join('\n')
}

export type RepeatSpec = {
  from: number
  to: number
  times: number
}

/** «filas 10-20, 4 veces», «10-20 x 4», «repetir 10–20 4 veces». */
export function parseRepeatSpec(text: string): RepeatSpec | null {
  const t = text.trim().replace(/,/g, ' ').replace(/\s+/g, ' ')
  if (!t) return null
  const match = t.match(
    /(?:(?:filas?|vueltas?|repetir)\s+)?(\d+)\s*(?:[-–—]|a)\s*(\d+)(?:\s*(?:x|×|\*|por)\s*|\s+)(\d+)(?:\s*veces?)?/i,
  )
  if (!match) return null
  const from = Number.parseInt(match[1], 10)
  const to = Number.parseInt(match[2], 10)
  const times = Number.parseInt(match[3], 10)
  if (![from, to, times].every((n) => Number.isFinite(n))) return null
  return { from, to, times }
}

export type RepeatRangeResult =
  | { ok: true; steps: PatternStep[]; added: number }
  | { ok: false; error: string }

/** Copia el bloque de filas from–to, `times` veces, y desplaza lo que va después. */
export function repeatPatternRange(
  steps: PatternStep[],
  fromRow: number,
  toRow: number,
  times: number,
): RepeatRangeResult {
  const a = Math.max(0, Math.round(fromRow))
  const b = Math.max(0, Math.round(toRow))
  const from = Math.min(a, b)
  const to = Math.max(a, b)
  const repeats = Math.round(times)
  if (!Number.isFinite(repeats) || repeats < 2) {
    return { ok: false, error: 'Indica al menos 2 repeticiones.' }
  }
  if (repeats > 40) {
    return { ok: false, error: 'Como mucho 40 repeticiones, para no llenar el patrón.' }
  }
  const block = steps.filter((s) => s.row >= from && s.row <= to)
  if (block.length === 0) {
    return {
      ok: false,
      error: `No hay instrucciones entre las filas ${from} y ${to}.`,
    }
  }
  const extra = repeats - 1
  const added = extra * block.length
  if (steps.length + added > MAX_PATTERN_STEPS) {
    return {
      ok: false,
      error: `Eso superaría el máximo de ${MAX_PATTERN_STEPS} pasos. Quita algunas o repite menos veces.`,
    }
  }
  const span = to - from + 1
  const before = steps.filter((s) => s.row < from)
  const after = steps
    .filter((s) => s.row > to)
    .map((s) => ({ ...s, row: s.row + extra * span }))
  const copies: PatternStep[] = []
  for (let i = 1; i < repeats; i += 1) {
    for (const step of block) {
      copies.push({
        id: createId(),
        row: step.row + i * span,
        instruction: step.instruction,
        done: false,
        repeatTimes: stepRepeatTimes(step) || undefined,
        repeatDone: 0,
      })
    }
  }
  return {
    ok: true,
    steps: [...before, ...block, ...copies, ...after],
    added,
  }
}

export function justReachedGoal(
  prevRows: number,
  nextRows: number,
  targetRows: number,
): boolean {
  return (
    targetRows > 0 &&
    nextRows > prevRows &&
    prevRows < targetRows &&
    nextRows >= targetRows
  )
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
  gaugeMeters: number
  notes: string
  steps: Array<{ row: number; instruction: string }>
}

export function buildPatternShare(project: Project): PatternShareFile {
  return {
    app: 'AburriaKnittler',
    format: 1,
    kind: 'pattern',
    exportedAt: new Date().toISOString(),
    name: project.name,
    yarn: project.yarn,
    needles: project.needles,
    gaugeStitches: project.gaugeStitches,
    gaugeRows: project.gaugeRows,
    gaugeCm: project.gaugeCm,
    gaugeMeters: project.gaugeMeters,
    notes: project.notes,
    steps: sortedPatternSteps(project.patternSteps).map((s) => ({
      row: s.row,
      instruction: s.instruction,
    })),
  }
}

export function patternShareToText(share: PatternShareFile): string {
  const header = [
    share.name,
    formatGauge({
      ...createProject(share.name),
      yarn: share.yarn,
      needles: share.needles,
      gaugeStitches: share.gaugeStitches,
      gaugeRows: share.gaugeRows,
      gaugeCm: share.gaugeCm,
      gaugeMeters: share.gaugeMeters,
    }),
    share.notes.trim() || null,
  ].filter(Boolean)
  const body = share.steps
    .map((s) => `Fila ${s.row}: ${s.instruction}`)
    .join('\n')
  return [...header, '', body].join('\n').trim()
}

export function downloadPatternShare(project: Project): void {
  const share = buildPatternShare(project)
  const json = `${JSON.stringify(share, null, 2)}\n`
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `aburriaknittler-${safeFileSlug(project.name)}-patron.json`
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Comparte solo el patrón (texto o JSON), sin fotos ni contador. */
export async function sharePattern(
  project: Project,
): Promise<'shared' | 'downloaded'> {
  const share = buildPatternShare(project)
  const text = patternShareToText(share)
  try {
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function'
    ) {
      const payload: ShareData = {
        title: `Patrón — ${project.name}`,
        text,
      }
      if (!navigator.canShare || navigator.canShare(payload)) {
        await navigator.share(payload)
        return 'shared'
      }
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err
    }
  }
  downloadPatternShare(project)
  return 'downloaded'
}

function patternShareToProject(raw: Record<string, unknown>): Project {
  const name =
    typeof raw.name === 'string' && raw.name.trim()
      ? raw.name.trim()
      : 'Patrón importado'
  const incoming = Array.isArray(raw.steps) ? raw.steps : []
  const steps: PatternStep[] = incoming
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const s = item as { row?: unknown; instruction?: unknown }
      const instruction = String(s.instruction ?? '').trim()
      if (!instruction) return null
      return {
        id: createId(),
        row: Math.max(0, Math.round(Number(s.row) || 0)),
        instruction,
        done: false,
      }
    })
    .filter((s): s is PatternStep => s != null)
    .slice(0, MAX_PATTERN_STEPS)
  if (steps.length === 0) {
    throw new Error('El archivo de patrón no tiene instrucciones.')
  }
  return normalizeProject({
    ...createProject(name),
    notes: typeof raw.notes === 'string' ? raw.notes : '',
    yarn: typeof raw.yarn === 'string' ? raw.yarn : '',
    needles: typeof raw.needles === 'string' ? raw.needles : '',
    gaugeStitches: Number(raw.gaugeStitches) || 0,
    gaugeRows: Number(raw.gaugeRows) || 0,
    gaugeCm: Number(raw.gaugeCm) || DEFAULT_GAUGE_CM,
    gaugeMeters: Number(raw.gaugeMeters) || 0,
    patternSteps: steps,
  })
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

export function fileSlug(name: string): string {
  return safeFileSlug(name)
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

  if (
    (obj.app === 'AburriaKnittler' || obj.format === 1) &&
    obj.kind === 'pattern'
  ) {
    const project = patternShareToProject(obj)
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
  autoMarkedIds?: string[],
): Project {
  const entry: HistoryEntry = {
    at: new Date().toISOString(),
    rows,
    stitches,
    pieceRows: project.pieceRows,
    pieceStitches: project.pieceStitches,
    ...(autoMarkedIds && autoMarkedIds.length > 0
      ? { autoMarkedIds: [...autoMarkedIds] }
      : {}),
  }
  return {
    ...project,
    history: [entry, ...project.history].slice(0, MAX_HISTORY),
  }
}

/** Restaura el contador al estado anterior al último toque. */
export function undoLastChange(project: Project): Project {
  if (project.history.length === 0) return project
  const latest = project.history[0]
  const patternSteps = unmarkPatternSteps(
    project.patternSteps,
    latest.autoMarkedIds,
  )
  if (project.history.length === 1) {
    return {
      ...project,
      rows: 0,
      stitches: 0,
      pieceRows: latest.pieceRows != null ? 0 : project.pieceRows,
      pieceStitches: latest.pieceStitches != null ? 0 : project.pieceStitches,
      history: [],
      patternSteps,
    }
  }
  const prev = project.history[1]
  return {
    ...project,
    rows: Math.max(0, prev.rows),
    stitches: Math.max(0, prev.stitches),
    pieceRows:
      prev.pieceRows != null ? Math.max(0, prev.pieceRows) : project.pieceRows,
    pieceStitches:
      prev.pieceStitches != null
        ? Math.max(0, prev.pieceStitches)
        : project.pieceStitches,
    history: project.history.slice(1),
    patternSteps,
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
  ]
    .join(' ')
  return foldSearch(haystack).includes(q)
}

export function patternStepMatchesQuery(
  step: PatternStep,
  query: string,
): boolean {
  const q = foldSearch(query.trim())
  if (!q) return true
  return foldSearch(`${step.row} ${step.instruction}`).includes(q)
}

export type ProjectFilter = 'all' | 'inProgress' | 'withPattern' | 'withPhoto' | 'withGoal'

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

export function sortedPatternSteps(steps: PatternStep[]): PatternStep[] {
  return [...steps].sort(
    (a, b) =>
      a.row - b.row ||
      a.instruction.localeCompare(b.instruction, 'es') ||
      a.id.localeCompare(b.id),
  )
}

/** Sube o baja un paso intercambiando el número de fila con el vecino. */
export function movePatternStep(
  steps: PatternStep[],
  id: string,
  direction: -1 | 1,
): PatternStep[] {
  const sorted = sortedPatternSteps(steps)
  const index = sorted.findIndex((s) => s.id === id)
  const neighbor = index + direction
  if (index < 0 || neighbor < 0 || neighbor >= sorted.length) return steps
  const current = sorted[index]
  const other = sorted[neighbor]
  if (current.row === other.row) {
    const nextRow = Math.max(0, current.row + direction)
    return steps.map((s) => (s.id === current.id ? { ...s, row: nextRow } : s))
  }
  return steps.map((s) => {
    if (s.id === current.id) return { ...s, row: other.row }
    if (s.id === other.id) return { ...s, row: current.row }
    return s
  })
}

/** Copia un paso a continuación, misma fila, sin marcar como hecha. */
export function duplicatePatternStep(
  steps: PatternStep[],
  id: string,
): PatternStep[] {
  if (steps.length >= MAX_PATTERN_STEPS) return steps
  const index = steps.findIndex((s) => s.id === id)
  if (index < 0) return steps
  const source = steps[index]
  const copy: PatternStep = {
    id: createId(),
    row: source.row,
    instruction: source.instruction,
    done: false,
    repeatTimes: source.repeatTimes,
    repeatDone: 0,
  }
  return [...steps.slice(0, index + 1), copy, ...steps.slice(index + 1)]
}

function isoOnLocalDay(iso: string | null | undefined, keys: Set<string>): boolean {
  if (!iso) return false
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return false
  return keys.has(localDayKey(d))
}

/** Si ayer o hoy estabas tejiendo, al abrir la app ir al contador. */
export function shouldOpenCounterOnLaunch(
  project: Project | null,
  now = new Date(),
): boolean {
  if (!project || project.archivedAt) return false
  const knitted =
    project.rows > 0 ||
    project.stitches > 0 ||
    project.sessions.length > 0 ||
    Boolean(project.timerStartedAt)
  if (!knitted) return false
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const days = new Set([localDayKey(now), localDayKey(yesterday)])
  const latestSession = project.sessions[0]?.endedAt
  return (
    isoOnLocalDay(project.lastOpenedAt, days) ||
    isoOnLocalDay(project.timerStartedAt, days) ||
    isoOnLocalDay(latestSession, days)
  )
}

export const LANDING_SESSION_KEY = 'aburriaknittler.landedSession'

export function consumeFirstLandingThisSession(
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null,
): boolean {
  const store =
    storage === undefined
      ? typeof sessionStorage === 'undefined'
        ? null
        : sessionStorage
      : storage
  if (!store) return false
  try {
    if (store.getItem(LANDING_SESSION_KEY) === '1') return false
    store.setItem(LANDING_SESSION_KEY, '1')
    return true
  } catch {
    return false
  }
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

export function updatePatternStep(
  project: Project,
  stepId: string,
  patch: { row?: number; instruction?: string; repeatTimes?: number },
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
      const repeatTimes =
        patch.repeatTimes === undefined
          ? stepRepeatTimes(s)
          : Math.min(
              MAX_STEP_REPEATS,
              Math.max(0, Math.round(patch.repeatTimes)),
            )
      const repeatDone = Math.min(repeatTimes, stepRepeatDone(s))
      return { ...s, instruction, row, repeatTimes, repeatDone }
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
    archivedAt: null,
    leaveNote: '',
    tapsLocked: false,
    pieceRows: 0,
    pieceStitches: 0,
    photos: collectPhotos(project),
    photoDataUrl: collectPhotos(project)[0] ?? null,
    patternSteps: project.patternSteps.map((s) => ({
      ...s,
      id: createId(),
      done: false,
      repeatDone: 0,
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
