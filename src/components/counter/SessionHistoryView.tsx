import { BigButton } from '../BigButton'
import {
  formatClock,
  formatDuration,
  groupSessionsByDay,
  type KnitSession,
} from '../../lib/projects'

type SessionHistoryViewProps = {
  sessions: KnitSession[]
  showAll: boolean
  onToggleShowAll: () => void
}

const SESSION_PREVIEW = 8

export function SessionHistoryView({
  sessions,
  showAll,
  onToggleShowAll,
}: SessionHistoryViewProps) {
  const visible = showAll ? sessions : sessions.slice(0, SESSION_PREVIEW)
  const groups = groupSessionsByDay(visible)
  const hidden = Math.max(0, sessions.length - SESSION_PREVIEW)

  return (
    <div className="session-history">
      {groups.map((group) => (
        <section key={group.dayKey} className="session-day">
          <h3 className="session-day__head">
            <span>{group.label}</span>
            <span>{formatDuration(group.totalMs)}</span>
          </h3>
          <ol className="session-day__list">
            {group.sessions.map((s) => (
              <li key={s.id}>
                <span>
                  {formatClock(s.startedAt)}–{formatClock(s.endedAt)}
                </span>
                <span>{formatDuration(s.durationMs)}</span>
              </li>
            ))}
          </ol>
        </section>
      ))}
      {hidden > 0 && (
        <BigButton
          type="button"
          variant="ghost"
          className="session-history__more"
          onClick={onToggleShowAll}
        >
          {showAll ? 'Ver menos' : `Ver todas (${hidden} más)`}
        </BigButton>
      )}
    </div>
  )
}
