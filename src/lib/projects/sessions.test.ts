import { describe, expect, it } from 'vitest'
import {
  formatClock,
  formatDuration,
  groupSessionsByDay,
  isLongRunningSession,
  sessionMsToday,
  totalSessionMs,
  type KnitSession,
} from './index'

describe('sessions module', () => {
  it('formatDuration formats ms into human readable strings', () => {
    expect(formatDuration(5000)).toBe('5s')
    expect(formatDuration(65000)).toBe('1m 05s')
    expect(formatDuration(3665000)).toBe('1h 01m')
  })

  it('groupSessionsByDay groups sessions with day labels', () => {
    const now = new Date()
    const s1: KnitSession = {
      id: 's1',
      startedAt: now.toISOString(),
      endedAt: now.toISOString(),
      durationMs: 60000,
    }
    const groups = groupSessionsByDay([s1], now)
    expect(groups.length).toBe(1)
    expect(groups[0].label).toBe('Hoy')
    expect(groups[0].totalMs).toBe(60000)
  })

  it('formatClock formats ISO strings into time strings', () => {
    const iso = '2025-05-10T14:30:00.000Z'
    expect(formatClock(iso)).toBeTruthy()
    expect(formatClock('invalid')).toBe('')
  })

  it('totalSessionMs and sessionMsToday calculate elapsed and cumulative time', () => {
    const s1: KnitSession = {
      id: 's1',
      startedAt: new Date(Date.now() - 3600000).toISOString(),
      endedAt: new Date().toISOString(),
      durationMs: 3600000,
    }
    const project = {
      sessions: [s1],
      timerStartedAt: null,
    }
    expect(totalSessionMs(project as any)).toBe(3600000)
    expect(sessionMsToday(project as any)).toBeGreaterThan(0)
  })

  it('isLongRunningSession detects sessions exceeding 3 hours', () => {
    const project = {
      timerStartedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    }
    expect(isLongRunningSession(project as any)).toBe(true)

    const recent = {
      timerStartedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    }
    expect(isLongRunningSession(recent as any)).toBe(false)
  })
})
