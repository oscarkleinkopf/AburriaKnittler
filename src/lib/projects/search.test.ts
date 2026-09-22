import { describe, expect, it } from 'vitest'
import {
  archivedProjects,
  createProject,
  foldSearch,
  formatGauge,
  openProjects,
  projectMatchesFilter,
  projectMatchesQuery,
  sortProjectsByRecent,
} from './index'

describe('search module', () => {
  it('foldSearch removes accents and normalizes to lower case', () => {
    expect(foldSearch('Patrón')).toBe('patron')
    expect(foldSearch('GUANTE TRENZADO')).toBe('guante trenzado')
    expect(foldSearch('MÉRINO ÓPTIMO')).toBe('merino optimo')
  })

  it('projectMatchesQuery matches name, notes, yarn or needles without accents', () => {
    const p = {
      ...createProject('Calcetines Cálidos'),
      yarn: 'Lana Merino 100%',
      needles: '3 mm',
      notes: 'Para el invierno',
    }
    expect(projectMatchesQuery(p, 'calcetines')).toBe(true)
    expect(projectMatchesQuery(p, 'calidos')).toBe(true)
    expect(projectMatchesQuery(p, 'merino')).toBe(true)
    expect(projectMatchesQuery(p, 'invierno')).toBe(true)
    expect(projectMatchesQuery(p, 'bufanda')).toBe(false)
  })

  it('projectMatchesFilter correctly filters by condition', () => {
    const fresh = createProject('Nuevo')
    const inProg = { ...createProject('En curso'), rows: 10 }
    const withPat = {
      ...createProject('Con patron'),
      patternSteps: [{ id: '1', row: 1, instruction: '1 der', done: false }],
    }
    const withGoal = { ...createProject('Con meta'), targetRows: 80 }

    expect(projectMatchesFilter(fresh, 'all')).toBe(true)
    expect(projectMatchesFilter(fresh, 'inProgress')).toBe(false)
    expect(projectMatchesFilter(inProg, 'inProgress')).toBe(true)
    expect(projectMatchesFilter(withPat, 'withPattern')).toBe(true)
    expect(projectMatchesFilter(withGoal, 'withGoal')).toBe(true)
  })

  it('openProjects and archivedProjects filter appropriately', () => {
    const p1 = createProject('Abierto')
    const p2 = { ...createProject('Archivado'), archivedAt: new Date().toISOString() }
    const list = [p1, p2]

    expect(openProjects(list).map((p) => p.name)).toEqual(['Abierto'])
    expect(archivedProjects(list).map((p) => p.name)).toEqual(['Archivado'])
  })

  it('formatGauge formats complete gauge metadata', () => {
    const p = {
      ...createProject('Muestra test'),
      yarn: 'Algodón fino',
      needles: '4 mm',
      gaugeStitches: 22,
      gaugeRows: 30,
      gaugeCm: 10,
    }
    const formatted = formatGauge(p)
    expect(formatted).toContain('Muestra 10 cm: 22 puntos × 30 filas')
    expect(formatted).toContain('Aguja 4 mm')
    expect(formatted).toContain('Algodón fino')
  })

  it('sortProjectsByRecent orders projects by most recently active first', () => {
    const p1 = {
      ...createProject('Antiguo'),
      lastOpenedAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    }
    const p2 = {
      ...createProject('Reciente'),
      lastOpenedAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    }
    const sorted = sortProjectsByRecent([p1, p2])
    expect(sorted[0].name).toBe('Reciente')
    expect(sorted[1].name).toBe('Antiguo')
  })
})
