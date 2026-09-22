import {
  createId,
  createProject,
  DEFAULT_GAUGE_CM,
  MAX_PATTERN_STEPS,
  normalizeProject,
} from './models'
import { sortedPatternSteps } from './pattern'
import { formatGauge } from './search'
import type {
  BackupFile,
  ImportMode,
  ImportResult,
  PatternShareFile,
  PatternStep,
  Project,
  ProjectShareFile,
  ProjectsState,
} from './types'

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

export function buildProjectShare(project: Project): ProjectShareFile {
  return {
    app: 'AburriaKnittler',
    format: 1,
    kind: 'project',
    exportedAt: new Date().toISOString(),
    project: normalizeProject(project),
  }
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
export async function shareProject(
  project: Project,
): Promise<'shared' | 'downloaded'> {
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
  const preferred =
    activeId && projects.some((p) => p.id === activeId)
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
