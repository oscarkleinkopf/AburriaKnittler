import { useEffect, useState } from 'react'
import { BigButton } from './BigButton'
import {
  dismissInstallHint,
  isIosDevice,
  isStandaloneDisplay,
  loadInstallHintDismissed,
  type BeforeInstallPromptEvent,
} from '../lib/install'

export function InstallHint() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  )
  const [dismissed, setDismissed] = useState(() => loadInstallHintDismissed())
  const [installed, setInstalled] = useState(() => isStandaloneDisplay())
  const ios = isIosDevice()

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed || dismissed) return null

  const canPrompt = Boolean(deferred)
  if (!canPrompt && !ios) {
    return (
      <aside className="install-hint" aria-label="Instalar la aplicación">
        <p className="install-hint__title">Úsala como app</p>
        <p className="muted">
          En el menú del navegador elige «Instalar app» o «Añadir a la pantalla
          de inicio» para abrirla a pantalla completa, también sin red.
        </p>
        <BigButton
          type="button"
          variant="ghost"
          onClick={() => {
            dismissInstallHint()
            setDismissed(true)
          }}
        >
          Ahora no
        </BigButton>
      </aside>
    )
  }

  return (
    <aside className="install-hint" aria-label="Instalar la aplicación">
      <p className="install-hint__title">Añadir a inicio</p>
      <p className="muted">
        {ios
          ? 'En Safari: botón Compartir → «Añadir a pantalla de inicio». Así queda como app, útil en cama o con poca red.'
          : 'Instálala en el teléfono para abrirla como aplicación, con el contador a un toque.'}
      </p>
      <div className="row-actions">
        {canPrompt && (
          <BigButton
            type="button"
            variant="secondary"
            onClick={async () => {
              if (!deferred) return
              await deferred.prompt()
              const choice = await deferred.userChoice
              setDeferred(null)
              if (choice.outcome === 'accepted') setInstalled(true)
            }}
          >
            Instalar app
          </BigButton>
        )}
        <BigButton
          type="button"
          variant="ghost"
          onClick={() => {
            dismissInstallHint()
            setDismissed(true)
          }}
        >
          Ahora no
        </BigButton>
      </div>
    </aside>
  )
}
