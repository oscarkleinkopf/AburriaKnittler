import type { AnalyzeResult } from './analyze'

export type HistoryEntry = {
  at: string
  rows: number
  stitches: number
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
}

export type ProjectsState = {
  version: 1
  activeId: string | null
  projects: Project[]
}

const STORAGE_KEY = 'aburriaknittler.projects.v1'
const LEGACY_ROW_KEY = 'aburriaknittler.rowCount'
const MAX_HISTORY = 40

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
  }
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
