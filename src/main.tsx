import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { PrefsProvider } from './lib/PrefsContext'
import { ProjectsProvider } from './lib/ProjectsContext'
import { applyFontScale, loadFontScale } from './lib/prefs'
import './styles/tokens.css'
import './styles/app.css'

registerSW({ immediate: true })
applyFontScale(loadFontScale())

const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <PrefsProvider>
        <ProjectsProvider>
          <App />
        </ProjectsProvider>
      </PrefsProvider>
    </BrowserRouter>
  </StrictMode>,
)
