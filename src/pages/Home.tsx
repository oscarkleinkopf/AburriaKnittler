import { useEffect } from 'react'
import { BigButton } from '../components/BigButton'
import { Banner } from '../components/Banner'
import { useProjects } from '../lib/ProjectsContext'
import {
  currentPatternStep,
  formatDuration,
  formatRelativeDate,
  sessionMsToday,
  totalSessionMs,
} from '../lib/projects'

const heroSrc = `${import.meta.env.BASE_URL}hero-knit.svg`

export function HomePage() {
  const { active, markOpened } = useProjects()

  useEffect(() => {
    if (active) markOpened()
  }, [active?.id, markOpened])

  const nextStep = active ? currentPatternStep(active) : null
  const showResume = Boolean(active && (active.rows > 0 || active.stitches > 0))

  return (
    <section className="hero animate-enter" aria-labelledby="brand-title">
      <div className="hero__copy">
        <h1 id="brand-title" className="hero__brand">
          AburriaKnittler
        </h1>
        <p className="hero__lead">
          Estima puntos y filas desde una foto, y lleva tus vueltas sin perder
          el hilo.
        </p>

        {showResume && active && (
          <div className="resume-card">
            <Banner tone="info">
              Retoma <strong>{active.name}</strong>: ibas por la vuelta{' '}
              <strong>{active.rows}</strong>
              {active.stitches > 0 ? ` · punto ${active.stitches}` : ''}.
              {active.lastOpenedAt
                ? ` Última vez: ${formatRelativeDate(active.lastOpenedAt)}.`
                : ''}
              {nextStep
                ? ` Siguiente del patrón — fila ${nextStep.row}: ${nextStep.instruction}`
                : ''}
              {' '}Hoy {formatDuration(sessionMsToday(active))} · total{' '}
              {formatDuration(totalSessionMs(active))}.
            </Banner>
            <div className="hero__actions">
              <BigButton to="/contador" variant="primary">
                Continuar tejiendo
              </BigButton>
              <BigButton to="/patron" variant="secondary">
                Ver patrón
              </BigButton>
            </div>
          </div>
        )}

        {!showResume && (
          <div className="hero__actions">
            <BigButton to="/analizar" variant="primary">
              Analizar foto
            </BigButton>
            <BigButton to="/contador" variant="secondary">
              Contador
            </BigButton>
            <BigButton to="/proyectos" variant="ghost">
              Proyectos
            </BigButton>
          </div>
        )}

        {showResume && (
          <div className="hero__actions">
            <BigButton to="/analizar" variant="ghost">
              Analizar foto
            </BigButton>
            <BigButton to="/proyectos" variant="ghost">
              Proyectos
            </BigButton>
          </div>
        )}
      </div>
      <img
        className="hero__visual"
        src={heroSrc}
        alt=""
        width={1200}
        height={640}
        decoding="async"
      />
    </section>
  )
}
