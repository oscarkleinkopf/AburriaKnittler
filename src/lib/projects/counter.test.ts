import { describe, expect, it } from 'vitest'
import {
  createProject,
  goalProgress,
  justReachedGoal,
  motifProgress,
  namedMarkerAt,
  pushHistory,
  shouldOpenCounterOnLaunch,
  touch,
  undoLastChange,
} from './index'

describe('counter module', () => {
  it('touch updates the updatedAt timestamp', () => {
    const p = createProject('Bufanda')
    expect(p.updatedAt).toBeTruthy()
    const touched = touch(p)
    expect(touched.updatedAt).toBeTruthy()
    expect(typeof touched.updatedAt).toBe('string')
  })

  it('pushHistory adds entries and caps at max', () => {
    let p = createProject('Manta')
    p = pushHistory(p, 5, 20)
    expect(p.history.length).toBe(1)
    expect(p.history[0].rows).toBe(5)
    expect(p.history[0].stitches).toBe(20)

    for (let i = 0; i < 50; i++) {
      p = pushHistory(p, i, 0)
    }
    expect(p.history.length).toBe(40)
  })

  it('undoLastChange reverts rows and stitches correctly', () => {
    let p = createProject('Chal')
    p = { ...p, rows: 0, stitches: 0 }
    p = pushHistory(p, 0, 0)
    p = { ...p, rows: 10, stitches: 2 }
    p = pushHistory(p, 10, 2)

    const undone = undoLastChange(p)
    expect(undone.rows).toBe(0)
    expect(undone.stitches).toBe(0)
  })

  it('justReachedGoal returns true only when crossing target threshold', () => {
    expect(justReachedGoal(9, 10, 10)).toBe(true)
    expect(justReachedGoal(10, 11, 10)).toBe(false)
    expect(justReachedGoal(5, 8, 10)).toBe(false)
    expect(justReachedGoal(10, 9, 10)).toBe(false)
    expect(justReachedGoal(0, 10, 0)).toBe(false)
  })

  it('namedMarkerAt finds matching marker by row', () => {
    let p = createProject('Jersey')
    p = {
      ...p,
      namedMarkers: [
        { id: 'm1', row: 20, label: 'Sisa' },
        { id: 'm2', row: 40, label: 'Escote' },
      ],
    }
    expect(namedMarkerAt(p, 20)?.label).toBe('Sisa')
    expect(namedMarkerAt(p, 40)?.label).toBe('Escote')
    expect(namedMarkerAt(p, 30)).toBeUndefined()
  })

  it('goalProgress calculates completion percentage and remaining rows', () => {
    let p = createProject('Gorro')
    expect(goalProgress(p)).toBeNull()

    p = { ...p, targetRows: 50, rows: 25 }
    const prog = goalProgress(p)
    expect(prog).not.toBeNull()
    expect(prog?.ratio).toBe(0.5)
    expect(prog?.remaining).toBe(25)
    expect(prog?.done).toBe(false)

    p = { ...p, rows: 50 }
    expect(goalProgress(p)?.done).toBe(true)
  })

  it('shouldOpenCounterOnLaunch returns false for empty or archived projects', () => {
    const empty = createProject('Vacio')
    expect(shouldOpenCounterOnLaunch(empty)).toBe(false)

    const archived = { ...createProject('Archivado'), rows: 10, archivedAt: new Date().toISOString() }
    expect(shouldOpenCounterOnLaunch(archived)).toBe(false)
  })

  it('motifProgress calculates current repeat and row in motif', () => {
    let p = createProject('Calado')
    expect(motifProgress(p)).toBeNull()

    p = {
      ...p,
      motifEnabled: true,
      motifLength: 8,
      motifTargetRepeats: 4,
      rows: 1,
    }
    let prog = motifProgress(p)
    expect(prog).not.toBeNull()
    expect(prog?.currentRepeat).toBe(1)
    expect(prog?.currentRowInMotif).toBe(1)
    expect(prog?.done).toBe(false)

    // Row 8 is repeat 1, row 8 in motif
    p = { ...p, rows: 8 }
    prog = motifProgress(p)
    expect(prog?.currentRepeat).toBe(1)
    expect(prog?.currentRowInMotif).toBe(8)

    // Row 9 is repeat 2, row 1 in motif
    p = { ...p, rows: 9 }
    prog = motifProgress(p)
    expect(prog?.currentRepeat).toBe(2)
    expect(prog?.currentRowInMotif).toBe(1)

    // Row 33 is repeat 5 (beyond 4 target repeats)
    p = { ...p, rows: 33 }
    prog = motifProgress(p)
    expect(prog?.currentRepeat).toBe(5)
    expect(prog?.done).toBe(true)
  })
})
