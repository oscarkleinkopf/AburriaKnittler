import { LONG_SESSION_MS } from './models'
import type { KnitSession, Project, SessionDayGroup } from './types'

export function totalSessionMs(project: Project, now = Date.now()): number {
  const closed = project.sessions.reduce((sum, s) => sum + s.durationMs, 0)
  if (!project.timerStartedAt) return closed
  const started = Date.parse(project.timerStartedAt)
  if (!Number.isFinite(started)) return closed
  return closed + Math.max(0, now - started)
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

export function formatClock(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('es', {
    hour: '2-digit',
    minute: '2-digit',
  })
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

export function localDayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
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
