import type { ReactNode } from 'react'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PrefsProvider } from '../lib/PrefsContext'
import { ProjectsProvider } from '../lib/ProjectsContext'

export function renderPage(ui: ReactNode, path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <PrefsProvider>
        <ProjectsProvider>{ui}</ProjectsProvider>
      </PrefsProvider>
    </MemoryRouter>,
  )
}
