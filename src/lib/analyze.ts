export type AnalyzeResult = {
  estimatedStitches: number | null
  estimatedRows: number | null
  stitchType: string
  patternStructure: string
  confidence: string
  notes: string
}

const PROMPT = `Eres un asistente experto en tejido a mano (punto y crochet).
Analiza la foto de una prenda o muestra de tejido y estima, de forma orientativa:
- cantidad aproximada de puntos (stitches) visibles o por fila típica de la prenda
- cantidad aproximada de filas (rows)
- tipo de puntada más probable (p. ej. punto jersey, musgo, elástico 1x1, crochet alto, etc.)
- estructura breve del patrón (cómo se organiza el tejido)

Responde SOLO con JSON válido (sin markdown) con estas claves:
{
  "estimatedStitches": number | null,
  "estimatedRows": number | null,
  "stitchType": string,
  "patternStructure": string,
  "confidence": string,
  "notes": string
}

"confidence" debe ser "baja", "media" o "alta".
Si la imagen no es un tejido claro, pon nulls donde no puedas estimar y explícalo en notes.
Sé honesto: son estimaciones, no medidas exactas. Responde en español.`

function extractJson(text: string): unknown {
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1))
    }
    throw new Error('Respuesta no válida del modelo')
  }
}

function normalize(parsed: Record<string, unknown>): AnalyzeResult {
  return {
    estimatedStitches:
      typeof parsed.estimatedStitches === 'number'
        ? parsed.estimatedStitches
        : null,
    estimatedRows:
      typeof parsed.estimatedRows === 'number' ? parsed.estimatedRows : null,
    stitchType:
      typeof parsed.stitchType === 'string'
        ? parsed.stitchType
        : 'No determinado',
    patternStructure:
      typeof parsed.patternStructure === 'string'
        ? parsed.patternStructure
        : 'No determinado',
    confidence:
      typeof parsed.confidence === 'string' ? parsed.confidence : 'baja',
    notes: typeof parsed.notes === 'string' ? parsed.notes : '',
  }
}

async function fileToBase64(
  file: File,
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result ?? '')
      const comma = result.indexOf(',')
      const base64 = comma >= 0 ? result.slice(comma + 1) : result
      resolve({ base64, mimeType: file.type || 'image/jpeg' })
    }
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'))
    reader.readAsDataURL(file)
  })
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
  const { base64, mimeType } = await fileToBase64(file)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: PROMPT },
            { inline_data: { mime_type: mimeType, data: base64 } },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    }),
  })

  const data = (await res.json().catch(() => ({}))) as {
    error?: { message?: string }
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> }
    }>
  }

  if (!res.ok) {
    throw new Error(
      data.error?.message ||
        'No se pudo contactar con Gemini. Revisa la clave API.',
    )
  }

  const text = data.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? '')
    .join('')
    .trim()

  if (!text) {
    throw new Error('Gemini no devolvió una respuesta usable.')
  }

  return normalize(extractJson(text) as Record<string, unknown>)
}

export function hasGeminiKey(): boolean {
  return Boolean(import.meta.env.VITE_GEMINI_API_KEY?.trim())
}

/** Sin clave, la foto no «ve» el tejido: solo usa el tamaño del archivo. */
export const LOCAL_ANALYSIS_NOTICE =
  'Sin modelo de IA, la foto solo estima por el tamaño de la imagen: es poco preciso. Es más fiable escribir el conteo a mano.'

export function isLocalAnalysis(result: AnalyzeResult | null): boolean {
  if (!result) return false
  return (
    result.confidence === 'baja' &&
    /estimación local/i.test(result.stitchType)
  )
}

export async function analyzeGarmentPhoto(file: File): Promise<AnalyzeResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim()
  if (apiKey) {
    return geminiAnalyze(file, apiKey)
  }
  return demoAnalyze(file)
}
