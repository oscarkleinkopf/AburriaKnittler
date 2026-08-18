import { useMemo, useState } from 'react'
import { Banner } from './Banner'
import { BigButton } from './BigButton'
import {
  buildStorageReport,
  dismissBackupReminder,
  dismissStorageHint,
  formatBytes,
  loadBackupReminderState,
  loadStorageHintDismissed,
  markBackupExported,
} from '../lib/dataCare'
import {
  downloadBackup,
  getLastSaveResult,
  type ProjectsState,
} from '../lib/projects'

type Props = {
  state: ProjectsState
  onExported?: () => void
}

export function DataCareBanners({ state, onExported }: Props) {
  const save = getLastSaveResult()
  const quotaFailed = !save.ok && save.reason === 'quota'
  const report = useMemo(
    () => buildStorageReport(state, quotaFailed),
    [state, quotaFailed],
  )
  const [hideStorage, setHideStorage] = useState(() =>
    loadStorageHintDismissed(),
  )
  const [showBackup, setShowBackup] = useState(() =>
    loadBackupReminderState(state),
  )

  function exportNow() {
    downloadBackup(state)
    markBackupExported()
    setShowBackup(false)
    onExported?.()
  }

  const showStorage =
    report.level !== 'ok' && (report.level === 'critical' || !hideStorage)

  if (!showStorage && !showBackup) return null

  return (
    <div className="data-care stack">
      {showStorage && (
        <Banner tone={report.level === 'critical' ? 'error' : 'warn'} role="alert">
          {quotaFailed
            ? 'No cupo el último guardado en este aparato. Quita una foto o exporta un respaldo.'
            : `El almacenamiento de este aparato va justo (${formatBytes(report.usedBytes)} de unos ${formatBytes(report.quotaBytes)}).`}
          {report.photoCount > 0
            ? ` Las fotos ocupan ${formatBytes(report.photoBytes)}.`
            : ''}{' '}
          Exporta un JSON para no perder el trabajo.
          <span className="banner__actions">
            <BigButton type="button" variant="secondary" onClick={exportNow}>
              Exportar ahora
            </BigButton>
            {report.level !== 'critical' && (
              <BigButton
                type="button"
                variant="ghost"
                onClick={() => {
                  dismissStorageHint()
                  setHideStorage(true)
                }}
              >
                Ahora no
              </BigButton>
            )}
          </span>
        </Banner>
      )}
      {showBackup && !showStorage && (
        <Banner tone="info">
          Lleva un tiempo sin descargar un respaldo. Un JSON te permite
          recuperarlo si cambias de móvil.
          <span className="banner__actions">
            <BigButton type="button" variant="secondary" onClick={exportNow}>
              Exportar proyectos
            </BigButton>
            <BigButton
              type="button"
              variant="ghost"
              onClick={() => {
                dismissBackupReminder()
                setShowBackup(false)
              }}
            >
              Ahora no
            </BigButton>
          </span>
        </Banner>
      )}
    </div>
  )
}
