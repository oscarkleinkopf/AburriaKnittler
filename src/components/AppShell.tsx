import { useId, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { FontSizeControls } from './FontSizeControls'
import { usePrefs } from '../lib/PrefsContext'

export function AppShell() {
  const [a11yOpen, setA11yOpen] = useState(false)
  const panelId = useId()
  const { highContrast, theme } = usePrefs()
  const a11yOn = highContrast || theme === 'dark'

  return (
    <div className="shell">
      <header className="shell__header">
        <div className="shell__top">
          <NavLink to="/" className="shell__brand" end>
            AburriaKnittler
          </NavLink>
          <button
            type="button"
            className={`font-controls__btn${a11yOn ? ' font-controls__btn--on' : ''}${a11yOpen ? ' font-controls__btn--open' : ''}`}
            aria-expanded={a11yOpen}
            aria-controls={panelId}
            onClick={() => setA11yOpen((v) => !v)}
            title="Tamaño de letra, modo oscuro y contraste"
          >
            Aa
          </button>
        </div>
        {a11yOpen && (
          <div id={panelId} className="shell__a11y">
            <FontSizeControls />
          </div>
        )}
        <nav className="shell__nav" aria-label="Principal">
          <NavLink to="/proyectos">Proyectos</NavLink>
          <NavLink to="/patron">Patrón</NavLink>
          <NavLink to="/analizar">Analizar</NavLink>
          <NavLink to="/contador">Contador</NavLink>
        </nav>
      </header>
      <main className="shell__main">
        <Outlet />
      </main>
    </div>
  )
}
