import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { YarnCalculator } from './YarnCalculator'
import { createProject } from '../../lib/projects'

describe('YarnCalculator component', () => {
  it('shows a warning if gauge is missing', () => {
    const project = createProject('Sin muestra')
    render(<YarnCalculator project={project} />)

    expect(screen.getByRole('alert')).toBeTruthy()
    expect(
      screen.getByText(/Para calcular medidas necesitas completar la/i),
    ).toBeTruthy()
  })

  it('calculates stitches and rows accurately when gauge is present', () => {
    const project = {
      ...createProject('Con muestra'),
      gaugeCm: 10,
      gaugeStitches: 20, // 2 pts / cm
      gaugeRows: 30, // 3 filas / cm
    }
    const onSetTargetRows = vi.fn()

    render(
      <YarnCalculator project={project} onSetTargetRows={onSetTargetRows} />,
    )

    // Default width is 30cm -> 60 stitches
    // Default height is 40cm -> 120 rows
    expect(screen.getByText('60')).toBeTruthy()
    expect(screen.getByText('120')).toBeTruthy()
    expect(screen.getByText('Puntos a montar')).toBeTruthy()
    expect(screen.getByText('Vueltas requeridas')).toBeTruthy()

    // Test clicking target rows button
    const targetBtn = screen.getByRole('button', { name: /Fijar 120 vueltas como meta/i })
    fireEvent.click(targetBtn)
    expect(onSetTargetRows).toHaveBeenCalledWith(120)
  })
})
