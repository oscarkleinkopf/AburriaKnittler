import { useState } from 'react'
import { Banner } from './Banner'
import { BigButton } from './BigButton'
import {
  dismissLongSession,
  isLongSessionDismissed,
} from '../lib/dataCare'
import {
  formatDuration,
  isLongRunningSession,
  type Project,
} from '../lib/projects'

type Props = {
  project: Project
  now?: number
  onStop: () => void
}

export function LongSessionBanner({ project, now = Date.now(), onStop }: Props) {
  const startedAt = project.timerStartedAt
  const [hidden, setHidden] = useState(() =>
    startedAt ? isLongSessionDismissed(project.id, startedAt) : true,
  )

  if (!startedAt || !isLongRunningSession(project, now)) return null
  if (hidden) return null

  const elapsed = Math.max(0, now - Date.parse(startedAt))

  return (
    <Banner tone="warn" role="status">
      La sesión lleva {formatDuration(elapsed)} sin pausar. ¿Sigues tejiendo o
      la guardamos?
      <span className="banner__actions">
        <BigButton
          type="button"
          variant="primary"
          onClick={() => {
            dismissLongSession(project.id, startedAt)
            setHidden(true)
          }}
        >
          Sigo tejiendo
        </BigButton>
        <BigButton type="button" variant="secondary" onClick={onStop}>
          Pausar / guardar
        </BigButton>
      </span>
    </Banner>
  )
}
