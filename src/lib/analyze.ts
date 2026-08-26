import {
  ALLOWED_ANALYZE_MIME,
  ANALYZE_PROMPT,
  coerceAnalyzeMime,
  extractJson,
  MAX_ANALYZE_BASE64_CHARS,
  normalizeAnalyzeResult,
  type AnalyzeResult,
} from './analyzeShared'

export type { AnalyzeResult } from './analyzeShared'

async function fileToBase64(
  file: File,
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result ?? '')
      const comma = result.indexOf(',')
      const base64 = comma >= 0 ? result.slice(comma + 1) : result
      resolve({
        base64,
        mimeType: coerceAnalyzeMime(file.type || 'image/jpeg'),
      })
    }
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'))
    reader.readAsDataURL(file)
  })
}

const SKIP_COMPRESS_BYTES = 400_000

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    const timer = window.setTimeout(() => {
      URL.revokeObjectURL(url)
      reject(new Error('La foto tardó demasiado en cargarse.'))
    }, 4000)
    img.onload = () => {
      window.clearTimeout(timer)
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      window.clearTimeout(timer)
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la imagen'))
    }
    img.src = url
  })
}

function canvasToJpeg(
  img: HTMLImageElement,
  maxSide: number,
  quality: number,
): string {
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo preparar la imagen')
  ctx.drawImage(img, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', quality)
}

async function compressForVision(
  file: File,
): Promise<{ mimeType: string; data: string }> {
  const img = await loadImage(file)
  const attempts: Array<{ maxSide: number; quality: number }> = [
    { maxSide: 1280, quality: 0.82 },
    { maxSide: 960, quality: 0.7 },
    { maxSide: 720, quality: 0.58 },
  ]
  let data = ''
  for (const attempt of attempts) {
    const dataUrl = canvasToJpeg(img, attempt.maxSide, attempt.quality)
    const comma = dataUrl.indexOf(',')
    data = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
    if (data.length <= MAX_ANALYZE_BASE64_CHARS) {
      return { mimeType: 'image/jpeg', data }
    }
  }
  throw new Error(
    'La foto es demasiado grande. Recórtala o elige una más liviana.',
  )
}

async function imageToVisionPayload(
  file: File,
): Promise<{ mimeType: string; data: string }> {
  const mime = coerceAnalyzeMime(file.type || 'image/jpeg')
  if (!ALLOWED_ANALYZE_MIME.has(mime)) {
    throw new Error('Elige una foto (JPG, PNG o similar).')
  }
  if (file.size <= SKIP_COMPRESS_BYTES) {
    const { base64, mimeType } = await fileToBase64(file)
    if (base64.length > MAX_ANALYZE_BASE64_CHARS) {
      throw new Error(
        'La foto es demasiado grande. Recórtala o elige una más liviana.',
      )
    }
    return { mimeType, data: base64 }
  }
  try {
    return await compressForVision(file)
  } catch (err) {
    if (
      err instanceof Error &&
      /demasiado grande/i.test(err.message)
    ) {
      throw err
    }
    const { base64, mimeType } = await fileToBase64(file)
    if (base64.length > MAX_ANALYZE_BASE64_CHARS) {
      throw new Error(
        'La foto es demasiado grande. Recórtala o elige una más liviana.',
      )
    }
    return { mimeType, data: base64 }
  }
}

/** Estimación local cuando no hay clave de Gemini (GitHub Pages sin secretos). */
async function demoAnalyze(file: File): Promise<AnalyzeResult> {
  const bitmap = await createImageBitmap(file)
  const w = bitmap.width
  const h = bitmap.height
  bitmap.close()

  // Heurística muy grosera: asume ~4–8 px por punto según resolución
  const pxPerStitch = Math.max(4, Math.round(Math.min(w, h) / 80))
  const stitches = Math.round(w / pxPerStitch)
  const rows = Math.round(h / pxPerStitch)

  return {
    estimatedStitches: Math.min(Math.max(stitches, 20), 400),
    estimatedRows: Math.min(Math.max(rows, 20), 600),
    stitchType: 'Punto jersey (estimación local)',
    patternStructure:
      'Modo demo: conteo aproximado según el tamaño de la foto. Para un análisis visual real, configura VITE_GEMINI_API_KEY.',
    confidence: 'baja',
    notes:
      'Sin clave de Gemini: resultado orientativo generado en el dispositivo. No sustituye un recuento manual.',
  }
}

async function geminiAnalyze(
  file: File,
  apiKey: string,
): Promise<AnalyzeResult> {
  const { mimeType, data } = await imageToVisionPayload(file)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: ANALYZE_PROMPT },
            { inline_data: { mime_type: mimeType, data } },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    }),
  })

  const payload = (await res.json().catch(() => ({}))) as {
    error?: { message?: string }
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> }
    }>
  }

  if (!res.ok) {
    throw new Error(
      payload.error?.message ||
        'No se pudo contactar con Gemini. Revisa la clave API.',
    )
  }

  const text = payload.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? '')
    .join('')
    .trim()

  if (!text) {
    throw new Error('Gemini no devolvió una respuesta usable.')
  }

  return normalizeAnalyzeResult(extractJson(text) as Record<string, unknown>)
}

