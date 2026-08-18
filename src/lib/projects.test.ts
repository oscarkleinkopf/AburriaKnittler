import { describe, expect, it } from 'vitest'
import {
  applyAnalysisToCounters,
  backupToJson,
  createProject,
  currentPatternStep,
  duplicateProject,
  formatClock,
  formatDuration,
  groupSessionsByDay,
  nextCopyName,
  parseBackupJson,
  pushHistory,
  sortProjectsByRecent,
  undoLastChange,
  updatePatternStep,
  type KnitSession,
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

describe('groupSessionsByDay', () => {
  function session(
    id: string,
    endedAt: string,
    durationMs: number,
    startedAt = endedAt,
  ): KnitSession {
    return { id, startedAt, endedAt, durationMs }
  }

  it('groups by local day with Hoy / Ayer labels and newest day first', () => {
    const now = new Date(2026, 7, 15, 18, 0, 0)
    const groups = groupSessionsByDay(
      [
        session('t1', '2026-08-15T16:00:00', 600_000, '2026-08-15T15:50:00'),
        session('t2', '2026-08-15T10:00:00', 120_000, '2026-08-15T09:58:00'),
        session('y1', '2026-08-14T21:00:00', 1_800_000, '2026-08-14T20:30:00'),
        session('old', '2026-08-10T08:00:00', 60_000, '2026-08-10T07:59:00'),
      ],
      now,
    )
    expect(groups.map((g) => g.label)).toEqual(['Hoy', 'Ayer', expect.any(String)])
    expect(groups[0].sessions.map((s) => s.id)).toEqual(['t1', 't2'])
    expect(groups[0].totalMs).toBe(720_000)
    expect(groups[1].sessions).toHaveLength(1)
    expect(groups[2].sessions[0].id).toBe('old')
  })

  it('keeps session order within a day', () => {
    const now = new Date(2026, 7, 15, 12, 0, 0)
    const groups = groupSessionsByDay(
      [
        session('newer', '2026-08-15T11:00:00', 1000),
        session('older', '2026-08-15T09:00:00', 2000),
      ],
      now,
    )
    expect(groups).toHaveLength(1)
    expect(groups[0].sessions.map((s) => s.id)).toEqual(['newer', 'older'])
  })
})

describe('formatClock', () => {
  it('returns empty string for invalid dates', () => {
    expect(formatClock('nope')).toBe('')
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

describe('undoLastChange', () => {
  it('restores the previous row and stitch counts', () => {
    let project = createProject('Bufanda')
    project.rows = 5
    project.stitches = 12
    project = pushHistory(project, 5, 12)
    project.rows = 6
    project.stitches = 0
    project = pushHistory(project, 6, 0)
    const undone = undoLastChange(project)
    expect(undone.rows).toBe(5)
    expect(undone.stitches).toBe(12)
    expect(undone.history).toHaveLength(1)
  })

  it('returns to zero when there is only one history entry', () => {
    let project = createProject('Gorro')
    project.rows = 1
    project = pushHistory(project, 1, 0)
    const undone = undoLastChange(project)
    expect(undone.rows).toBe(0)
    expect(undone.stitches).toBe(0)
    expect(undone.history).toHaveLength(0)
  })
})

describe('sortProjectsByRecent', () => {
  it('puts the most recently opened project first', () => {
    const older = createProject('Viejo')
    older.lastOpenedAt = '2026-08-01T10:00:00.000Z'
    const newer = createProject('Nuevo')
    newer.lastOpenedAt = '2026-08-15T10:00:00.000Z'
    expect(sortProjectsByRecent([older, newer]).map((p) => p.name)).toEqual([
      'Nuevo',
      'Viejo',
    ])
  })
})

describe('updatePatternStep', () => {
  it('edits row and instruction of one step', () => {
    const project = createProject('Chal')
    project.patternSteps = [
      { id: 'keep', row: 4, instruction: 'derecho', done: false },
      { id: 'edit', row: 8, instruction: 'vieja', done: false },
    ]
    const next = updatePatternStep(project, 'edit', {
      row: 10,
      instruction: '  2 juntos  ',
    })
    expect(next.patternSteps[1]).toMatchObject({
      id: 'edit',
      row: 10,
      instruction: '2 juntos',
    })
    expect(next.patternSteps[0].instruction).toBe('derecho')
  })
})

describe('duplicateProject', () => {
  it('copies pattern and notes, resets counters, and names the copy', () => {
    const original = createProject('Bufanda')
    original.rows = 12
    original.stitches = 8
    original.notes = 'Lana merina'
    original.patternSteps = [
      { id: 's1', row: 10, instruction: 'sisa', done: true },
    ]
    original.timerStartedAt = '2026-08-18T10:00:00.000Z'
    const copy = duplicateProject(original, [original.name])
    expect(copy.id).not.toBe(original.id)
    expect(copy.name).toBe('Bufanda (copia)')
    expect(copy.notes).toBe('Lana merina')
    expect(copy.rows).toBe(0)
    expect(copy.stitches).toBe(0)
    expect(copy.timerStartedAt).toBeNull()
    expect(copy.patternSteps).toHaveLength(1)
    expect(copy.patternSteps[0].id).not.toBe('s1')
    expect(copy.patternSteps[0].done).toBe(false)
    expect(copy.patternSteps[0].instruction).toBe('sisa')
  })

  it('increments copy names when (copia) already exists', () => {
    expect(nextCopyName('Bufanda', ['Bufanda', 'Bufanda (copia)'])).toBe(
      'Bufanda (copia 2)',
    )
  })
})

describe('applyAnalysisToCounters', () => {
  it('sets rows and stitches from the analysis and records history', () => {
    const project = createProject('Muestra')
    project.rows = 3
    project.stitches = 2
    const next = applyAnalysisToCounters(project, {
      estimatedRows: 40,
      estimatedStitches: 64,
      stitchType: 'jersey',
      patternStructure: '',
      confidence: 'media',
      notes: '',
    })
    expect(next.rows).toBe(40)
    expect(next.stitches).toBe(64)
    expect(next.history[0]).toMatchObject({ rows: 40, stitches: 64 })
  })

  it('keeps a missing estimate as the current counter value', () => {
    const project = createProject('Muestra')
    project.rows = 5
    project.stitches = 9
    const next = applyAnalysisToCounters(project, {
      estimatedRows: 20,
      estimatedStitches: null,
      stitchType: '',
      patternStructure: '',
      confidence: 'baja',
      notes: '',
    })
    expect(next.rows).toBe(20)
    expect(next.stitches).toBe(9)
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
