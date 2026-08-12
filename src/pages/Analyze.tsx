import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Banner } from '../components/Banner'
import { BigButton } from '../components/BigButton'
import {
  analyzeGarmentPhoto,
  hasGeminiKey,
  type AnalyzeResult,
} from '../lib/analyze'
import { useProjects } from '../lib/ProjectsContext'
import { compressImageFile } from '../lib/projects'
import {
  analysisToSpeech,
  canSpeak,
  speakText,
  stopSpeaking,
} from '../lib/speech'

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

function emptyDraft(): AnalyzeResult {
  return {
    estimatedStitches: null,
    estimatedRows: null,
    stitchType: '',
    patternStructure: '',
    confidence: 'media',
    notes: '',
  }
}

export function AnalyzePage() {
  const { active, saveAnalysis, setPhoto } = useProjects()
  const online = useOnline()
  const gemini = hasGeminiKey()
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const stitchesId = useId()
  const rowsId = useId()
  const stitchTypeId = useId()
  const structureId = useId()
  const confidenceId = useId()
  const notesId = useId()
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AnalyzeResult | null>(
    () => active?.lastAnalysis ?? null,
  )
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<AnalyzeResult>(emptyDraft)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [speaking, setSpeaking] = useState(false)

  useEffect(() => {
    setResult(active?.lastAnalysis ?? null)
    setStatus(active?.lastAnalysis ? 'done' : 'idle')
    setError(null)
    setEditing(false)
    setSaveMsg(null)
    stopSpeaking()
    setSpeaking(false)
  }, [active?.id, active?.lastAnalysis])

  useEffect(() => {
    return () => stopSpeaking()
  }, [])

  function onFileChange(next: File | null) {
    if (preview) URL.revokeObjectURL(preview)
    setResult(null)
    setError(null)
    setStatus('idle')
    setEditing(false)
    setSaveMsg(null)
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
    setEditing(false)
    setSaveMsg(null)
    try {
      const data = await analyzeGarmentPhoto(file)
      setResult(data)
      setStatus('done')
      if (active) {
        saveAnalysis(data)
        try {
          const thumb = await compressImageFile(file)
          setPhoto(thumb)
        } catch {
          // photo optional
        }
      }
    } catch (err) {
      setStatus('error')
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo analizar la foto. Inténtalo de nuevo.',
      )
    }
  }

  function startEdit() {
    setDraft(result ?? emptyDraft())
    setEditing(true)
    setSaveMsg(null)
  }

  function startBlank() {
    setDraft(emptyDraft())
    setEditing(true)
    setStatus('done')
    setSaveMsg(null)
  }

  function saveEdit(e: FormEvent) {
    e.preventDefault()
    const next: AnalyzeResult = {
      estimatedStitches:
        draft.estimatedStitches == null || Number.isNaN(draft.estimatedStitches)
          ? null
          : Math.max(0, Math.round(draft.estimatedStitches)),
      estimatedRows:
        draft.estimatedRows == null || Number.isNaN(draft.estimatedRows)
          ? null
          : Math.max(0, Math.round(draft.estimatedRows)),
      stitchType: draft.stitchType.trim() || 'No determinado',
      patternStructure: draft.patternStructure.trim() || 'No determinado',
      confidence: draft.confidence.trim() || 'media',
      notes: draft.notes.trim(),
    }
    setResult(next)
    setEditing(false)
    setStatus('done')
    if (active) {
      saveAnalysis(next)
      setSaveMsg('Corrección guardada en el proyecto.')
    } else {
      setSaveMsg('Corrección aplicada en esta pantalla.')
    }
  }

  function toggleSpeak() {
    if (!result) return
    if (speaking) {
      stopSpeaking()
      setSpeaking(false)
      return
    }
    const text = analysisToSpeech(result)
    speakText(text)
    setSpeaking(true)
    const check = window.setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        setSpeaking(false)
        window.clearInterval(check)
      }
    }, 400)
  }

  const needsNetwork = gemini
  const showResults = (result && status === 'done') || editing

  return (
    <section className="stack animate-enter" aria-labelledby="analyze-title">
      <div>
        <h1 id="analyze-title" className="page-title">
          Analizar tejido
        </h1>
        <p className="page-lead">
          {active ? (
            <>
              Proyecto activo: <strong>{active.name}</strong>. Puedes corregir
              el resultado a mano y se guarda en el proyecto.
            </>
          ) : (
            <>
              Sube una foto o escribe el conteo a mano.{' '}
              <Link to="/proyectos">Crea un proyecto</Link> para guardarlo.
            </>
          )}
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

      {!result && !editing && (
        <BigButton variant="ghost" block onClick={startBlank}>
          Escribir conteo a mano
        </BigButton>
      )}

      {error && (
        <Banner tone="error" role="alert">
          {error}
        </Banner>
      )}

      {saveMsg && <Banner tone="info">{saveMsg}</Banner>}

      {showResults && (
        <div className="results" aria-live="polite">
          {!editing && result && (
            <>
              <Banner tone="info">
                Esto es una estimación orientativa; puedes corregirla.
                {active ? ' Se guarda en el proyecto activo.' : ''}
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
              <div className="row-actions">
                <BigButton type="button" variant="secondary" onClick={startEdit}>
                  Corregir a mano
                </BigButton>
                {canSpeak() && (
                  <BigButton
                    type="button"
                    variant="ghost"
                    onClick={toggleSpeak}
                  >
                    {speaking ? 'Detener lectura' : 'Leer en voz alta'}
                  </BigButton>
                )}
              </div>
            </>
          )}

          {editing && (
            <form className="stack" onSubmit={saveEdit}>
              <h2 className="section-title">Corregir resultado</h2>
              <div className="field">
                <label htmlFor={stitchesId}>Puntos</label>
                <input
                  id={stitchesId}
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={draft.estimatedStitches ?? ''}
                  onChange={(e) => {
                    const v = e.target.value
                    setDraft((d) => ({
                      ...d,
                      estimatedStitches:
                        v === '' ? null : Number.parseInt(v, 10),
                    }))
                  }}
                />
              </div>
              <div className="field">
                <label htmlFor={rowsId}>Filas</label>
                <input
                  id={rowsId}
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={draft.estimatedRows ?? ''}
                  onChange={(e) => {
                    const v = e.target.value
                    setDraft((d) => ({
                      ...d,
                      estimatedRows: v === '' ? null : Number.parseInt(v, 10),
                    }))
                  }}
                />
              </div>
              <div className="field">
                <label htmlFor={stitchTypeId}>Tipo de puntada</label>
                <input
                  id={stitchTypeId}
                  value={draft.stitchType}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, stitchType: e.target.value }))
                  }
                  placeholder="Jersey, musgo, elástico…"
                />
              </div>
              <div className="field">
                <label htmlFor={structureId}>Estructura del patrón</label>
                <textarea
                  id={structureId}
                  rows={2}
                  value={draft.patternStructure}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      patternStructure: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="field">
                <label htmlFor={confidenceId}>Confianza</label>
                <select
                  id={confidenceId}
                  value={draft.confidence}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, confidence: e.target.value }))
                  }
                >
                  <option value="baja">baja</option>
                  <option value="media">media</option>
                  <option value="alta">alta</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor={notesId}>Notas</label>
                <textarea
                  id={notesId}
                  rows={2}
                  value={draft.notes}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, notes: e.target.value }))
                  }
                />
              </div>
              <div className="row-actions">
                <BigButton type="submit" variant="primary">
                  Guardar corrección
                </BigButton>
                <BigButton
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditing(false)
                    if (!result) setStatus('idle')
                  }}
                >
                  Cancelar
                </BigButton>
              </div>
            </form>
          )}
        </div>
      )}
    </section>
  )
}
