import { collectPhotos } from './photos'
import type {
  KnitSession,
  NamedMarker,
  PatternStep,
  Project,
} from './types'

export { MAX_PHOTOS } from './photos'
export const DEFAULT_GAUGE_CM = 10
export const MAX_PATTERN_STEPS = 200
export const MAX_LEAVE_NOTE = 280
export const MAX_HISTORY = 40
export const MAX_SESSIONS = 80
export const MAX_NAMED_MARKERS = 40
export const LONG_SESSION_MS = 3 * 60 * 60 * 1000

export function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function clipLeaveNote(text: string): string {
  return text.slice(0, MAX_LEAVE_NOTE)
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
    motifEnabled: false,
    motifLength: 0,
    motifTargetRepeats: 0,
  }
}

export function normalizePatternStep(s: PatternStep): PatternStep {
  return {
    id: s.id || createId(),
    row: Math.max(0, Math.round(Number(s.row) || 0)),
    instruction: String(s.instruction ?? '').trim() || 'Sin instrucción',
    done: Boolean(s.done),
  }
}

export function normalizeSession(s: KnitSession): KnitSession {
  return {
    id: s.id || createId(),
    startedAt: s.startedAt || new Date().toISOString(),
    endedAt: s.endedAt || new Date().toISOString(),
    durationMs: Math.max(0, Number(s.durationMs) || 0),
  }
}

export function normalizeNamedMarker(m: NamedMarker): NamedMarker {
  return {
    id: m.id || createId(),
    row: Math.max(0, Math.round(Number(m.row) || 0)),
    label: String(m.label ?? '').trim() || 'Marcador',
  }
}

export function normalizeProject(p: Project): Project {
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
    motifEnabled: Boolean(p.motifEnabled),
    motifLength: Math.max(0, Math.round(Number(p.motifLength) || 0)),
    motifTargetRepeats: Math.max(0, Math.round(Number(p.motifTargetRepeats) || 0)),
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
    photos: collectPhotos(project),
    photoDataUrl: collectPhotos(project)[0] ?? null,
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
