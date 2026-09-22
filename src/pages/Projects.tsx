import { useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { Banner } from '../components/Banner'
import { BigButton } from '../components/BigButton'
import { DataCareBanners } from '../components/DataCareBanners'
import { ProjectCard } from '../components/projects/ProjectCard'
import { ProjectEditModal } from '../components/projects/ProjectEditModal'
import {
  ProjectFiltersBar,
  type SortMode,
} from '../components/projects/ProjectFiltersBar'
import { ProjectGallery } from '../components/projects/ProjectGallery'
import { ProjectStatsSummary } from '../components/projects/ProjectStatsSummary'
import { ProjectTechSheetModal } from '../components/projects/ProjectTechSheetModal'
import { useProjects } from '../lib/ProjectsContext'
import {
  buildStorageReport,
  formatBytes,
  markBackupExported,
} from '../lib/dataCare'
import {
  collectPhotos,
  compressImageFile,
  downloadBackup,
  downloadProject,
  getLastSaveResult,
  MAX_PHOTOS,
  openProjects,
  archivedProjects,
  projectMatchesFilter,
  projectMatchesQuery,
  readBackupFile,
  shareProject,
  sortProjectsByRecent,
  type ImportMode,
  type Project,
  type ProjectFilter,
} from '../lib/projects'

export function ProjectsPage() {
  const {
    state,
    active,
    setActive,
    addProject,
    duplicateProject,
    updateProject,
    archiveProject,
    restoreProject,
    deleteProject,
    setPhoto,
    addPhoto,
    removePhoto,
    importBackup,
  } = useProjects()
  const nameId = useId()
  const notesId = useId()
  const importId = useId()
  const importRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [importMode, setImportMode] = useState<ImportMode>('merge')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ProjectFilter>('all')
  const [sortMode, setSortMode] = useState<SortMode>('recent')
  const [showArchived, setShowArchived] = useState(false)
  const [techSheetProject, setTechSheetProject] = useState<Project | null>(null)

  const save = getLastSaveResult()
  const storage = buildStorageReport(
    state,
    !save.ok && save.reason === 'quota',
  )
  const openCount = openProjects(state.projects).length
  const archivedList = archivedProjects(state.projects)

  const visibleOpen = useMemo(() => {
    const filtered = openProjects(state.projects).filter(
      (p) => projectMatchesQuery(p, query) && projectMatchesFilter(p, filter),
    )
    if (sortMode === 'name') {
      return [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'es'))
    }
    if (sortMode === 'rows') {
      return [...filtered].sort((a, b) => b.rows - a.rows || a.name.localeCompare(b.name, 'es'))
    }
    return sortProjectsByRecent(filtered)
  }, [state.projects, query, filter, sortMode])

  const visibleArchived = useMemo(() => {
    const filtered = archivedProjects(state.projects).filter(
      (p) => projectMatchesQuery(p, query) && projectMatchesFilter(p, filter),
    )
    if (sortMode === 'name') {
      return [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'es'))
    }
    if (sortMode === 'rows') {
      return [...filtered].sort((a, b) => b.rows - a.rows || a.name.localeCompare(b.name, 'es'))
    }
    return sortProjectsByRecent(filtered)
  }, [state.projects, query, filter, sortMode])

  function onCreate(e: FormEvent) {
    e.preventDefault()
    const project = addProject(name, notes)
    setName('')
    setNotes('')
    setError(null)
    setMessage(`Proyecto «${project.name}» listo.`)
  }

  function startEdit(id: string) {
    setEditingId(id)
  }

  function saveEdit(editName: string, editNotes: string) {
    if (!editingId) return
    updateProject(editingId, {
      name: editName.trim() || 'Sin nombre',
      notes: editNotes.trim(),
    })
    setEditingId(null)
    setError(null)
    setMessage('Proyecto actualizado.')
  }

  async function onPhotoUpload(file: File) {
    if (!active) return
    if (collectPhotos(active).length >= MAX_PHOTOS) {
      setMessage(null)
      setError(`Como mucho ${MAX_PHOTOS} fotos. Quita una primero.`)
      return
    }
    try {
      const dataUrl = await compressImageFile(file)
      addPhoto(dataUrl)
      const save = getLastSaveResult()
      if (!save.ok) {
        removePhoto(dataUrl)
        setMessage(null)
        setError(
          save.reason === 'quota'
            ? 'La foto no cabe en este aparato. Quita otra foto o exporta un respaldo.'
            : 'No se pudo guardar la foto.',
        )
        return
      }
      setError(null)
      setMessage('Foto guardada en el proyecto.')
    } catch {
      setMessage(null)
      setError('No se pudo guardar la foto.')
    }
  }

  function onExport() {
    try {
      downloadBackup(state)
      markBackupExported()
      setError(null)
      setMessage(
        `Respaldo descargado (${state.projects.length} proyecto${
          state.projects.length === 1 ? '' : 's'
        }).`,
      )
    } catch {
      setMessage(null)
      setError('No se pudo crear el archivo de respaldo.')
    }
  }

  async function onImport(file: File | null) {
    if (!file) return
    try {
      const text = await readBackupFile(file)
      const res = importBackup(text, importMode)
      setError(null)
      setMessage(
        `Importación completada: ${res.added} añadido(s), ${res.updated} actualizado(s). Total: ${res.total}.`,
      )
      if (importRef.current) importRef.current.value = ''
    } catch (err) {
      setMessage(null)
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo importar el archivo de respaldo.',
      )
    }
  }

  async function handleShare(project: Project) {
    try {
      const outcome = await shareProject(project)
      if (outcome === 'downloaded') {
        setMessage(`Archivo JSON de «${project.name}» descargado.`)
      }
    } catch {
      // Ignorar cancelaciones
    }
  }

  function handleDelete(id: string, projectName: string) {
    if (state.projects.length <= 1) {
      alert('Debes tener al menos un proyecto. No puedes eliminar el único que queda.')
      return
    }
    if (window.confirm(`¿Eliminar «${projectName}» definitivamente?`)) {
      deleteProject(id)
      setMessage(`Proyecto «${projectName}» eliminado.`)
    }
  }

  const editingProject = editingId
    ? state.projects.find((p) => p.id === editingId)
    : null

  return (
    <div className="page page--projects">
      <DataCareBanners state={state} />

      <header className="page-header">
        <h1 className="page-title">Proyectos</h1>
        <p className="page-lead">
          Administra tus labores de punto y ganchillo, respaldos y fotos.
        </p>
      </header>

      <ProjectStatsSummary projects={state.projects} />

      {message && (
        <Banner tone="success">
          <div className="banner__inline-wrap">
            <span>{message}</span>
            <button
              type="button"
              className="banner-close-btn"
              onClick={() => setMessage(null)}
              aria-label="Cerrar mensaje"
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

      <ProjectFiltersBar
        query={query}
        onQueryChange={setQuery}
        filter={filter}
        onFilterChange={setFilter}
        sortMode={sortMode}
        onSortModeChange={setSortMode}
      />

      <section className="projects-list-section" aria-label="Lista de proyectos">
        {visibleOpen.length > 0 ? (
          <div className="projects-grid">
            {visibleOpen.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                isActive={p.id === active?.id}
                onSelect={setActive}
                onEdit={startEdit}
                onDuplicate={(id) => {
                  const copy = duplicateProject(id)
                  if (copy) setMessage(`Creada copia «${copy.name}».`)
                }}
                onArchive={archiveProject}
                onDelete={(id) => handleDelete(id, p.name)}
                onShare={handleShare}
                onDownload={downloadProject}
                onViewTechSheet={(proj) => setTechSheetProject(proj)}
                canArchive={openCount > 1}
              />
            ))}
          </div>
        ) : (
          <p className="projects-empty">
            No se encontraron proyectos activos con los filtros aplicados.
          </p>
        )}
      </section>

      {archivedList.length > 0 && (
        <section className="archived-section" aria-label="Proyectos archivados">
          <div className="archived-section__header">
            <h2 className="section-title">
              Archivados ({archivedList.length})
            </h2>
            <button
              type="button"
              className="archived-toggle-btn"
              onClick={() => setShowArchived((prev) => !prev)}
            >
              {showArchived ? 'Ocultar archivados' : 'Mostrar archivados'}
            </button>
          </div>

          {showArchived && (
            <div className="projects-grid">
              {visibleArchived.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  isActive={false}
                  onSelect={setActive}
                  onEdit={startEdit}
                  onDuplicate={(id) => {
                    const copy = duplicateProject(id)
                    if (copy) setMessage(`Creada copia «${copy.name}».`)
                  }}
                  onRestore={restoreProject}
                  onDelete={(id) => handleDelete(id, p.name)}
                  onShare={handleShare}
                  onDownload={downloadProject}
                  onViewTechSheet={(proj) => setTechSheetProject(proj)}
                  canArchive={false}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {active && (
        <ProjectGallery
          photos={collectPhotos(active)}
          projectName={active.name}
          onAddPhoto={onPhotoUpload}
          onRemovePhoto={removePhoto}
          onSetCoverPhoto={(url) => setPhoto(url)}
        />
      )}

      <section className="create-project-section" aria-label="Crear nuevo proyecto">
        <h2 className="section-title">Nuevo proyecto</h2>
        <form onSubmit={onCreate} className="create-form">
          <div className="field">
            <label htmlFor={nameId}>Nombre de la labor:</label>
            <input
              id={nameId}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Jersey raglán merino, Bufanda trenzada"
              autoComplete="off"
            />
          </div>
          <div className="field">
            <label htmlFor={notesId}>Notas iniciales (opcional):</label>
            <input
              id={notesId}
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Grosor de lana, agujas, talla..."
            />
          </div>
          <div className="form-actions">
            <BigButton type="submit" variant="primary">
              Crear proyecto
            </BigButton>
          </div>
        </form>
      </section>

      <section className="backup-section" aria-label="Copias de seguridad">
        <h2 className="section-title">Respaldo y almacenamiento</h2>
        <p className="backup-desc">
          Tus datos se guardan solo en este navegador ({formatBytes(storage.usedBytes)} usados, {Math.round((storage.usedBytes / storage.quotaBytes) * 100)}% aprox. de la cuota).
          Exporta una copia para llevarte tus labores a otro dispositivo o no perderlas si limpias el historial.
        </p>

        <div className="backup-actions">
          <BigButton type="button" variant="secondary" onClick={onExport}>
            📥 Exportar respaldo JSON
          </BigButton>

          <label htmlFor={importId} className="big-button big-button--ghost file-label">
            📤 Importar respaldo
            <input
              id={importId}
              ref={importRef}
              type="file"
              accept=".json,application/json"
              className="sr-only"
              onChange={(e) => onImport(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        <div className="import-mode-selector">
          <span>Modo al importar:</span>
          <label className="radio-label">
            <input
              type="radio"
              name="importMode"
              value="merge"
              checked={importMode === 'merge'}
              onChange={() => setImportMode('merge')}
            />
            Combinar con los actuales
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="importMode"
              value="replace"
              checked={importMode === 'replace'}
              onChange={() => setImportMode('replace')}
            />
            Reemplazar todo
          </label>
        </div>
      </section>

      {editingProject && (
        <ProjectEditModal
          initialName={editingProject.name}
          initialNotes={editingProject.notes}
          onSave={saveEdit}
          onCancel={() => setEditingId(null)}
        />
      )}

      <ProjectTechSheetModal
        project={techSheetProject}
        isOpen={Boolean(techSheetProject)}
        onClose={() => setTechSheetProject(null)}
      />
    </div>
  )
}
