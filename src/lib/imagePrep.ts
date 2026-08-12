export type PrepState = {
  /** Original object URL or data URL source */
  sourceUrl: string
  rotation: 0 | 90 | 180 | 270
  /** 0 = full image, 40 = crop to center 60% */
  cropInset: number
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo cargar la imagen'))
    img.src = url
  })
}

export function nextRotation(current: PrepState['rotation']): PrepState['rotation'] {
  return ((current + 90) % 360) as PrepState['rotation']
}

export function prevRotation(current: PrepState['rotation']): PrepState['rotation'] {
  return ((current + 270) % 360) as PrepState['rotation']
}

/** Dibuja la imagen rotada y recortada; devuelve un File JPEG listo para analizar. */
export async function renderPreparedImage(
  prep: PrepState,
  fileName = 'tejido-preparado.jpg',
): Promise<File> {
  const img = await loadImage(prep.sourceUrl)
  const rot = prep.rotation
  const swapped = rot === 90 || rot === 270
  const srcW = img.naturalWidth || img.width
  const srcH = img.naturalHeight || img.height

  // Bounding size after rotation
  const boundW = swapped ? srcH : srcW
  const boundH = swapped ? srcW : srcH

  const inset = Math.min(40, Math.max(0, prep.cropInset)) / 100
  const cropW = Math.max(1, Math.round(boundW * (1 - inset * 2)))
  const cropH = Math.max(1, Math.round(boundH * (1 - inset * 2)))
  const cropX = Math.round((boundW - cropW) / 2)
  const cropY = Math.round((boundH - cropH) / 2)

  // Draw full rotated image onto temp canvas, then crop
  const full = document.createElement('canvas')
  full.width = boundW
  full.height = boundH
  const fctx = full.getContext('2d')
  if (!fctx) throw new Error('No se pudo preparar el lienzo')

  fctx.save()
  fctx.translate(boundW / 2, boundH / 2)
  fctx.rotate((rot * Math.PI) / 180)
  fctx.drawImage(img, -srcW / 2, -srcH / 2, srcW, srcH)
  fctx.restore()

  // Limit output size for upload
  const maxSide = 1280
  const scale = Math.min(1, maxSide / Math.max(cropW, cropH))
  const outW = Math.max(1, Math.round(cropW * scale))
  const outH = Math.max(1, Math.round(cropH * scale))

  const out = document.createElement('canvas')
  out.width = outW
  out.height = outH
  const octx = out.getContext('2d')
  if (!octx) throw new Error('No se pudo recortar la imagen')
  octx.drawImage(full, cropX, cropY, cropW, cropH, 0, 0, outW, outH)

  const blob = await new Promise<Blob>((resolve, reject) => {
    out.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('No se pudo generar la imagen'))),
      'image/jpeg',
      0.88,
    )
  })

  return new File([blob], fileName, { type: 'image/jpeg' })
}
