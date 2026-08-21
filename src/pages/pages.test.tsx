import { fireEvent } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LOCAL_ANALYSIS_NOTICE } from '../lib/analyze'
import { AnalyzePage } from './Analyze'
import { CounterPage } from './Counter'
import { HomePage } from './Home'
import { PatternPage } from './Pattern'
import { ProjectsPage } from './Projects'
import { renderPage } from '../test/render'

describe('pantallas', () => {
  it('home shows the brand and how to start', () => {
    const { getByRole, getByText } = renderPage(<HomePage />)
    expect(getByRole('heading', { name: 'AburriaKnittler' })).toBeTruthy()
    expect(getByText(/Crea o elige un proyecto/)).toBeTruthy()
  })

  it('projects lets you search and create', () => {
    const { getByLabelText, getByRole } = renderPage(<ProjectsPage />)
    expect(getByRole('heading', { name: 'Proyectos' })).toBeTruthy()
    expect(getByLabelText('Buscar por nombre')).toBeTruthy()
    expect(getByRole('button', { name: 'Crear proyecto' })).toBeTruthy()
  })

  it('pattern shows the row instructions page', () => {
    const { getByRole } = renderPage(<PatternPage />)
    expect(getByRole('heading', { name: 'Patrón por filas' })).toBeTruthy()
    expect(getByRole('button', { name: 'Añadir al patrón' })).toBeTruthy()
  })

  it('counter shows the row count', () => {
    const { getByRole } = renderPage(<CounterPage />)
    expect(getByRole('heading', { name: 'Contador' })).toBeTruthy()
    expect(getByRole('button', { name: /Sumar vueltas/ })).toBeTruthy()
  })

  it('analyze warns that local estimates are weak and offers typing by hand', () => {
    const { getByRole, getByText } = renderPage(<AnalyzePage />)
    expect(getByRole('heading', { name: 'Analizar tejido' })).toBeTruthy()
    expect(getByText(LOCAL_ANALYSIS_NOTICE)).toBeTruthy()
    expect(
      getByRole('button', { name: 'Escribir conteo a mano' }),
    ).toBeTruthy()
  })

  it('analyze opens the hand-entry form from the warning', () => {
    const { getByRole } = renderPage(<AnalyzePage />)
    fireEvent.click(getByRole('button', { name: 'Escribir a mano' }))
    expect(getByRole('heading', { name: 'Corregir resultado' })).toBeTruthy()
    expect(getByRole('button', { name: 'Guardar corrección' })).toBeTruthy()
  })
})
