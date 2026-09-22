import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Banner } from '../components/Banner'
import { BigButton } from '../components/BigButton'
import { ImagePrepPanel } from '../components/ImagePrepPanel'
import { AnalyzeActionsBar } from '../components/analyze/AnalyzeActionsBar'
import { AnalyzeEditModal } from '../components/analyze/AnalyzeEditModal'
import { AnalyzeResultCard } from '../components/analyze/AnalyzeResultCard'
import { ScaleCalibrationPanel } from '../components/analyze/ScaleCalibrationPanel'
import {
  analyzeGarmentPhoto,
  hasGeminiKey,
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
    updateProject,
  } = useProjects()
  const online = useOnline()
  const gemini = hasGeminiKey()
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
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

  async function onApplyPrep() {
    if (!prep) return
    setPrepBusy(true)
    setError(null)
    try {
      const cropped = await renderPreparedImage(prep)
      clearPreview()
      clearPrepSource()
      setFile(cropped)
      setPreview(URL.createObjectURL(cropped))
    } catch {
      setError('No se pudo preparar la imagen para el análisis.')
    } finally {
      setPrepBusy(false)
    }
  }

  function onCancelPrep() {
    resetPhoto()
    if (inputRef.current) inputRef.current.value = ''
  }

  async function onAnalyze() {
    if (!file) return
    setStatus('loading')
    setError(null)
    setSaveMsg(null)
    stopSpeaking()
    setSpeaking(false)
    try {
      const r = await analyzeGarmentPhoto(file)
      setResult(r)
      setStatus('done')
      if (active) saveAnalysis(r)
    } catch (err) {
      setStatus('error')
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo completar el análisis.',
      )
    }
  }

  function handleSpeak() {
    if (!result) return
    setSpeaking(true)
    speakText(analysisToSpeech(result))
    window.setTimeout(() => setSpeaking(false), 2000)
  }

  function handleSaveEdit(updated: AnalyzeResult) {
    setResult(updated)
    setEditing(false)
    if (active) saveAnalysis(updated)
    setSaveMsg('Corrección guardada en el proyecto.')
  }

  async function handleSavePhotoToGallery() {
    if (!file || !active) return
    try {
      const dataUrl = await compressImageFile(file)
      const added = addPhoto(dataUrl)
      if (!added) {
        setSaveMsg(`Máximo de ${MAX_PHOTOS} fotos alcanzado.`)
        return
      }
      const save = getLastSaveResult()
      if (!save.ok) {
        removePhoto(dataUrl)
        setSaveMsg('No hay suficiente espacio para guardar la foto.')
        return
      }
      setSaveMsg('Foto guardada en la galería del proyecto.')
    } catch {
      setSaveMsg('No se pudo guardar la foto.')
    }
  }

  function handleApplyToCounters() {
    if (!result) return
    applyAnalysisToCounters(result)
    setSaveMsg(
      `Valores aplicados: ${result.estimatedRows ?? 0} vueltas y ${
        result.estimatedStitches ?? 0
      } puntos en el contador.`,
    )
  }

  function handleSetTarget() {
    if (!result?.estimatedRows) return
    setTargetRows(result.estimatedRows)
    setSaveMsg(`Meta fijada en ${result.estimatedRows} vueltas.`)
  }

  function handleConvertToPattern() {
    if (!result?.patternStructure) return
    const start = (active?.rows ?? 0) + 1
    const steps = structureToPatternSteps(result.patternStructure, start)
    if (steps.length === 0) {
      setSaveMsg('No se encontraron instrucciones claras en la estructura.')
      return
    }
    addPatternSteps(steps)
    setSaveMsg(`Añadidas ${steps.length} instrucciones al patrón por filas.`)
  }

  if (!active) {
    return (
      <div className="page page--analyze">
        <Banner tone="info">
          No hay ningún proyecto activo. Ve a{' '}
          <Link to="/proyectos">Proyectos</Link> para crear o elegir uno antes
          de analizar fotos.
        </Banner>
      </div>
    )
  }

  const activePhotos = collectPhotos(active)
  const hasCounters = result ? analysisHasCounters(result) : false
  const hasStructure = Boolean(result?.patternStructure && result.patternStructure !== 'No determinado')

  return (
    <div className="page page--analyze">
      <header className="page-header">
        <h1 className="page-title">Analizar tejido</h1>
        <p className="page-lead">
          Sube una foto clara de tu muestra o labor para estimar puntos, filas y tipo de puntada.
        </p>
      </header>

      {!gemini && (
        <Banner tone="warn" role="status">
          <span>{LOCAL_ANALYSIS_NOTICE}</span>
          {!editing && (
            <span className="banner__actions">
              <BigButton
                type="button"
                variant="primary"
                onClick={() => setEditing(true)}
              >
                Escribir a mano
              </BigButton>
            </span>
          )}
        </Banner>
      )}

      {saveMsg && (
        <Banner tone="success">
          <div className="banner__inline-wrap">
            <span>{saveMsg}</span>
            <button
              type="button"
              className="banner-close-btn"
              onClick={() => setSaveMsg(null)}
              aria-label="Cerrar aviso"
            >
              ✕
            </button>
          </div>
        </Banner>
      )}

      {error && (
        <Banner tone="error">
          <div className="banner__inline-wrap">
            <span>{error}</span>
            <button
              type="button"
              className="banner-close-btn"
              onClick={() => setError(null)}
              aria-label="Cerrar error"
            >
              ✕
            </button>
          </div>
        </Banner>
      )}

      <section className="analyze-upload-section">
        {!result && !editing && (
          <div className="analyze-manual-entry">
            <BigButton
              type="button"
              variant="secondary"
              onClick={() => setEditing(true)}
            >
              Escribir conteo a mano
            </BigButton>
          </div>
        )}

        <div className="field">
          <label htmlFor={inputId} className="field-label-bold">
            Seleccionar foto del tejido:
          </label>
          <input
            id={inputId}
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          />
        </div>

        {prep && (
          <ImagePrepPanel
            prep={prep}
            busy={prepBusy}
            onChange={setPrep}
            onApply={onApplyPrep}
            onReset={onCancelPrep}
          />
        )}

        {preview && !prep && (
          <div className="analyze-preview-box">
            <img src={preview} alt="Vista previa del tejido recortado" className="analyze-preview-img" />
            <div className="analyze-preview-actions">
              <BigButton
                type="button"
                variant="primary"
                onClick={onAnalyze}
                disabled={status === 'loading' || (gemini && !online)}
              >
                {status === 'loading' ? 'Analizando imagen...' : '🔍 Analizar esta foto'}
              </BigButton>
              <BigButton type="button" variant="ghost" onClick={resetPhoto}>
                Cambiar foto
              </BigButton>
            </div>
          </div>
        )}
      </section>

      {result && (
        <section className="analyze-results-section">
          <h2 className="section-title">Estimación del tejido</h2>
          <AnalyzeResultCard
            result={result}
            speaking={speaking}
            onSpeak={handleSpeak}
            onEdit={() => setEditing(true)}
            onOpenHandEntry={() => setEditing(true)}
          />

          <ScaleCalibrationPanel
            result={result}
            onSaveGauge={(gauge) => {
              if (active) {
                updateProject(active.id, gauge)
                setSaveMsg(`Muestra guardada: 10 cm = ${gauge.gaugeStitches} pts × ${gauge.gaugeRows} filas.`)
              }
            }}
          />

          <AnalyzeActionsBar
            result={result}
            hasCounters={hasCounters}
            hasStructure={hasStructure}
            hasPhotoToSave={Boolean(file)}
            photoCount={activePhotos.length}
            onApplyToCounters={handleApplyToCounters}
            onSetTarget={handleSetTarget}
            onConvertToPattern={handleConvertToPattern}
            onSaveToGallery={handleSavePhotoToGallery}
          />
        </section>
      )}

      {editing && (
        <AnalyzeEditModal
          initialData={result ?? emptyDraft()}
          onSave={handleSaveEdit}
          onCancel={() => setEditing(false)}
        />
      )}
    </div>
  )
}
