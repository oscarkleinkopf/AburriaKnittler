import { useId, useRef, type ChangeEvent } from 'react'
import { MAX_PHOTOS } from '../../lib/projects'

type ProjectGalleryProps = {
  photos: string[]
  projectName: string
  onAddPhoto: (file: File) => void
  onRemovePhoto: (url: string) => void
  onSetCoverPhoto: (url: string) => void
}

export function ProjectGallery({
  photos,
  projectName,
  onAddPhoto,
  onRemovePhoto,
  onSetCoverPhoto,
}: ProjectGalleryProps) {
  const inputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      onAddPhoto(file)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const canAddMore = photos.length < MAX_PHOTOS

  return (
    <section className="project-gallery" aria-label="Fotos del proyecto">
      <div className="project-gallery__header">
        <h3 className="project-gallery__title">
          Fotos del proyecto ({photos.length}/{MAX_PHOTOS})
        </h3>
        {canAddMore && (
          <label htmlFor={inputId} className="project-gallery__add-btn">
            + Añadir foto
            <input
              id={inputId}
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleFileChange}
            />
          </label>
        )}
      </div>

      {photos.length > 0 ? (
        <div className="project-gallery__grid">
          {photos.map((url, idx) => (
            <div key={url} className="gallery-card">
              <img
                src={url}
                alt={`Foto ${idx + 1} de ${projectName}`}
                className="gallery-card__img"
              />
              <div className="gallery-card__overlay">
                {idx === 0 ? (
                  <span className="gallery-card__cover-badge">Portada</span>
                ) : (
                  <button
                    type="button"
                    className="gallery-card__cover-btn"
                    onClick={() => onSetCoverPhoto(url)}
                  >
                    Hacer portada
                  </button>
                )}
                <button
                  type="button"
                  className="gallery-card__del-btn"
                  onClick={() => onRemovePhoto(url)}
                  aria-label={`Eliminar foto ${idx + 1}`}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="project-gallery__empty">
          No hay fotos guardadas en este proyecto. Puedes añadir hasta {MAX_PHOTOS} fotos de referencia o progreso.
        </p>
      )}
    </section>
  )
}
