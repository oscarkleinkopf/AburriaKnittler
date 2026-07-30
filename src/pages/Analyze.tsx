import { useEffect, useId, useRef, useState } from 'react'
import { Banner } from '../components/Banner'
import { BigButton } from '../components/BigButton'
import {
  analyzeGarmentPhoto,
  hasGeminiKey,
  type AnalyzeResult,
} from '../lib/analyze'

type Status = 'idle' | 'loading' | 'done' | 'error'

function useOnline() {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  return online
}

export function AnalyzePage() {
  const online = useOnline()
  const gemini = hasGeminiKey()
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AnalyzeResult | null>(null)

  function onFileChange(next: File | null) {
    if (preview) URL.revokeObjectURL(preview)
    setResult(null)
    setError(null)
    setStatus('idle')
    if (!next) {
      setFile(null)
      setPreview(null)
      return
    }
    if (!next.type.startsWith('image/')) {
      setError('Elige una foto (JPG, PNG o similar).')
      setFile(null)
      setPreview(null)
      return
    }
    setFile(next)
    setPreview(URL.createObjectURL(next))
  }

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  async function analyze() {
    if (!file) return
    if (!online && gemini) return
    setStatus('loading')
    setError(null)
    setResult(null)
    try {
      const data = await analyzeGarmentPhoto(file)
      setResult(data)
      setStatus('done')
    } catch (err) {
      setStatus('error')
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo analizar la foto. Inténtalo de nuevo.',
      )
    }
  }

  const needsNetwork = gemini

  return (
    <section className="stack animate-enter" aria-labelledby="analyze-title">
      <div>
        <h1 id="analyze-title" className="page-title">
          Analizar tejido
        </h1>
        <p className="page-lead">
          Sube la foto de una prenda y recibe una guía estimada de puntos,
          filas y tipo de puntada.
        </p>
      </div>

      {!gemini && (
        <Banner tone="info">
          Modo local: sin clave Gemini la estimación es orientativa en el
          dispositivo. Para IA real, añade el secreto{' '}
          <code>VITE_GEMINI_API_KEY</code> en GitHub Actions.
        </Banner>
      )}

      {!online && needsNetwork && (
        <Banner tone="warn" role="alert">
          Sin conexión: el análisis con IA necesita internet. El contador de
          vueltas sí funciona sin red.
        </Banner>
      )}

      <div className="file-pick">
        <label htmlFor={inputId} className="sr-only">
          Elegir foto del tejido
        </label>
        <input
          id={inputId}
          ref={inputRef}
          className="file-pick__input"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
        />
        <BigButton
          variant="secondary"
          block
          onClick={() => inputRef.current?.click()}
        >
          {file ? 'Cambiar foto' : 'Elegir foto'}
        </BigButton>
        {preview && (
          <img
            className="file-pick__preview"
            src={preview}
            alt="Vista previa del tejido seleccionado"
          />
        )}
      </div>

      <BigButton
        variant="primary"
        block
        disabled={!file || status === 'loading' || (!online && needsNetwork)}
        onClick={analyze}
      >
        {status === 'loading' ? 'Analizando…' : 'Obtener estimación'}
      </BigButton>

      {error && (
        <Banner tone="error" role="alert">
          {error}
        </Banner>
      )}

      {result && status === 'done' && (
        <div className="results" aria-live="polite">
          <Banner tone="info">
            Esto es una estimación orientativa, no un patrón exacto.
          </Banner>
          <div className="results__item">
            <span className="results__label">Puntos (aprox.)</span>
            <span className="results__value">
              {result.estimatedStitches ?? 'No determinado'}
            </span>
          </div>
          <div className="results__item">
            <span className="results__label">Filas (aprox.)</span>
            <span className="results__value">
              {result.estimatedRows ?? 'No determinado'}
            </span>
          </div>
          <div className="results__item">
            <span className="results__label">Tipo de puntada</span>
            <span className="results__value">{result.stitchType}</span>
          </div>
          <div className="results__item">
            <span className="results__label">Estructura del patrón</span>
            <span className="results__value">{result.patternStructure}</span>
          </div>
          <div className="results__item">
            <span className="results__label">Confianza</span>
            <span className="results__value">{result.confidence}</span>
          </div>
          {result.notes && (
            <div className="results__item">
              <span className="results__label">Notas</span>
              <span className="results__value">{result.notes}</span>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
