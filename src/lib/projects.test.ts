import { describe, expect, it } from 'vitest'
import {
  applyAnalysisToCounters,
  backupToJson,
  buildPatternShare,
  collectPhotos,
  setCoverPhoto,
  applyRowAdvanceToPattern,
  bumpPatternRepeat,
  clipLeaveNote,
  createProject,
  currentPatternStep,
  duplicateProject,
  formatClock,
  formatDuration,
  formatGauge,
  formatRowSide,
  formatStepRepeat,
  groupSessionsByDay,
  movePatternStep,
  nextCopyName,
  nextPendingPatternStep,
  parseBackupJson,
  parsePatternText,
  parseRepeatSpec,
  patternShareToText,
  patternStepsToText,
  projectMatchesFilter,
  projectMatchesQuery,
  pushHistory,
  repeatPatternRange,
  restoreProjectInState,
  shouldOpenCounterOnLaunch,
  sortProjectsByRecent,
  structureToPatternSteps,
  undoLastChange,
  updatePatternStep,
  archiveProjectInState,
  consumeFirstLandingThisSession,
  goalProgress,
  isLongRunningSession,
  justReachedGoal,
  LONG_SESSION_MS,
  MAX_PATTERN_STEPS,
  namedMarkerAt,
  patternStepForRow,
  type KnitSession,
  type PatternStep,
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

describe('patternStepForRow', () => {
  it('prefers the pending instruction on that row', () => {
    const project = createProject('Jersey')
    project.rows = 12
    project.patternSteps = [
      { id: 'done', row: 12, instruction: 'ya', done: true },
      { id: 'now', row: 12, instruction: '2 juntos', done: false },
      { id: 'later', row: 20, instruction: 'cierre', done: false },
    ]
    expect(patternStepForRow(project)?.id).toBe('now')
    expect(nextPendingPatternStep(project)?.id).toBe('now')
    project.patternSteps[1].done = true
    expect(patternStepForRow(project)?.done).toBe(true)
    expect(nextPendingPatternStep(project)?.id).toBe('later')
  })
})

describe('applyRowAdvanceToPattern', () => {
  it('marks pending steps of the rows just completed', () => {
    const steps: PatternStep[] = [
      { id: 'a', row: 10, instruction: 'elástico', done: false },
      { id: 'b', row: 12, instruction: 'sisa', done: false },
      { id: 'c', row: 12, instruction: 'ya', done: true },
      { id: 'd', row: 20, instruction: 'cierre', done: false },
    ]
    const { steps: next, markedIds } = applyRowAdvanceToPattern(steps, 10, 12)
    expect(markedIds).toEqual(['b'])
    expect(next.find((s) => s.id === 'a')?.done).toBe(false)
    expect(next.find((s) => s.id === 'b')?.done).toBe(true)
    expect(next.find((s) => s.id === 'd')?.done).toBe(false)
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

  it('unmarks pattern steps that were auto-completed', () => {
    let project = createProject('Bufanda')
    project.patternSteps = [
      { id: 's', row: 1, instruction: 'derecho', done: false },
    ]
    const advanced = applyRowAdvanceToPattern(project.patternSteps, 0, 1)
    project = {
      ...project,
      rows: 1,
      patternSteps: advanced.steps,
    }
    project = pushHistory(project, 1, 0, advanced.markedIds)
    expect(project.patternSteps[0].done).toBe(true)
    const undone = undoLastChange(project)
    expect(undone.rows).toBe(0)
    expect(undone.patternSteps[0].done).toBe(false)
  })
})

describe('clipLeaveNote', () => {
  it('caps the parked note length', () => {
    expect(clipLeaveNote('  hola  ')).toBe('  hola  ')
    expect(clipLeaveNote('x'.repeat(400)).length).toBe(280)
  })
})

describe('formatRowSide', () => {
  it('uses odd rows as right side when knitting flat', () => {
    expect(formatRowSide(0, 'flat')).toBeNull()
    expect(formatRowSide(1, 'flat')).toMatch(/derecho/)
    expect(formatRowSide(2, 'flat')).toMatch(/revés/)
    expect(formatRowSide(3, 'round')).toMatch(/Circular/)
    expect(formatRowSide(4, 'off')).toBeNull()
  })
})

describe('bumpPatternRepeat', () => {
  it('counts repeats up to the step limit', () => {
    const steps: PatternStep[] = [
      {
        id: 'r',
        row: 12,
        instruction: '2 juntos, lazada',
        done: false,
        repeatTimes: 8,
        repeatDone: 2,
      },
    ]
    const up = bumpPatternRepeat(steps, 'r', 1)
    expect(formatStepRepeat(up[0])).toBe('Van 3 de 8')
    const maxed = bumpPatternRepeat(steps, 'r', 20)
    expect(maxed[0].repeatDone).toBe(8)
    const down = bumpPatternRepeat(steps, 'r', -5)
    expect(down[0].repeatDone).toBe(0)
  })
})

describe('piece counter undo', () => {
  it('restores the second piece with the main counters', () => {
    let project = createProject('Jersey')
    project.pieceLabel = 'Manga'
    project.pieceRows = 4
    project.pieceStitches = 2
    project = pushHistory(project, 0, 0)
    project = {
      ...project,
      pieceRows: 5,
      pieceStitches: 0,
    }
    project = pushHistory(project, 0, 0)
    const undone = undoLastChange(project)
    expect(undone.pieceRows).toBe(4)
    expect(undone.pieceStitches).toBe(2)
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
    expect(copy.archivedAt).toBeNull()
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

describe('parsePatternText', () => {
  it('reads numbered lines and continues unnumbered ones', () => {
    const steps = parsePatternText(
      'Fila 12: 2 juntos, lazada\n13) derecho\nsisa\n\n8: elástico',
      1,
    )
    expect(steps.map((s) => ({ row: s.row, instruction: s.instruction }))).toEqual(
      [
        { row: 12, instruction: '2 juntos, lazada' },
        { row: 13, instruction: 'derecho' },
        { row: 14, instruction: 'sisa' },
        { row: 8, instruction: 'elástico' },
      ],
    )
  })

  it('numbers plain lines from the start row', () => {
    const steps = parsePatternText('lazada\n2 juntos', 20)
    expect(steps.map((s) => s.row)).toEqual([20, 21])
  })
})

describe('justReachedGoal', () => {
  it('fires when the counter crosses the target', () => {
    expect(justReachedGoal(79, 80, 80)).toBe(true)
    expect(justReachedGoal(75, 85, 80)).toBe(true)
    expect(justReachedGoal(80, 81, 80)).toBe(false)
    expect(justReachedGoal(80, 79, 80)).toBe(false)
    expect(justReachedGoal(10, 11, 0)).toBe(false)
  })
})

describe('structureToPatternSteps', () => {
  it('ignores empty or placeholder structure', () => {
    expect(structureToPatternSteps('')).toEqual([])
    expect(structureToPatternSteps('No determinado')).toEqual([])
  })

  it('keeps numbered rows from the analysis', () => {
    const steps = structureToPatternSteps(
      'Fila 8: elástico\nFila 9: jersey',
    )
    expect(
      steps.map((s) => ({ row: s.row, instruction: s.instruction })),
    ).toEqual([
      { row: 8, instruction: 'elástico' },
      { row: 9, instruction: 'jersey' },
    ])
  })

  it('splits a paragraph into sequential steps', () => {
    const steps = structureToPatternSteps(
      'Cuerpo: 80 vueltas. Manga: 40 vueltas.',
      1,
    )
    expect(steps.map((s) => s.instruction)).toEqual([
      'Cuerpo: 80 vueltas',
      'Manga: 40 vueltas',
    ])
    expect(steps.map((s) => s.row)).toEqual([1, 2])
  })
})

describe('patternStepsToText', () => {
  it('round-trips with parsePatternText', () => {
    const original = parsePatternText('Fila 12: 2 juntos\n13: derecho')
    const text = patternStepsToText(original)
    expect(text).toBe('Fila 12: 2 juntos\nFila 13: derecho')
    const again = parsePatternText(text)
    expect(again.map((s) => ({ row: s.row, instruction: s.instruction }))).toEqual(
      [
        { row: 12, instruction: '2 juntos' },
        { row: 13, instruction: 'derecho' },
      ],
    )
  })
})

describe('parseRepeatSpec', () => {
  it('reads Spanish and compact forms', () => {
    expect(parseRepeatSpec('filas 10-20, 4 veces')).toEqual({
      from: 10,
      to: 20,
      times: 4,
    })
    expect(parseRepeatSpec('10-20 x 4')).toEqual({
      from: 10,
      to: 20,
      times: 4,
    })
    expect(parseRepeatSpec('repetir 10–20 4 veces')).toEqual({
      from: 10,
      to: 20,
      times: 4,
    })
    expect(parseRepeatSpec('nope')).toBeNull()
  })
})

describe('repeatPatternRange', () => {
  function steps(
    rows: Array<[number, string]>,
  ): PatternStep[] {
    return rows.map(([row, instruction], i) => ({
      id: `s${i}`,
      row,
      instruction,
      done: false,
    }))
  }

  it('copies the block and shifts later rows', () => {
    const result = repeatPatternRange(
      steps([
        [1, 'inicio'],
        [10, 'A'],
        [11, 'B'],
        [12, 'C'],
        [21, 'cierre'],
      ]),
      10,
      12,
      3,
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.added).toBe(6)
    expect(
      result.steps.map((s) => ({ row: s.row, instruction: s.instruction })),
    ).toEqual([
      { row: 1, instruction: 'inicio' },
      { row: 10, instruction: 'A' },
      { row: 11, instruction: 'B' },
      { row: 12, instruction: 'C' },
      { row: 13, instruction: 'A' },
      { row: 14, instruction: 'B' },
      { row: 15, instruction: 'C' },
      { row: 16, instruction: 'A' },
      { row: 17, instruction: 'B' },
      { row: 18, instruction: 'C' },
      { row: 21 + 2 * 3, instruction: 'cierre' },
    ])
  })

  it('rejects an empty range and too few repeats', () => {
    const existing = steps([[5, 'solo']])
    expect(repeatPatternRange(existing, 10, 20, 4).ok).toBe(false)
    expect(repeatPatternRange(existing, 5, 5, 1).ok).toBe(false)
  })

  it('refuses to exceed the step cap', () => {
    const many = steps(
      Array.from({ length: MAX_PATTERN_STEPS - 1 }, (_, i) => [i + 1, 'x']),
    )
    const result = repeatPatternRange(many, 1, MAX_PATTERN_STEPS - 1, 3)
    expect(result.ok).toBe(false)
  })
})

describe('goalProgress', () => {
  it('returns null without a target and remaining rows with one', () => {
    const project = createProject('Bufanda')
    expect(goalProgress(project)).toBeNull()
    project.targetRows = 80
    project.rows = 42
    expect(goalProgress(project)).toMatchObject({
      current: 42,
      target: 80,
      remaining: 38,
      done: false,
    })
    project.rows = 80
    expect(goalProgress(project)?.done).toBe(true)
  })
})

describe('namedMarkerAt and long session', () => {
  it('finds a named marker on a row', () => {
    const project = createProject('Jersey')
    project.namedMarkers = [
      { id: 'a', row: 30, label: 'Sisa' },
    ]
    expect(namedMarkerAt(project, 30)?.label).toBe('Sisa')
    expect(namedMarkerAt(project, 29)).toBeUndefined()
  })

  it('detects a timer running longer than three hours', () => {
    const project = createProject('Chal')
    const now = Date.parse('2026-08-18T16:00:00.000Z')
    project.timerStartedAt = new Date(now - LONG_SESSION_MS - 1000).toISOString()
    expect(isLongRunningSession(project, now)).toBe(true)
    project.timerStartedAt = new Date(now - 60_000).toISOString()
    expect(isLongRunningSession(project, now)).toBe(false)
  })
})

describe('projectMatchesQuery', () => {
  it('matches name and notes without accents', () => {
    const project = createProject('Bufanda')
    project.notes = 'Lana merina, aguja 4,5'
    expect(projectMatchesQuery(project, 'buf')).toBe(true)
    expect(projectMatchesQuery(project, 'MERINA')).toBe(true)
    expect(projectMatchesQuery(project, 'gorro')).toBe(false)
  })
})

describe('shouldOpenCounterOnLaunch', () => {
  it('opens the counter if you knitted today or yesterday', () => {
    const now = new Date(2026, 7, 20, 18, 0, 0)
    const project = createProject('Bufanda')
    expect(shouldOpenCounterOnLaunch(project, now)).toBe(false)
    project.rows = 12
    project.lastOpenedAt = new Date(2026, 7, 19, 21, 0, 0).toISOString()
    expect(shouldOpenCounterOnLaunch(project, now)).toBe(true)
    project.lastOpenedAt = new Date(2026, 7, 18, 10, 0, 0).toISOString()
    expect(shouldOpenCounterOnLaunch(project, now)).toBe(false)
    project.archivedAt = now.toISOString()
    project.lastOpenedAt = now.toISOString()
    expect(shouldOpenCounterOnLaunch(project, now)).toBe(false)
  })
})

describe('archive and restore', () => {
  it('hides the project and switches the active one', () => {
    const keep = createProject('Activo')
    const hide = createProject('Viejo')
    const before = stateOf([keep, hide], hide.id)
    const archived = archiveProjectInState(
      before,
      hide.id,
      '2026-08-20T12:00:00.000Z',
    )
    expect(archived.activeId).toBe(keep.id)
    expect(archived.projects.find((p) => p.id === hide.id)?.archivedAt).toBe(
      '2026-08-20T12:00:00.000Z',
    )
    const restored = restoreProjectInState(archived, hide.id)
    expect(restored.activeId).toBe(hide.id)
    expect(restored.projects.find((p) => p.id === hide.id)?.archivedAt).toBeNull()
  })

  it('does not archive the last open project', () => {
    const only = createProject('Único')
    const state = stateOf([only])
    expect(archiveProjectInState(state, only.id)).toBe(state)
  })
})

describe('consumeFirstLandingThisSession', () => {
  it('is true only the first time', () => {
    const map = new Map<string, string>()
    const storage = {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => {
        map.set(k, v)
      },
    }
    expect(consumeFirstLandingThisSession(storage)).toBe(true)
    expect(consumeFirstLandingThisSession(storage)).toBe(false)
  })
})

describe('collectPhotos and gauge', () => {
  it('keeps the cover photo first and caps the gallery', () => {
    const project = createProject('Chal')
    project.photoDataUrl = 'data:a'
    project.photos = ['data:b', 'data:a', 'data:c', 'data:d', 'data:e']
    expect(collectPhotos(project)).toEqual(['data:a', 'data:b', 'data:c', 'data:d'])
  })

  it('promotes a gallery photo to cover', () => {
    const project = createProject('Chal')
    project.photos = ['data:a', 'data:b', 'data:c']
    project.photoDataUrl = 'data:a'
    const next = setCoverPhoto(project, 'data:c')
    expect(next.photos).toEqual(['data:c', 'data:a', 'data:b'])
    expect(next.photoDataUrl).toBe('data:c')
    expect(setCoverPhoto(project, 'data:z')).toBe(project)
  })

  it('formats tension notes in Spanish', () => {
    const project = createProject('Bufanda')
    expect(formatGauge(project)).toBeNull()
    project.gaugeCm = 10
    project.gaugeStitches = 22
    project.gaugeRows = 30
    project.needles = '4,5 mm'
    project.yarn = 'Merina'
    expect(formatGauge(project)).toBe(
      'Muestra 10 cm: 22 puntos × 30 filas · Aguja 4,5 mm · Merina',
    )
  })
})

describe('movePatternStep', () => {
  it('swaps row numbers with the neighbor', () => {
    const steps: PatternStep[] = [
      { id: 'a', row: 8, instruction: 'elástico', done: false },
      { id: 'b', row: 12, instruction: 'sisa', done: false },
      { id: 'c', row: 20, instruction: 'cierre', done: false },
    ]
    const up = movePatternStep(steps, 'b', -1)
    expect(up.map((s) => ({ id: s.id, row: s.row }))).toEqual([
      { id: 'a', row: 12 },
      { id: 'b', row: 8 },
      { id: 'c', row: 20 },
    ])
    expect(movePatternStep(steps, 'a', -1)).toBe(steps)
  })

  it('nudges a step by one row when it shares the neighbor number', () => {
    const steps: PatternStep[] = [
      { id: 'a', row: 10, instruction: 'primero', done: false },
      { id: 'b', row: 10, instruction: 'segundo', done: false },
    ]
    const down = movePatternStep(steps, 'a', 1)
    expect(down.find((s) => s.id === 'a')?.row).toBe(11)
    expect(down.find((s) => s.id === 'b')?.row).toBe(10)
  })
})

describe('projectMatchesFilter', () => {
  it('filters in progress, pattern, photo and goal', () => {
    const idle = createProject('A')
    const knitting = createProject('B')
    knitting.rows = 4
    const patterned = createProject('C')
    patterned.patternSteps = [
      { id: 's', row: 1, instruction: 'derecho', done: false },
    ]
    const pictured = createProject('D')
    pictured.photos = ['data:x']
    const aimed = createProject('E')
    aimed.targetRows = 80
    expect(projectMatchesFilter(idle, 'inProgress')).toBe(false)
    expect(projectMatchesFilter(knitting, 'inProgress')).toBe(true)
    expect(projectMatchesFilter(patterned, 'withPattern')).toBe(true)
    expect(projectMatchesFilter(pictured, 'withPhoto')).toBe(true)
    expect(projectMatchesFilter(aimed, 'withGoal')).toBe(true)
    knitting.yarn = 'Merina extrafina'
    expect(projectMatchesQuery(knitting, 'merina')).toBe(true)
    expect(projectMatchesQuery(idle, 'merina')).toBe(false)
  })
})

describe('pattern share file', () => {
  it('round-trips as a new project without counters', () => {
    const source = createProject('Jersey')
    source.yarn = 'Algodón'
    source.patternSteps = [
      { id: 's', row: 10, instruction: '2 juntos', done: true },
    ]
    source.rows = 40
    const json = JSON.stringify(buildPatternShare(source))
    const result = parseBackupJson(json, stateOf([createProject('Actual')]), 'merge')
    expect(result.added).toBe(1)
    const imported = result.state.projects.find((p) => p.name === 'Jersey')
    expect(imported?.rows).toBe(0)
    expect(imported?.yarn).toBe('Algodón')
    expect(imported?.patternSteps).toHaveLength(1)
    expect(imported?.patternSteps[0].done).toBe(false)
    expect(imported?.patternSteps[0].instruction).toBe('2 juntos')
    expect(imported?.photoDataUrl).toBeNull()
    expect(patternShareToText(buildPatternShare(source))).toMatch(/Fila 10: 2 juntos/)
  })
})
