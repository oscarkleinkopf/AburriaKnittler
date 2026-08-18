import type { Project, ProjectsState } from './projects'

export const LAST_BACKUP_KEY = 'aburriaknittler.lastBackupAt'
export const BACKUP_DISMISS_KEY = 'aburriaknittler.backupRemindDismissedAt'
export const STORAGE_HINT_DISMISS_KEY = 'aburriaknittler.storageHintDismissed'

/** Safari y varios móviles limitan localStorage a unos 5 MB. */
export const ASSUMED_LOCAL_QUOTA = 5 * 1024 * 1024
export const BACKUP_REMIND_AFTER_MS = 14 * 24 * 60 * 60 * 1000
export const BACKUP_DISMISS_MS = 7 * 24 * 60 * 60 * 1000

export type StorageLevel = 'ok' | 'warn' | 'critical'

export type StorageReport = {
  usedBytes: number
  photoBytes: number
  photoCount: number
  quotaBytes: number
  level: StorageLevel
}

export function utf8ByteLength(text: string): number {
  try {
    return new TextEncoder().encode(text).length
  } catch {
    return text.length
  }
}

export function measureStateBytes(state: ProjectsState): number {
  return utf8ByteLength(JSON.stringify(state))
}

export function measurePhotoBytes(projects: Project[]): {
  bytes: number
  count: number
} {
  let bytes = 0
  let count = 0
  for (const p of projects) {
    if (!p.photoDataUrl) continue
    count += 1
    bytes += utf8ByteLength(p.photoDataUrl)
  }
  return { bytes, count }
}

export function storageLevel(
  usedBytes: number,
  quotaFailed: boolean,
  quotaBytes = ASSUMED_LOCAL_QUOTA,
): StorageLevel {
  if (quotaFailed) return 'critical'
  if (quotaBytes <= 0) return 'ok'
  const ratio = usedBytes / quotaBytes
  if (ratio >= 0.8) return 'critical'
  if (ratio >= 0.5) return 'warn'
  return 'ok'
}

export function buildStorageReport(
  state: ProjectsState,
  quotaFailed: boolean,
): StorageReport {
  const usedBytes = measureStateBytes(state)
  const photos = measurePhotoBytes(state.projects)
  return {
    usedBytes,
    photoBytes: photos.bytes,
    photoCount: photos.count,
    quotaBytes: ASSUMED_LOCAL_QUOTA,
    level: storageLevel(usedBytes, quotaFailed),
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`
  }
  const mb = bytes / (1024 * 1024)
  return `${mb.toLocaleString('es', { maximumFractionDigits: 1 })} MB`
}

export function hasKnitData(state: ProjectsState): boolean {
  if (state.projects.length > 1) return true
  return state.projects.some(
    (p) =>
      p.rows > 0 ||
      p.stitches > 0 ||
      p.patternSteps.length > 0 ||
      p.sessions.length > 0 ||
      Boolean(p.notes.trim()) ||
      Boolean(p.photoDataUrl) ||
      Boolean(p.lastAnalysis),
  )
}

export function shouldRemindBackup(
  hasData: boolean,
  now: number,
  lastBackupAt: string | null,
  dismissedAt: string | null,
  remindAfterMs = BACKUP_REMIND_AFTER_MS,
  dismissMs = BACKUP_DISMISS_MS,
): boolean {
  if (!hasData) return false
  if (dismissedAt) {
    const dismissed = Date.parse(dismissedAt)
    if (Number.isFinite(dismissed) && now - dismissed < dismissMs) return false
  }
  if (!lastBackupAt) return true
  const last = Date.parse(lastBackupAt)
  if (!Number.isFinite(last)) return true
  return now - last >= remindAfterMs
}

export function markBackupExported(at = new Date().toISOString()): void {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, at)
    localStorage.removeItem(BACKUP_DISMISS_KEY)
  } catch {
    // ignore
  }
}

export function dismissBackupReminder(at = new Date().toISOString()): void {
  try {
    localStorage.setItem(BACKUP_DISMISS_KEY, at)
  } catch {
    // ignore
  }
}

export function loadBackupReminderState(state: ProjectsState, now = Date.now()): boolean {
  try {
    return shouldRemindBackup(
      hasKnitData(state),
      now,
      localStorage.getItem(LAST_BACKUP_KEY),
      localStorage.getItem(BACKUP_DISMISS_KEY),
    )
  } catch {
    return false
  }
}

export function loadStorageHintDismissed(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_HINT_DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

export function dismissStorageHint(): void {
  try {
    sessionStorage.setItem(STORAGE_HINT_DISMISS_KEY, '1')
  } catch {
    // ignore
  }
}

function timerContinueKey(projectId: string, startedAt: string): string {
  return `aburriaknittler.timerContinue.${projectId}:${startedAt}`
}

export function isLongSessionDismissed(
  projectId: string,
  startedAt: string,
): boolean {
  try {
    return sessionStorage.getItem(timerContinueKey(projectId, startedAt)) === '1'
  } catch {
    return false
  }
}

export function dismissLongSession(
  projectId: string,
  startedAt: string,
): void {
  try {
    sessionStorage.setItem(timerContinueKey(projectId, startedAt), '1')
  } catch {
    // ignore
  }
}
