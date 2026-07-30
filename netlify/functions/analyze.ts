import type { Config, Context } from '@netlify/functions'
import { GoogleGenAI } from '@google/genai'

type AnalyzeBody = {
  imageBase64?: string
  mimeType?: string
}

const PROMPT = `Eres un asistente experto en tejido a mano (punto y crochet).
Analiza la foto de una prenda o muestra de tejido y estima, de forma orientativa:
- cantidad aproximada de puntos (stitches) visibles o por fila típica de la prenda
- cantidad aproximada de filas (rows)
- tipo de puntada más probable (p. ej. punto jersey, musgo, elástico 1x1, crochet alto, etc.)
- estructura breve del patrón (cómo se organiza el tejido)

Responde SOLO con JSON válido (sin markdown) con estas claves en español donde aplique texto:
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
Sé honesto: son estimaciones, no medidas exactas.`

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
    throw new Error('Respuesta no válida')
  }
}

export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Método no permitido' }, { status: 405 })
  }

  let body: AnalyzeBody
  try {
    body = (await req.json()) as AnalyzeBody
  } catch {
    return Response.json(
      { error: 'Cuerpo de la petición inválido' },
      { status: 400 },
    )
  }

  const imageBase64 = body.imageBase64?.trim()
  const mimeType = body.mimeType?.trim() || 'image/jpeg'

  if (!imageBase64) {
    return Response.json(
      { error: 'Falta la imagen para analizar' },
      { status: 400 },
    )
  }

  // Limit roughly ~4MB base64 payload
  if (imageBase64.length > 5_500_000) {
    return Response.json(
      { error: 'La imagen es demasiado grande. Prueba con una foto más ligera.' },
      { status: 413 },
    )
  }

  try {
    const ai = new GoogleGenAI({})
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: PROMPT },
            { inlineData: { mimeType, data: imageBase64 } },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    })

    const text = response.text
    if (!text) {
      return Response.json(
        {
          error:
            'No se obtuvo respuesta del modelo. Comprueba que AI Gateway esté activo en Netlify.',
        },
        { status: 502 },
      )
    }

    const parsed = extractJson(text) as Record<string, unknown>

    return Response.json({
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
    })
  } catch (err) {
    console.error('analyze error', err)
    const message = err instanceof Error ? err.message : ''
    const needsGateway =
      /api key|API_KEY|not found|unauthorized|401|403/i.test(message)
    return Response.json(
      {
        error: needsGateway
          ? 'El análisis de IA no está disponible aún. Despliega el sitio en Netlify y activa AI Gateway.'
          : 'No se pudo analizar la foto. Inténtalo de nuevo en unos momentos.',
      },
      { status: 502 },
    )
  }
}

export const config: Config = {
  path: '/api/analyze',
  method: 'POST',
}
