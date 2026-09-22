import { openProjects, archivedProjects, type Project } from '../../lib/projects'

type ProjectStatsSummaryProps = {
  projects: Project[]
}

export function ProjectStatsSummary({ projects }: ProjectStatsSummaryProps) {
  const openList = openProjects(projects)
  const archivedList = archivedProjects(projects)
  const totalRows = projects.reduce((acc, p) => acc + p.rows, 0)
  const inProgressCount = openList.filter((p) => p.rows > 0 || p.stitches > 0).length

  return (
    <div className="project-stats" aria-label="Estadísticas de proyectos">
      <div className="project-stats__item">
        <span className="project-stats__num">{openList.length}</span>
        <span className="project-stats__label">
          {openList.length === 1 ? 'proyecto activo' : 'proyectos activos'}
        </span>
      </div>
      <div className="project-stats__item">
        <span className="project-stats__num">{inProgressCount}</span>
        <span className="project-stats__label">en curso</span>
      </div>
      <div className="project-stats__item">
        <span className="project-stats__num">{totalRows}</span>
        <span className="project-stats__label">
          {totalRows === 1 ? 'vuelta tejida' : 'vueltas tejidas'}
        </span>
      </div>
      {archivedList.length > 0 && (
        <div className="project-stats__item project-stats__item--muted">
          <span className="project-stats__num">{archivedList.length}</span>
          <span className="project-stats__label">archivados</span>
        </div>
      )}
    </div>
  )
}
