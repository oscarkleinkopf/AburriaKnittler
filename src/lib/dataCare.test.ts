import { describe, expect, it } from 'vitest'
import {
  buildStorageReport,
  formatBytes,
  hasKnitData,
  shouldRemindBackup,
  storageLevel,
  utf8ByteLength,
} from './dataCare'
import { createProject, type ProjectsState } from './projects'

function stateOf(projects: ReturnType<typeof createProject>[]): ProjectsState {
  return {
    version: 1,
    activeId: projects[0]?.id ?? null,
    projects,
  }
}

describe('storageLevel', () => {
  it('warns at half full and is critical near the cap or after a failed save', () => {
    const quota = 5 * 1024 * 1024
    expect(storageLevel(1000, false, quota)).toBe('ok')
    expect(storageLevel(quota * 0.5, false, quota)).toBe('warn')
    expect(storageLevel(quota * 0.85, false, quota)).toBe('critical')
    expect(storageLevel(100, true, quota)).toBe('critical')
  })
})

describe('formatBytes', () => {
  it('formats KB and MB in Spanish style', () => {
    expect(formatBytes(800)).toBe('800 B')
    expect(formatBytes(2048)).toBe('2 KB')
    expect(formatBytes(2.5 * 1024 * 1024)).toMatch(/2,5 MB|2.5 MB/)
  })
})

describe('buildStorageReport', () => {
  it('counts photo payload separately', () => {
    const withPhoto = createProject('Foto')
    withPhoto.photoDataUrl = `data:image/jpeg;base64,${'A'.repeat(1000)}`
    const report = buildStorageReport(stateOf([withPhoto]), false)
    expect(report.photoCount).toBe(1)
    expect(report.photoBytes).toBeGreaterThan(1000)
    expect(report.usedBytes).toBeGreaterThan(report.photoBytes)
  })
})

describe('utf8ByteLength', () => {
  it('counts multi-byte characters', () => {
    expect(utf8ByteLength('a')).toBe(1)
    expect(utf8ByteLength('ñ')).toBe(2)
  })
})

describe('hasKnitData', () => {
  it('is false for the empty default project', () => {
    expect(hasKnitData(stateOf([createProject('Mi primer proyecto')]))).toBe(
      false,
    )
  })

  it('is true when there is progress or a second project', () => {
    const knitting = createProject('Bufanda')
    knitting.rows = 4
    expect(hasKnitData(stateOf([knitting]))).toBe(true)
    expect(
      hasKnitData(stateOf([createProject('A'), createProject('B')])),
    ).toBe(true)
  })
})

describe('shouldRemindBackup', () => {
  const day = 24 * 60 * 60 * 1000
  const now = Date.parse('2026-08-18T12:00:00.000Z')

  it('reminds when there is data and no backup yet', () => {
    expect(shouldRemindBackup(true, now, null, null)).toBe(true)
    expect(shouldRemindBackup(false, now, null, null)).toBe(false)
  })

  it('waits two weeks after the last export', () => {
    expect(
      shouldRemindBackup(true, now, new Date(now - 3 * day).toISOString(), null),
    ).toBe(false)
    expect(
      shouldRemindBackup(
        true,
        now,
        new Date(now - 15 * day).toISOString(),
        null,
      ),
    ).toBe(true)
  })

  it('respects a recent dismiss', () => {
    expect(
      shouldRemindBackup(
        true,
        now,
        null,
        new Date(now - 2 * day).toISOString(),
      ),
    ).toBe(false)
    expect(
      shouldRemindBackup(
        true,
        now,
        null,
        new Date(now - 8 * day).toISOString(),
      ),
    ).toBe(true)
  })
})
