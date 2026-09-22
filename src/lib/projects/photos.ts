import type { AnalyzeResult } from '../analyze'
import { pushHistory } from './counter'
import type { Project } from './types'

export const MAX_PHOTOS = 4

export function collectPhotos(p: {
  photoDataUrl?: string | null
  photos?: string[] | null
}): string[] {
  const fromArray = Array.isArray(p.photos) ? p.photos : []
  const cover =
    typeof p.photoDataUrl === 'string' && p.photoDataUrl ? [p.photoDataUrl] : []
  const seen = new Set<string>()
  const out: string[] = []
  for (const url of [...cover, ...fromArray]) {
    if (!url || seen.has(url)) continue
    seen.add(url)
    out.push(url)
    if (out.length >= MAX_PHOTOS) break
  }
  return out
}

export function addProjectPhoto(
  project: Project,
  dataUrl: string,
): Project {
  const photos = collectPhotos({
    photoDataUrl: project.photoDataUrl,
    photos: [...project.photos, dataUrl],
  })
  return {
    ...project,
    photos,
    photoDataUrl: photos[0] ?? null,
  }
}

export function removeProjectPhoto(
  project: Project,
  dataUrl: string,
): Project {
  const photos = collectPhotos({
    photos: project.photos.filter((url) => url !== dataUrl),
  })
  return {
    ...project,
    photos,
    photoDataUrl: photos[0] ?? null,
  }
}

export function setCoverPhoto(project: Project, dataUrl: string): Project {
  const photos = collectPhotos(project)
  if (!photos.includes(dataUrl)) return project
  const next = [dataUrl, ...photos.filter((url) => url !== dataUrl)]
  return {
    ...project,
    photos: next,
    photoDataUrl: next[0] ?? null,
  }
}

export function analysisHasCounters(result: AnalyzeResult): boolean {
  return result.estimatedRows != null || result.estimatedStitches != null
}

export function applyAnalysisToCounters(
  project: Project,
  analysis: AnalyzeResult,
): Project {
  const rows =
    analysis.estimatedRows == null || Number.isNaN(analysis.estimatedRows)
      ? project.rows
      : Math.max(0, Math.round(analysis.estimatedRows))
  const stitches =
    analysis.estimatedStitches == null ||
    Number.isNaN(analysis.estimatedStitches)
      ? project.stitches
      : Math.max(0, Math.round(analysis.estimatedStitches))
  if (rows === project.rows && stitches === project.stitches) return project
  return pushHistory({ ...project, rows, stitches }, rows, stitches)
}

/** Reduce una imagen para guardarla en localStorage sin llenar la cuota. */
export function compressImageFile(
  file: File,
  maxSide = 720,
  quality = 0.72,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('No se pudo preparar la imagen'))
        return
      }
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la imagen'))
    }
    img.src = url
  })
}