export const GEMINI_KEY_STORAGE = 'aburriaknittler.geminiKey'

export function bundledGeminiKey(): string {
  return import.meta.env.VITE_GEMINI_API_KEY?.trim() ?? ''
}

export function analyzeApiPath(): string {
  return import.meta.env.VITE_ANALYZE_API?.trim() ?? ''
}

export function hasServerVision(): boolean {
  return Boolean(analyzeApiPath())
}

export function loadGeminiKey(): string {
  try {
    return localStorage.getItem(GEMINI_KEY_STORAGE)?.trim() ?? ''
  } catch {
    return ''
  }
}

export function saveGeminiKey(key: string): void {
  const text = key.trim()
  try {
    if (!text) localStorage.removeItem(GEMINI_KEY_STORAGE)
    else localStorage.setItem(GEMINI_KEY_STORAGE, text)
  } catch {
    // ignore quota / private mode
  }
}

export function maskGeminiKey(key: string): string {
  const text = key.trim()
  if (!text) return ''
  if (text.length <= 4) return '••••'
  return `••••${text.slice(-4)}`
}

export function resolveGeminiKey(): string {
  return loadGeminiKey() || bundledGeminiKey()
}

export function hasGeminiKey(): boolean {
  return Boolean(resolveGeminiKey())
}

export function hasVision(): boolean {
  return hasServerVision() || hasGeminiKey()
}

/** Sin clave, la foto no «ve» el tejido: solo usa el tamaño del archivo. */
export const LOCAL_ANALYSIS_NOTICE =
  'Sin modelo de IA, la foto solo estima por el tamaño de la imagen: es poco preciso. Es más fiable escribir el conteo a mano, o pegar una clave de Gemini (se queda en este aparato).'

export function isLocalAnalysis(result: AnalyzeResult | null): boolean {
  if (!result) return false
  return (
    result.confidence === 'baja' &&
    /estimación local/i.test(result.stitchType)
  )
}

export async function analyzeViaServer(
  file: File,
  apiPath = analyzeApiPath(),
): Promise<AnalyzeResult> {
  if (!apiPath) {
    throw new Error('No hay API de análisis configurada.')
  }
  const payload = await imageToVisionPayload(file)
  const res = await fetch(apiPath, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & {
    error?: string
  }
  if (!res.ok) {
    throw new Error(
      typeof data.error === 'string' && data.error
        ? data.error
        : 'No se pudo analizar la foto en el servidor.',
    )
  }
  return normalizeAnalyzeResult(data)
}

export async function analyzeGarmentPhoto(file: File): Promise<AnalyzeResult> {
  if (hasServerVision()) {
    try {
      return await analyzeViaServer(file)
    } catch (err) {
      const apiKey = resolveGeminiKey()
      if (apiKey) return geminiAnalyze(file, apiKey)
      throw err
    }
  }
  const apiKey = resolveGeminiKey()
  if (apiKey) {
    return geminiAnalyze(file, apiKey)
  }
  return demoAnalyze(file)
}
