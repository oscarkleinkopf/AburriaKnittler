import { BigButton } from '../components/BigButton'

const heroSrc = `${import.meta.env.BASE_URL}hero-knit.svg`

export function HomePage() {
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
        <div className="hero__actions">
          <BigButton to="/analizar" variant="primary">
            Analizar foto
          </BigButton>
          <BigButton to="/contador" variant="secondary">
            Contador
          </BigButton>
        </div>
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
