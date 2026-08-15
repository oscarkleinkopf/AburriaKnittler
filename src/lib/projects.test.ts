import { describe, expect, it } from 'vitest'
import {
  backupToJson,
  createProject,
  currentPatternStep,
  formatDuration,
  parseBackupJson,
  type ProjectsState,
} from './projects'

function stateOf(
  projects: ReturnType<typeof createProject>[],
  activeId?: string,
): ProjectsState {
  return {
    version: 1,
    activeId: activeId ?? projects[0]?.id ?? null,
    projects,
  }
}

describe('formatDuration', () => {
  it('formats seconds, minutes and hours', () => {
    expect(formatDuration(0)).toBe('0s')
    expect(formatDuration(4500)).toBe('4s')
    expect(formatDuration(65_000)).toBe('1m 05s')
    expect(formatDuration(3_661_000)).toBe('1h 01m')
  })
})

describe('currentPatternStep', () => {
  it('prefers the pending step for the current row', () => {
    const project = createProject('Bufanda')
    project.rows = 12
    project.patternSteps = [
      { id: 'a', row: 20, instruction: 'cierre', done: false },
      { id: 'b', row: 12, instruction: '2 juntos', done: false },
      { id: 'c', row: 8, instruction: 'ya hecha', done: true },
    ]
    expect(currentPatternStep(project)?.id).toBe('b')
  })

  it('returns the earliest pending step if none match the current row', () => {
    const project = createProject('Chaleco')
    project.rows = 3
    project.patternSteps = [
      { id: 'later', row: 40, instruction: 'cuello', done: false },
      { id: 'soon', row: 10, instruction: 'sisa', done: false },
    ]
    expect(currentPatternStep(project)?.id).toBe('soon')
  })
})

describe('parseBackupJson', () => {
  it('merges a single shared project without dropping existing ones', () => {
    const current = createProject('Actual')
    const incoming = createProject('Compartido')
    const json = JSON.stringify({
      app: 'AburriaKnittler',
      format: 1,
      kind: 'project',
      project: incoming,
    })
    const result = parseBackupJson(json, stateOf([current]), 'merge')
    expect(result.added).toBe(1)
    expect(result.updated).toBe(0)
    expect(result.total).toBe(2)
    expect(result.state.projects.map((p) => p.name).sort()).toEqual([
      'Actual',
      'Compartido',
    ])
  })

  it('updates a project with the same id on merge', () => {
    const original = createProject('Bufanda')
    original.rows = 4
    const incoming = { ...original, name: 'Bufanda v2', rows: 18 }
    const json = JSON.stringify({
      app: 'AburriaKnittler',
      format: 1,
      kind: 'project',
      project: incoming,
    })
    const result = parseBackupJson(json, stateOf([original]), 'merge')
    expect(result.added).toBe(0)
    expect(result.updated).toBe(1)
    expect(result.state.projects).toHaveLength(1)
    expect(result.state.projects[0].name).toBe('Bufanda v2')
    expect(result.state.projects[0].rows).toBe(18)
  })

  it('replace mode swaps the whole library', () => {
    const keep = createProject('Viejo')
    const next = createProject('Nuevo')
    next.rows = 9
    const json = backupToJson(stateOf([next]))
    const result = parseBackupJson(json, stateOf([keep]), 'replace')
    expect(result.state.projects).toHaveLength(1)
    expect(result.state.projects[0].name).toBe('Nuevo')
    expect(result.state.projects[0].rows).toBe(9)
  })

  it('rejects invalid JSON with a Spanish error', () => {
    const current = stateOf([createProject('X')])
    expect(() => parseBackupJson('{no', current, 'merge')).toThrow(/JSON/)
  })
})
