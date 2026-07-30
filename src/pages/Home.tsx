import { BigButton } from '../components/BigButton'

export function HomePage() {
  return (
    <section className="hero animate-enter" aria-labelledby="brand-title">
      <h1 id="brand-title" className="hero__brand">
        AburriaKnittler
      </h1>
      <p className="hero__lead">
        Estima puntos y filas desde una foto, y lleva tus vueltas sin perder el
        hilo.
      </p>
      <div className="hero__actions">
        <BigButton to="/analizar" variant="primary">
          Analizar foto
        </BigButton>
        <BigButton to="/contador" variant="secondary">
          Contador
        </BigButton>
      </div>
      <div
        className="hero__visual"
        role="img"
        aria-label="Textura de tejido en tonos verdes"
      />
    </section>
  )
}
