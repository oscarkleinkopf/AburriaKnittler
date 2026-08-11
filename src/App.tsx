import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { AnalyzePage } from './pages/Analyze'
import { CounterPage } from './pages/Counter'
import { HomePage } from './pages/Home'
import { ProjectsPage } from './pages/Projects'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="proyectos" element={<ProjectsPage />} />
        <Route path="analizar" element={<AnalyzePage />} />
        <Route path="contador" element={<CounterPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
