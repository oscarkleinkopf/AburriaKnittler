import { NavLink, Outlet } from 'react-router-dom'
import { FontSizeControls } from './FontSizeControls'

export function AppShell() {
  return (
    <div className="shell">
      <header className="shell__header">
        <NavLink to="/" className="shell__brand" end>
          AburriaKnittler
        </NavLink>
        <div className="shell__tools">
          <FontSizeControls />
          <nav className="shell__nav" aria-label="Principal">
            <NavLink to="/proyectos">Proyectos</NavLink>
            <NavLink to="/patron">Patrón</NavLink>
            <NavLink to="/analizar">Analizar</NavLink>
            <NavLink to="/contador">Contador</NavLink>
          </nav>
        </div>
      </header>
      <main className="shell__main">
        <Outlet />
      </main>
    </div>
  )
}
