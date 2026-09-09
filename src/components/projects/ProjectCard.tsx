import { Link } from 'react-router-dom'
import { BigButton } from '../BigButton'
import {
  collectPhotos,
  formatGauge,
  formatRelativeDate,
  type Project,
} from '../../lib/projects'

type ProjectCardProps = {
  project: Project
  isActive: boolean
  onSelect: (id: string) => void
  onEdit: (id: string) => void
  onDuplicate: (id: string) => void
  onArchive?: (id: string) => void
  onRestore?: (id: string) => void
  onDelete: (id: string) => void
  onShare: (project: Project) => void
  onDownload: (project: Project) => void
  onViewTechSheet?: (project: Project) => void
  canArchive: boolean
}

export function ProjectCard({
  project,
  isActive,
  onSelect,
  onEdit,
  onDuplicate,
  onArchive,
  onRestore,
  onDelete,
  onShare,
  onDownload,
  onViewTechSheet,
  canArchive,
}: ProjectCardProps) {
  const photos = collectPhotos(project)
  const cover = photos[0] ?? null
  const gaugeText = formatGauge(project)

  return (
    <article
      className={`project-card ${isActive ? 'project-card--active' : ''} ${
        project.archivedAt ? 'project-card--archived' : ''
      }`}
    >
      <div className="project-card__top">
        {cover && (
          <img
            src={cover}
            alt={`Portada de ${project.name}`}
            className="project-card__cover"
          />
        )}
        <div className="project-card__main-info">
          <div className="project-card__head">
            <h3 className="project-card__title">
              {project.name}
              {isActive && <span className="project-card__active-badge">Activo</span>}
              {project.archivedAt && (
                <span className="project-card__archived-badge">Archivado</span>
              )}
            </h3>
          </div>

          <div className="project-card__meta">
            <span className="project-card__count">
              <strong>{project.rows}</strong> {project.rows === 1 ? 'vuelta' : 'vueltas'}
              {project.stitches > 0 && ` · ${project.stitches} p.`}
            </span>
            {project.patternSteps.length > 0 && (
              <span className="project-card__pattern-tag">
                {project.patternSteps.length} pasos
              </span>
            )}
            {project.targetRows > 0 && (
              <span className="project-card__target-tag">
                Meta: {project.targetRows}
              </span>
            )}
          </div>

          {gaugeText && <p className="project-card__gauge">{gaugeText}</p>}
          {project.notes && <p className="project-card__notes">{project.notes}</p>}
          {project.leaveNote && (
            <p className="project-card__leave-note">
              <em>«{project.leaveNote}»</em>
            </p>
          )}

          <p className="project-card__date">
            Abierto: {formatRelativeDate(project.lastOpenedAt || project.updatedAt)}
          </p>
        </div>
      </div>

      <div className="project-card__actions">
        {!isActive && !project.archivedAt && (
          <BigButton
            type="button"
            variant="primary"
            onClick={() => onSelect(project.id)}
          >
            Abrir
          </BigButton>
        )}

        {isActive && (
          <Link to="/contador" className="big-button big-button--primary">
            Ir al contador
          </Link>
        )}

        <BigButton
          type="button"
          variant="secondary"
          onClick={() => onEdit(project.id)}
          aria-label={`Editar ${project.name}`}
        >
          Editar
        </BigButton>

        <BigButton
          type="button"
          variant="secondary"
          onClick={() => onDuplicate(project.id)}
          aria-label={`Duplicar ${project.name}`}
        >
          Duplicar
        </BigButton>

        {onViewTechSheet && (
          <BigButton
            type="button"
            variant="ghost"
            onClick={() => onViewTechSheet(project)}
            aria-label={`Ver ficha técnica de ${project.name}`}
          >
            📋 Ficha
          </BigButton>
        )}

        <BigButton
          type="button"
          variant="ghost"
          onClick={() => onShare(project)}
          aria-label={`Compartir ${project.name}`}
        >
          Compartir
        </BigButton>

        <BigButton
          type="button"
          variant="ghost"
          onClick={() => onDownload(project)}
          aria-label={`Descargar JSON de ${project.name}`}
        >
          Descargar
        </BigButton>

        {!project.archivedAt && onArchive && (
          <BigButton
            type="button"
            variant="ghost"
            onClick={() => onArchive(project.id)}
            disabled={!canArchive}
            aria-label={`Archivar ${project.name}`}
          >
            Archivar
          </BigButton>
        )}

        {project.archivedAt && onRestore && (
          <BigButton
            type="button"
            variant="primary"
            onClick={() => onRestore(project.id)}
            aria-label={`Restaurar ${project.name}`}
          >
            Restaurar
          </BigButton>
        )}

        <BigButton
          type="button"
          variant="danger"
          onClick={() => onDelete(project.id)}
          aria-label={`Eliminar ${project.name}`}
        >
          Eliminar
        </BigButton>
      </div>
    </article>
  )
}
