import { BigButton } from '../components/BigButton'
import { Banner } from '../components/Banner'
import { DataCareBanners } from '../components/DataCareBanners'
import { InstallHint } from '../components/InstallHint'
import { LongSessionBanner } from '../components/LongSessionBanner'
import { useProjects } from '../lib/ProjectsContext'
import {
  currentPatternStep,
  formatDuration,
  formatRelativeDate,
  goalProgress,
  sessionMsToday,
  totalSessionMs,
} from '../lib/projects'

const heroWebp = `${import.meta.env.BASE_URL}hero-knit.webp`
const heroPng = `${import.meta.env.BASE_URL}hero-knit.png`

export function HomePage() {
  const { active, state, stopTimer } = useProjects()

  const nextStep = active ? currentPatternStep(active) : null
  const showResume = Boolean(
    active &&
      (active.rows > 0 ||
        active.stitches > 0 ||
        Boolean(active.leaveNote.trim())),
  )

  return (
    <section className="hero animate-enter" aria-labelledby="brand-title">
      <div className="hero__copy">
        <h1 id="brand-title" className="hero__brand">
          AburriaKnittler
        </h1>
        <p className="hero__lead">
          Estima puntos y filas desde una imagen, y lleva tus vueltas sin
          perder el hilo.
        </p>

        {active && (
          <LongSessionBanner project={active} onStop={stopTimer} />
        )}

        {showResume && active && (
          <div className="resume-card">
            <Banner tone="info">
              Retoma <strong>{active.name}</strong>: ibas por la vuelta{' '}
              <strong>{active.rows}</strong>
              {active.stitches > 0 ? ` · punto ${active.stitches}` : ''}.
              {active.lastOpenedAt
                ? ` Última vez: ${formatRelativeDate(active.lastOpenedAt)}.`
                : ''}
              {active.leaveNote.trim()
                ? ` Dónde lo dejé: ${active.leaveNote}.`
                : ''}
              {nextStep
                ? ` Siguiente del patrón — fila ${nextStep.row}: ${nextStep.instruction}`
                : ''}
              {(() => {
                const goal = goalProgress(active)
                return goal
                  ? ` Meta ${goal.current} de ${goal.target}.`
                  : ''
              })()}{' '}
              Hoy {formatDuration(sessionMsToday(active))} · total{' '}
              {formatDuration(totalSessionMs(active))}.
            </Banner>
            <div className="hero__actions">
              <BigButton to="/contador" variant="primary">
                Continuar tejiendo
              </BigButton>
              <BigButton to="/patron" variant="secondary">
                Ver patrón
              </BigButton>
              <BigButton to="/analizar" variant="ghost">
                Analizar imagen
              </BigButton>
              <BigButton to="/proyectos" variant="ghost">
                Proyectos
              </BigButton>
            </div>
          </div>
        )}

        {!showResume && (
          <>
            <ol className="how-list">
              <li>Crea o elige un proyecto.</li>
              <li>Sube una imagen o anota el patrón por filas.</li>
              <li>Cuenta vueltas; el avance se guarda en este aparato.</li>
            </ol>
            <div className="hero__actions">
              <BigButton to="/analizar" variant="primary">
                Analizar imagen
              </BigButton>
              <BigButton to="/contador" variant="secondary">
                Contador
              </BigButton>
              <BigButton to="/proyectos" variant="ghost">
                Proyectos
              </BigButton>
            </div>
          </>
        )}

      </div>

      <div className="hero__visual-wrap">
        <picture>
          <source srcSet={heroWebp} type="image/webp" />
          <img
            className="hero__visual"
            src={heroPng}
            alt="AburriaKnittler: tejiendo junto a un robot asistente"
            width={1024}
            height={1024}
            decoding="async"
          />
        </picture>
      </div>

      <div className="hero__footer">
        <InstallHint />
        <DataCareBanners state={state} />
      </div>
    </section>
  )
}
