import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Banner } from '../components/Banner'
import { BigButton } from '../components/BigButton'
import { ImagePrepPanel } from '../components/ImagePrepPanel'
import {
  analyzeGarmentPhoto,
  hasGeminiKey,
  isLocalAnalysis,
  LOCAL_ANALYSIS_NOTICE,
  type AnalyzeResult,
} from '../lib/analyze'
import { renderPreparedImage, type PrepState } from '../lib/imagePrep'
import { useProjects } from '../lib/ProjectsContext'
import {
  analysisHasCounters,
  collectPhotos,
  compressImageFile,
  getLastSaveResult,
  MAX_PHOTOS,
  structureToPatternSteps,
} from '../lib/projects'
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
  const {
    active,
    saveAnalysis,
    addPhoto,
    removePhoto,
    applyAnalysisToCounters,
    setTargetRows,
    addPatternSteps,
  } = useProjects()
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
  const [prep, setPrep] = useState<PrepState | null>(null)
  const [prepBusy, setPrepBusy] = useState(false)
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

  function clearPreview() {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
  }

  function clearPrepSource() {
    if (prep?.sourceUrl) URL.revokeObjectURL(prep.sourceUrl)
    setPrep(null)
  }

  function resetPhoto() {
    clearPreview()
    clearPrepSource()
    setFile(null)
    setPrepBusy(false)
  }

  function onFileChange(next: File | null) {
    resetPhoto()
    setResult(null)
    setError(null)
    setStatus('idle')
    setEditing(false)
    setSaveMsg(null)
    if (!next) return
    if (!next.type.startsWith('image/')) {
      setError('Elige una foto (JPG, PNG o similar).')
      return
    }
    setPrep({
      sourceUrl: URL.createObjectURL(next),
      rotation: 0,
      cropInset: 0,
    })
  }

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
      if (prep?.sourceUrl) URL.revokeObjectURL(prep.sourceUrl)
    }
  }, [preview, prep?.sourceUrl])

  async function applyPrep() {
    if (!prep) return
    setPrepBusy(true)
    setError(null)
    try {
      const prepared = await renderPreparedImage(prep)
      clearPreview()
      setFile(prepared)
      setPreview(URL.createObjectURL(prepared))
      clearPrepSource()
      setSaveMsg('Foto lista. Ya puedes obtener la estimación.')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo preparar la foto.',
      )
    } finally {
      setPrepBusy(false)
    }
  }

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
          if (collectPhotos(active).length < MAX_PHOTOS) {
            const thumb = await compressImageFile(file)
            addPhoto(thumb)
            const save = getLastSaveResult()
            if (!save.ok && save.reason === 'quota') {
              removePhoto(thumb)
              setSaveMsg(
                'Estimación guardada. La foto no cupo; quita otra o exporta un respaldo.',
              )
            }
          }
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

  function applyToCounter() {
    if (!active || !result || !analysisHasCounters(result)) return
    const nextRows = result.estimatedRows ?? active.rows
    const nextStitches = result.estimatedStitches ?? active.stitches
    if (active.rows === nextRows && active.stitches === nextStitches) {
      setSaveMsg('El contador ya tiene esos números.')
      return
    }
    if (active.rows > 0 || active.stitches > 0) {
      const ok = window.confirm(
        `El contador está en vuelta ${active.rows}, punto ${active.stitches}. ¿Ponerlo a vuelta ${nextRows}, punto ${nextStitches}?`,
      )
      if (!ok) return
    }
    applyAnalysisToCounters(result)
    setSaveMsg(
      `Contador actualizado: vuelta ${nextRows} · punto ${nextStitches}.`,
    )
  }

  function applyAsGoal() {
    if (!active || !result || result.estimatedRows == null) return
    const n = Math.max(0, Math.round(result.estimatedRows))
    if (n <= 0) {
      setSaveMsg('Las filas estimadas no sirven como meta.')
      return
    }
    if (active.targetRows === n) {
      setSaveMsg(`La meta ya es ${n} vueltas.`)
      return
    }
    setTargetRows(n)
    setSaveMsg(`Meta del contador: ${n} vueltas.`)
  }

  function applyStructureAsPattern() {
    if (!active || !result) return
    const start = Math.max(1, active.rows || 1)
    const steps = structureToPatternSteps(result.patternStructure, start)
    if (steps.length === 0) {
      setSaveMsg(
        'No pude sacar filas de la estructura. Escríbela con una por línea o pégala en Patrón.',
      )
      return
    }
    if (active.patternSteps.length > 0) {
      const ok = window.confirm(
        `El patrón ya tiene ${active.patternSteps.length} pasos. ¿Añadir ${steps.length} más desde el análisis?`,
      )
      if (!ok) return
    }
    addPatternSteps(steps)
    setSaveMsg(
      `Añadidas ${steps.length} instrucciones al patrón (desde la fila ${steps[0].row}).`,
    )
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
              Sube una imagen (galería, archivos o cámara) o escribe el conteo a
              mano. <Link to="/proyectos">Crea un proyecto</Link> para
              guardarlo.
            </>
          )}
        </p>
      </div>

      {!gemini && (
        <Banner tone="warn" role="status">
          <span>{LOCAL_ANALYSIS_NOTICE}</span>
          {!editing && (
            <span className="banner__actions">
              <BigButton type="button" variant="primary" onClick={startBlank}>
                Escribir a mano
              </BigButton>
            </span>
          )}
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
          Elegir imagen del tejido (galería, archivos o cámara)
        </label>
        <input
          id={inputId}
          ref={inputRef}
          className="file-pick__input"
          type="file"
          accept="image/*"
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
        />
        <BigButton
          variant="secondary"
          block
          onClick={() => inputRef.current?.click()}
          disabled={prepBusy || status === 'loading'}
        >
          {file || prep ? 'Cambiar imagen' : 'Elegir imagen'}
        </BigButton>
      </div>

      {prep && (
        <ImagePrepPanel
          prep={prep}
          onChange={setPrep}
          onApply={() => void applyPrep()}
          onReset={resetPhoto}
          busy={prepBusy}
        />
      )}

      {preview && !prep && (
        <img
          className="file-pick__preview"
          src={preview}
          alt="Vista previa del tejido seleccionado"
        />
      )}

      {gemini ? (
        <BigButton
          variant="primary"
          block
          disabled={
            !file || !!prep || status === 'loading' || (!online && needsNetwork)
          }
          onClick={analyze}
        >
          {status === 'loading' ? 'Analizando…' : 'Obtener estimación'}
        </BigButton>
      ) : (
        <>
          {!result && !editing && (
            <BigButton variant="primary" block onClick={startBlank}>
              Escribir conteo a mano
            </BigButton>
          )}
          <BigButton
            variant="ghost"
            block
            disabled={!file || !!prep || status === 'loading'}
            onClick={analyze}
          >
            {status === 'loading'
              ? 'Estimando…'
              : 'Estimar igual con la foto (poco preciso)'}
          </BigButton>
        </>
      )}

      {gemini && !result && !editing && (
        <BigButton variant="ghost" block onClick={startBlank}>
          Escribir conteo a mano
        </BigButton>
      )}

      {error && (
        <Banner tone="error" role="alert">
          {error}
        </Banner>
      )}

      {saveMsg && (
        <Banner tone="info">
          {saveMsg}
          {saveMsg.startsWith('Contador actualizado') && (
            <span className="banner__actions">
              <BigButton to="/contador" variant="secondary">
                Ir al contador
              </BigButton>
            </span>
          )}
        </Banner>
      )}

      {showResults && (
        <div className="results" aria-live="polite">
          {!editing && result && (
            <>
              <Banner tone={isLocalAnalysis(result) ? 'warn' : 'info'}>
                {isLocalAnalysis(result)
                  ? 'Esta cifra sale del tamaño de la foto, no del punto. Corrígelo a mano antes de usarla.'
                  : 'Esto es una estimación orientativa; puedes corregirla.'}
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
                {active && analysisHasCounters(result) && (
                  <BigButton
                    type="button"
                    variant="primary"
                    onClick={applyToCounter}
                  >
                    Usar en el contador
                  </BigButton>
                )}
                {active && result.estimatedRows != null && (
                  <BigButton
                    type="button"
                    variant="secondary"
                    onClick={applyAsGoal}
                  >
                    Usar como meta
                  </BigButton>
                )}
                {active &&
                  structureToPatternSteps(result.patternStructure).length >
                    0 && (
                    <BigButton
                      type="button"
                      variant="secondary"
                      onClick={applyStructureAsPattern}
                    >
                      Usar como patrón
                    </BigButton>
                  )}
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
