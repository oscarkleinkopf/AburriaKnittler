export type AnalyzeResult = {
  estimatedStitches: number | null
  estimatedRows: number | null
  stitchType: string
  patternStructure: string
  confidence: string
  notes: string
}

export const ANALYZE_PROMPT = `Eres un asistente experto en tejido a mano (punto y crochet).
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

export function extractJson(text: string): unknown {
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

export function normalizeAnalyzeResult(
  parsed: Record<string, unknown>,
): AnalyzeResult {
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

export const ALLOWED_ANALYZE_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
])

/** Base64 chars (~3.5 MB) so the JSON stays under Netlify’s 6 MB buffered limit. */
export const MAX_ANALYZE_BASE64_CHARS = 3_500_000

export function coerceAnalyzeMime(mimeType: string): string {
  const raw = mimeType.trim().toLowerCase() || 'image/jpeg'
  if (raw === 'image/jpg') return 'image/jpeg'
  return raw
}
