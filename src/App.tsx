import { useRef } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { useProjects } from './lib/ProjectsContext'
import {
  consumeFirstLandingThisSession,
  shouldOpenCounterOnLaunch,
} from './lib/projects'
import { AnalyzePage } from './pages/Analyze'
import { CounterPage } from './pages/Counter'
import { HomePage } from './pages/Home'
import { PatternPage } from './pages/Pattern'
import { ProjectsPage } from './pages/Projects'

function HomeOrResume() {
  const { active } = useProjects()
  const firstVisit = useRef(consumeFirstLandingThisSession())
  if (firstVisit.current && shouldOpenCounterOnLaunch(active)) {
    return <Navigate to="/contador" replace />
  }
  return <HomePage />
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomeOrResume />} />
        <Route path="proyectos" element={<ProjectsPage />} />
        <Route path="patron" element={<PatternPage />} />
        <Route path="analizar" element={<AnalyzePage />} />
        <Route path="contador" element={<CounterPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
