import { NavLink, Outlet } from 'react-router-dom'

export function AppShell() {
  return (
    <div className="shell">
      <header className="shell__header">
        <NavLink to="/" className="shell__brand" end>
          AburriaKnittler
        </NavLink>
        <nav className="shell__nav" aria-label="Principal">
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
