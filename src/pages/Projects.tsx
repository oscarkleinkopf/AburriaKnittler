import { useId, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Banner } from '../components/Banner'
import { BigButton } from '../components/BigButton'
import { useProjects } from '../lib/ProjectsContext'
import {
  compressImageFile,
  formatRelativeDate,
} from '../lib/projects'

export function ProjectsPage() {
  const {
    state,
    active,
    setActive,
    addProject,
    updateProject,
    deleteProject,
    setPhoto,
  } = useProjects()
  const nameId = useId()
  const notesId = useId()
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  function onCreate(e: FormEvent) {
    e.preventDefault()
    const project = addProject(name, notes)
    setName('')
    setNotes('')
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
    setMessage('Proyecto actualizado.')
  }

  async function onPhoto(file: File | null) {
    if (!file || !active) return
    try {
      const dataUrl = await compressImageFile(file)
      setPhoto(dataUrl)
      setMessage('Foto guardada en el proyecto.')
    } catch {
      setMessage('No se pudo guardar la foto.')
    }
  }

  return (
    <section className="stack animate-enter" aria-labelledby="projects-title">
      <div>
        <h1 id="projects-title" className="page-title">
          Proyectos
        </h1>
        <p className="page-lead">
          Cada proyecto guarda su contador, notas, foto y último análisis en
          este dispositivo.
        </p>
      </div>

      {message && <Banner tone="info">{message}</Banner>}

      {active && (
        <div className="project-active">
          <p className="project-active__label">Activo ahora</p>
          <p className="project-active__name">{active.name}</p>
          <p className="project-active__meta">
            Vuelta {active.rows} · Punto {active.stitches}
          </p>
          <div className="project-active__actions">
            <BigButton to="/contador" variant="primary">
              Abrir contador
            </BigButton>
            <label className="file-button">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="file-pick__input"
                onChange={(e) => onPhoto(e.target.files?.[0] ?? null)}
              />
              <span className="big-button big-button--secondary">
                {active.photoDataUrl ? 'Cambiar foto' : 'Añadir foto'}
              </span>
            </label>
          </div>
          {active.photoDataUrl && (
            <img
              className="file-pick__preview"
              src={active.photoDataUrl}
              alt={`Foto de ${active.name}`}
            />
          )}
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

      <div className="project-list" role="list">
        <h2 className="section-title">Tus proyectos</h2>
        {state.projects.map((p) => {
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
                    </div>
                  </div>
                  <div className="row-actions">
                    {!isActive && (
                      <BigButton
                        type="button"
                        variant="primary"
                        onClick={() => {
                          setActive(p.id)
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
                      variant="danger"
                      disabled={state.projects.length <= 1}
                      onClick={() => {
                        if (
                          window.confirm(
                            `¿Borrar «${p.name}»? No se puede deshacer.`,
                          )
                        ) {
                          deleteProject(p.id)
                          setMessage('Proyecto borrado.')
                        }
                      }}
                    >
                      Borrar
                    </BigButton>
                  </div>
                </>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
