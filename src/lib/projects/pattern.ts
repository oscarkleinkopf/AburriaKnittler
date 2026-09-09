import { createId, MAX_PATTERN_STEPS } from './models'
import type { PatternStep, Project, RepeatRangeResult, RepeatSpec } from './types'

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
      })
    }
  }
  return {
    ok: true,
    steps: [...before, ...block, ...copies, ...after],
    added,
  }
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
