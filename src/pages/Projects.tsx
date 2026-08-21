import { useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Banner } from '../components/Banner'
import { BigButton } from '../components/BigButton'
import { DataCareBanners } from '../components/DataCareBanners'
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
  formatGauge,
  formatRelativeDate,
  getLastSaveResult,
  MAX_PHOTOS,
  openProjects,
  archivedProjects,
  PROJECT_FILTERS,
  projectMatchesFilter,
  projectMatchesQuery,
  readBackupFile,
  shareProject,
  sortProjectsByRecent,
  type ImportMode,
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
  const [editName, setEditName] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [importMode, setImportMode] = useState<ImportMode>('merge')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ProjectFilter>('all')
  const searchId = useId()
  const save = getLastSaveResult()
  const storage = buildStorageReport(
    state,
    !save.ok && save.reason === 'quota',
  )
  const openCount = openProjects(state.projects).length
  const visibleOpen = useMemo(() => {
    return sortProjectsByRecent(openProjects(state.projects)).filter(
      (p) => projectMatchesQuery(p, query) && projectMatchesFilter(p, filter),
    )
  }, [state.projects, query, filter])
  const visibleArchived = useMemo(() => {
    return sortProjectsByRecent(archivedProjects(state.projects)).filter(
      (p) => projectMatchesQuery(p, query) && projectMatchesFilter(p, filter),
    )
  }, [state.projects, query, filter])
  const archivedCount = archivedProjects(state.projects).length
  const activePhotos = active ? collectPhotos(active) : []

  function onCreate(e: FormEvent) {
    e.preventDefault()
    const project = addProject(name, notes)
    setName('')
    setNotes('')
    setError(null)
    setMessage(`Proyecto «${project.name}» listo.`)
  }

  function startEdit(id: string) {
    const p = state.projects.find((x) => x.id === id)
    if (!p) return
    setEditingId(id)
    setEditName(p.name)
    setEditNotes(p.notes)
  }

  function saveEdit(e: FormEvent) {
    e.preventDefault()
    if (!editingId) return
    updateProject(editingId, {
      name: editName.trim() || 'Sin nombre',
      notes: editNotes.trim(),
    })
    setEditingId(null)
    setError(null)
    setMessage('Proyecto actualizado.')
  }

  async function onPhoto(file: File | null) {
    if (!file || !active) return
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
        `Respaldo descargado (${state.projects.length} proyecto${state.projects.length === 1 ? '' : 's'}).`,
      )
    } catch {
      setMessage(null)
      setError('No se pudo crear el archivo de respaldo.')
    }
  }

  function onDuplicate(projectId: string) {
    const copy = duplicateProject(projectId)
    if (!copy) return
    const save = getLastSaveResult()
    setEditingId(null)
    if (!save.ok) {
      setMessage(null)
      setError(
        save.reason === 'quota'
          ? `«${copy.name}» se creó, pero no cupo en el aparato. Quita una foto.`
          : `Copia «${copy.name}» lista, pero no se pudo guardar.`,
      )
      return
    }
    setError(null)
    setMessage(
      `Copia «${copy.name}» lista. El contador empieza en 0; el patrón se conserva.`,
    )
  }

  function onArchive(projectId: string, name: string) {
    archiveProject(projectId)
    setEditingId(null)
    setError(null)
    setMessage(`«${name}» archivado. Puedes restaurarlo más abajo.`)
  }

  function onRestore(projectId: string, name: string) {
    restoreProject(projectId)
    setError(null)
    setMessage(`«${name}» restaurado. Ya es el proyecto activo.`)
  }

  async function onShareProject(projectId: string) {
    const project = state.projects.find((p) => p.id === projectId)
    if (!project) return
    try {
      const mode = await shareProject(project)
      setError(null)
      setMessage(
        mode === 'shared'
          ? `«${project.name}» listo para compartir.`
          : `Descargado «${project.name}» (.json).`,
      )
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setMessage(null)
      setError('No se pudo compartir el proyecto.')
    }
  }

  async function onImportFile(file: File | null) {
    if (!file) return
    setError(null)
    try {
      if (importMode === 'replace') {
        const ok = window.confirm(
          'Esto reemplazará TODOS los proyectos de este dispositivo por el contenido del archivo. ¿Continuar?',
        )
        if (!ok) return
      }
      const text = await readBackupFile(file)
      const result = importBackup(text, importMode)
      setMessage(
        importMode === 'replace'
          ? `Respaldo restaurado: ${result.total} proyecto${result.total === 1 ? '' : 's'}.`
          : `Importado: ${result.added} nuevo${result.added === 1 ? '' : 's'}, ${result.updated} actualizado${result.updated === 1 ? '' : 's'} (${result.total} en total).`,
      )
    } catch (err) {
      setMessage(null)
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo importar el respaldo.',
      )
    } finally {
      if (importRef.current) importRef.current.value = ''
    }
  }

  return (
    <section className="stack animate-enter" aria-labelledby="projects-title">
      <div>
        <h1 id="projects-title" className="page-title">
          Proyectos
        </h1>
        <p className="page-lead">
          Cada proyecto guarda su contador, notas, fotos y último análisis en
          este dispositivo. Puedes exportar un JSON para cambiar de móvil.
        </p>
      </div>

      {message && <Banner tone="info">{message}</Banner>}
      {error && (
        <Banner tone="error" role="alert">
          {error}
        </Banner>
      )}

      <DataCareBanners
        state={state}
        onExported={() =>
          setMessage(
            `Respaldo descargado (${state.projects.length} proyecto${state.projects.length === 1 ? '' : 's'}).`,
          )
        }
      />

      <div className="backup-panel stack">
        <h2 className="section-title">Respaldo</h2>
        <p className="muted">
          Descarga un archivo JSON con todos tus proyectos, o restaura uno
          guardado antes. Este aparato usa {formatBytes(storage.usedBytes)} de
          unos {formatBytes(storage.quotaBytes)}
          {storage.photoCount > 0
            ? `; las fotos ocupan ${formatBytes(storage.photoBytes)}`
            : ''}
          .
        </p>
        <BigButton type="button" variant="secondary" block onClick={onExport}>
          Exportar proyectos (.json)
        </BigButton>
        <fieldset className="backup-modes">
          <legend className="sr-only">Modo de importación</legend>
          <label className="backup-mode">
            <input
              type="radio"
              name="import-mode"
              checked={importMode === 'merge'}
              onChange={() => setImportMode('merge')}
            />
            Combinar con lo que ya tengo
          </label>
          <label className="backup-mode">
            <input
              type="radio"
              name="import-mode"
              checked={importMode === 'replace'}
              onChange={() => setImportMode('replace')}
            />
            Reemplazar todo
          </label>
        </fieldset>
        <input
          id={importId}
          ref={importRef}
          className="file-pick__input"
          type="file"
          accept="application/json,.json,text/json,text/plain"
          onChange={(e) => void onImportFile(e.target.files?.[0] ?? null)}
        />
        <BigButton
          type="button"
          variant="ghost"
          block
          onClick={() => importRef.current?.click()}
        >
          Importar desde archivo
        </BigButton>
      </div>

      {active && (
        <div className="project-active">
          <p className="project-active__label">Activo ahora</p>
          <p className="project-active__name">{active.name}</p>
          <p className="project-active__meta">
            Vuelta {active.rows} · Punto {active.stitches}
          </p>
          {formatGauge(active) ? (
            <p className="muted">{formatGauge(active)}</p>
          ) : null}
          <div className="project-active__actions">
            <BigButton to="/contador" variant="primary">
              Abrir contador
            </BigButton>
            <BigButton
              type="button"
              variant="secondary"
              onClick={() => void onShareProject(active.id)}
            >
              Compartir
            </BigButton>
            <BigButton
              type="button"
              variant="ghost"
              onClick={() => onDuplicate(active.id)}
            >
              Duplicar
            </BigButton>
          </div>
          <div className="photo-gallery">
            <p className="photo-gallery__label" id="active-photos-label">
              Fotos ({activePhotos.length}/{MAX_PHOTOS})
            </p>
            {activePhotos.length > 0 ? (
              <ul className="photo-gallery__list" aria-labelledby="active-photos-label">
                {activePhotos.map((url, index) => (
                  <li key={`${index}-${url.length}`} className="photo-gallery__item">
                    <img
                      className="photo-gallery__img"
                      src={url}
                      alt={
                        index === 0
                          ? `Portada de ${active.name}`
                          : `Foto ${index + 1} de ${active.name}`
                      }
                    />
                    <BigButton
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        removePhoto(url)
                        setError(null)
                        setMessage(
                          index === 0
                            ? 'Portada quitada.'
                            : 'Foto quitada del proyecto.',
                        )
                      }}
                    >
                      Quitar
                    </BigButton>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Aún no hay fotos de referencia.</p>
            )}
            <div className="row-actions">
              {activePhotos.length < MAX_PHOTOS ? (
                <label className="file-button">
                  <input
                    type="file"
                    accept="image/*"
                    className="file-pick__input"
                    onChange={(e) => void onPhoto(e.target.files?.[0] ?? null)}
                  />
                  <span className="big-button big-button--ghost">
                    Añadir imagen
                  </span>
                </label>
              ) : (
                <p className="muted">Como mucho {MAX_PHOTOS} fotos. Quita una para añadir otra.</p>
              )}
              {activePhotos.length > 1 && (
                <BigButton
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setPhoto(null)
                    setError(null)
                    setMessage('Fotos quitadas del proyecto.')
                  }}
                >
                  Quitar todas
                </BigButton>
              )}
            </div>
          </div>
        </div>
      )}

      <form className="project-form stack" onSubmit={onCreate}>
        <h2 className="section-title">Nuevo proyecto</h2>
        <div className="field">
          <label htmlFor={nameId}>Nombre</label>
          <input
            id={nameId}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Bufanda de invierno"
            required
            autoComplete="off"
          />
        </div>
        <div className="field">
          <label htmlFor={notesId}>Notas (opcional)</label>
          <textarea
            id={notesId}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Hilo, agujas, patrón…"
          />
        </div>
        <BigButton type="submit" variant="secondary" block>
          Crear proyecto
        </BigButton>
      </form>

      <div className="stack">
        <h2 className="section-title">Tus proyectos</h2>
        <div className="field">
          <label htmlFor={searchId}>Buscar por nombre</label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nombre, lana, agujas…"
            autoComplete="off"
          />
        </div>
        <fieldset className="project-filters">
          <legend className="project-filters__legend">Mostrar</legend>
          <div className="project-filters__row">
            {PROJECT_FILTERS.map((f) => (
              <BigButton
                key={f.id}
                type="button"
                variant={filter === f.id ? 'primary' : 'ghost'}
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </BigButton>
            ))}
          </div>
        </fieldset>
        {visibleOpen.length === 0 ? (
          <p className="muted">
            {query.trim() || filter !== 'all'
              ? 'Ningún proyecto coincide con la búsqueda o el filtro.'
              : 'Aún no hay proyectos activos.'}
          </p>
        ) : (
          <div className="project-list" role="list">
            {visibleOpen.map((p) => {
              const isActive = p.id === state.activeId
              const isEditing = editingId === p.id
              return (
                <article
                  key={p.id}
                  className={`project-card${isActive ? ' project-card--active' : ''}`}
                  role="listitem"
                >
                  {isEditing ? (
                    <form className="stack" onSubmit={saveEdit}>
                      <div className="field">
                        <label htmlFor={`edit-name-${p.id}`}>Nombre</label>
                        <input
                          id={`edit-name-${p.id}`}
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="field">
                        <label htmlFor={`edit-notes-${p.id}`}>Notas</label>
                        <textarea
                          id={`edit-notes-${p.id}`}
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          rows={2}
                        />
                      </div>
                      <div className="row-actions">
                        <BigButton type="submit" variant="primary">
                          Guardar
                        </BigButton>
                        <BigButton
                          type="button"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                        >
                          Cancelar
                        </BigButton>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="project-card__head">
                        {p.photoDataUrl ? (
                          <img
                            className="project-card__thumb"
                            src={p.photoDataUrl}
                            alt=""
                          />
                        ) : (
                          <div className="project-card__thumb project-card__thumb--empty" />
                        )}
                        <div>
                          <h3 className="project-card__title">{p.name}</h3>
                          <p className="project-card__meta">
                            Vuelta {p.rows} · Punto {p.stitches} ·{' '}
                            {formatRelativeDate(p.updatedAt)}
                          </p>
                          {p.notes && (
                            <p className="project-card__notes">{p.notes}</p>
                          )}
                          {formatGauge(p) ? (
                            <p className="project-card__notes muted">
                              {formatGauge(p)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="row-actions">
                        {!isActive && (
                          <BigButton
                            type="button"
                            variant="primary"
                            onClick={() => {
                              setActive(p.id)
                              setError(null)
                              setMessage(`Ahora trabajas en «${p.name}».`)
                            }}
                          >
                            Usar
                          </BigButton>
                        )}
                        {isActive && (
                          <Link className="chip chip--active" to="/contador">
                            Activo
                          </Link>
                        )}
                        <BigButton
                          type="button"
                          variant="ghost"
                          onClick={() => startEdit(p.id)}
                        >
                          Editar
                        </BigButton>
                        <BigButton
                          type="button"
                          variant="ghost"
                          onClick={() => void onShareProject(p.id)}
                        >
                          Compartir
                        </BigButton>
                        <BigButton
                          type="button"
                          variant="ghost"
                          onClick={() => onDuplicate(p.id)}
                        >
                          Duplicar
                        </BigButton>
                        <BigButton
                          type="button"
                          variant="ghost"
                          disabled={openCount <= 1}
                          onClick={() => {
                            if (
                              window.confirm(
                                `¿Archivar «${p.name}»? No se borra; puedes restaurarlo.`,
                              )
                            ) {
                              onArchive(p.id, p.name)
                            }
                          }}
                        >
                          Archivar
                        </BigButton>
                      </div>
                    </>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </div>

      {archivedCount > 0 && (
        <div className="stack">
          <h2 className="section-title">
            Archivados ({archivedCount})
          </h2>
          <p className="muted">
            Guardados por si te arrepientes. Restaurarlos los vuelve a poner
            activos.
          </p>
          {visibleArchived.length === 0 ? (
            <p className="muted">
              Ningún archivado coincide con la búsqueda o el filtro.
            </p>
          ) : (
            <div className="project-list" role="list">
              {visibleArchived.map((p) => (
                <article
                  key={p.id}
                  className="project-card project-card--archived"
                  role="listitem"
                >
                  <div className="project-card__head">
                    {p.photoDataUrl ? (
                      <img
                        className="project-card__thumb"
                        src={p.photoDataUrl}
                        alt=""
                      />
                    ) : (
                      <div className="project-card__thumb project-card__thumb--empty" />
                    )}
                    <div>
                      <h3 className="project-card__title">{p.name}</h3>
                      <p className="project-card__meta">
                        Archivado {formatRelativeDate(p.archivedAt ?? p.updatedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="row-actions">
                    <BigButton
                      type="button"
                      variant="secondary"
                      onClick={() => onRestore(p.id, p.name)}
                    >
                      Restaurar
                    </BigButton>
                    <BigButton
                      type="button"
                      variant="danger"
                      disabled={state.projects.length <= 1}
                      onClick={() => {
                        if (
                          window.confirm(
                            `¿Borrar «${p.name}» del todo? No se puede deshacer.`,
                          )
                        ) {
                          deleteProject(p.id)
                          setError(null)
                          setMessage('Proyecto borrado.')
                        }
                      }}
                    >
                      Borrar
                    </BigButton>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
