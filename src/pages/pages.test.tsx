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

  it('pattern shows the row instructions page', () => {
    const { getByRole, getByLabelText } = renderPage(<PatternPage />)
    expect(getByRole('heading', { name: 'Patrón por filas' })).toBeTruthy()
    expect(getByRole('button', { name: 'Añadir al patrón' })).toBeTruthy()
    expect(getByRole('button', { name: 'Compartir patrón' })).toBeTruthy()
    expect(getByRole('button', { name: 'Imprimir' })).toBeTruthy()
    expect(getByRole('heading', { name: 'Muestra / tensión' })).toBeTruthy()
    expect(getByRole('heading', { name: 'Calculadora' })).toBeTruthy()
    expect(getByLabelText('Ancho que quieres (cm)')).toBeTruthy()
    expect(getByLabelText('Puntos ahora')).toBeTruthy()
    expect(getByLabelText('Cómo disminuir')).toBeTruthy()
    expect(getByLabelText('Metros en esa muestra')).toBeTruthy()
    expect(getByLabelText(/Repeticiones en esta fila/)).toBeTruthy()
  })

  it('calculator turns gauge into a cast-on and even decreases', () => {
    const { getByLabelText, getByRole, getByText } = renderPage(<PatternPage />)
    fireEvent.change(getByLabelText('Puntos en esa muestra'), {
      target: { value: '22' },
    })
    fireEvent.change(getByLabelText('Ancho que quieres (cm)'), {
      target: { value: '45' },
    })
    expect(
      getByText((_, node) =>
        Boolean(
          node?.classList.contains('calc-result') &&
            node.textContent?.includes('Monta 99 puntos para 45 cm'),
        ),
      ),
    ).toBeTruthy()
    fireEvent.change(getByLabelText('Puntos ahora'), {
      target: { value: '100' },
    })
    fireEvent.change(getByLabelText('Puntos a disminuir'), {
      target: { value: '8' },
    })
    expect(getByText(/Disminuye 8: de 100 a 92 puntos/)).toBeTruthy()
    expect(
      getByRole('button', { name: 'Añadir cálculo al patrón' }),
    ).toBeTruthy()
    fireEvent.change(getByLabelText('Metros en esa muestra'), {
      target: { value: '8' },
    })
    fireEvent.change(getByLabelText('Largo que quieres (cm)'), {
      target: { value: '60' },
    })
    expect(
      getByText((_, node) =>
        Boolean(
          node?.classList.contains('calc-result') &&
            node.textContent?.includes('Unas 216 m de lana'),
        ),
      ),
    ).toBeTruthy()
    fireEvent.change(getByLabelText('Cómo disminuir'), {
      target: { value: 'ssk' },
    })
    expect(
      getByText((_, node) =>
        Boolean(
          node?.classList.contains('calc-result') &&
            node.textContent?.includes('2 juntos revés (SSK)'),
        ),
      ),
    ).toBeTruthy()
  })

  it('lets you search and duplicate a pattern step', () => {
    const { getByLabelText, getByRole, getByText, queryByRole } = renderPage(
      <PatternPage />,
    )
    fireEvent.change(getByLabelText('Fila'), { target: { value: '12' } })
    fireEvent.change(getByLabelText('Instrucción'), {
      target: { value: 'cerrar sisa' },
    })
    fireEvent.click(getByRole('button', { name: 'Añadir al patrón' }))
    expect(getByRole('button', { name: 'Duplicar' })).toBeTruthy()
    fireEvent.change(getByLabelText('Buscar en el patrón'), {
      target: { value: 'sisa' },
    })
    expect(getByRole('button', { name: 'Duplicar' })).toBeTruthy()
    fireEvent.change(getByLabelText('Buscar en el patrón'), {
      target: { value: 'cuello' },
    })
    expect(getByText(/Ningún paso coincide/)).toBeTruthy()
    expect(queryByRole('button', { name: 'Duplicar' })).toBeNull()
    fireEvent.change(getByLabelText('Buscar en el patrón'), {
      target: { value: '' },
    })
    fireEvent.click(getByRole('button', { name: 'Duplicar' }))
    expect(getByText(/Copiada la fila 12/)).toBeTruthy()
  })

  it('projects lets you search, filter and create', () => {
    const { getByLabelText, getByRole } = renderPage(<ProjectsPage />)
    expect(getByRole('heading', { name: 'Proyectos' })).toBeTruthy()
    expect(getByLabelText('Buscar por nombre')).toBeTruthy()
    expect(getByRole('button', { name: 'Crear proyecto' })).toBeTruthy()
    expect(getByRole('button', { name: 'Todos' })).toBeTruthy()
    expect(getByRole('button', { name: 'En curso' })).toBeTruthy()
    expect(getByRole('button', { name: 'Con patrón' })).toBeTruthy()
    expect(getByRole('button', { name: 'Con foto' })).toBeTruthy()
    expect(getByRole('button', { name: 'Con meta' })).toBeTruthy()
  })

  it('counter shows the row count, leave note and lock', () => {
    const { getByRole, getByLabelText, getByText } = renderPage(<CounterPage />)
    expect(getByRole('heading', { name: 'Contador' })).toBeTruthy()
    expect(getByRole('button', { name: /Sumar vueltas/ })).toBeTruthy()
    expect(getByLabelText('Dónde lo dejé')).toBeTruthy()
    expect(getByRole('button', { name: 'Bloquear toques' })).toBeTruthy()
    expect(
      getByRole('button', { name: /Añadir segunda pieza/ }),
    ).toBeTruthy()
    expect(getByText(/Plano \(impar derecho/)).toBeTruthy()
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
