import { createId, MAX_HISTORY, MAX_NAMED_MARKERS } from './models'
import { unmarkPatternSteps } from './pattern'
import { localDayKey, totalSessionMs } from './sessions'
import {
  MIN_PACE_MS,
  MIN_PACE_ROWS,
  type GoalProgress,
  type HistoryEntry,
  type MotifProgress,
  type NamedMarker,
  type Project,
  type RemainingEstimate,
} from './types'

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

export function upsertNamedMarker(
  project: Project,
  row: number,
  label: string,
): Project {
  const text =
    String(label ?? '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 40) || 'Marcador'
  const n = Math.max(0, Math.round(row))
  const existing = project.namedMarkers.find((m) => m.row === n)
  if (existing) {
    return {
      ...project,
      namedMarkers: project.namedMarkers.map((m) =>
        m.id === existing.id ? { ...m, label: text } : m,
      ),
    }
  }
  if (project.namedMarkers.length >= MAX_NAMED_MARKERS) return project
  return {
    ...project,
    namedMarkers: [
      ...project.namedMarkers,
      { id: createId(), row: n, label: text },
    ],
  }
}

/** Filas hasta la meta o hasta el último paso del patrón. */
export function workTargetRows(project: Project): number {
  const lastStep = project.patternSteps.reduce(
    (max, s) => Math.max(max, s.row),
    0,
  )
  return Math.max(project.targetRows, lastStep)
}

export function estimateRemainingWork(
  project: Project,
  now = Date.now(),
): RemainingEstimate | null {
  const target = workTargetRows(project)
  if (target <= 0) return null
  const remainingRows = Math.max(0, target - project.rows)
  if (remainingRows === 0) return null
  const ms = totalSessionMs(project, now)
  if (project.rows < MIN_PACE_ROWS || ms < MIN_PACE_MS) return null
  const remainingMs = (remainingRows / project.rows) * ms
  const rowsPerHour = (project.rows / ms) * 3_600_000
  return {
    remainingRows,
    remainingMs,
    rowsPerHour,
  }
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

export function motifProgress(project: Project): MotifProgress | null {
  if (!project.motifEnabled || !project.motifLength || project.motifLength <= 0) {
    return null
  }
  const length = project.motifLength
  const rows = project.rows
  const currentRowInMotif = rows <= 0 ? 0 : ((rows - 1) % length) + 1
  const currentRepeat = rows <= 0 ? 0 : Math.floor((rows - 1) / length) + 1
  const targetRepeats = project.motifTargetRepeats ?? 0
  const done = targetRepeats > 0 && currentRepeat > targetRepeats

  return {
    active: true,
    currentRepeat,
    targetRepeats,
    currentRowInMotif,
    motifLength: length,
    done,
  }
}

function isoOnLocalDay(
  iso: string | null | undefined,
  keys: Set<string>,
): boolean {
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
