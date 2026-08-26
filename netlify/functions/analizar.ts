import type { Config } from '@netlify/functions'
import { GoogleGenAI } from '@google/genai'
import {
  ALLOWED_ANALYZE_MIME,
  ANALYZE_PROMPT,
  coerceAnalyzeMime,
  extractJson,
  MAX_ANALYZE_BASE64_CHARS,
  normalizeAnalyzeResult,
} from '../../src/lib/analyzeShared'

type Body = {
  mimeType?: unknown
  data?: unknown
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status })
}

export default async (req: Request) => {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return jsonError('JSON inválido.', 400)
  }

  const mimeType = coerceAnalyzeMime(
    typeof body.mimeType === 'string' ? body.mimeType : 'image/jpeg',
  )
  if (!ALLOWED_ANALYZE_MIME.has(mimeType)) {
    return jsonError('La foto tiene que ser JPG, PNG, WebP o GIF.', 400)
  }

  const data = typeof body.data === 'string' ? body.data.trim() : ''
  if (!data) {
    return jsonError('Falta la imagen.', 400)
  }
  if (data.length > MAX_ANALYZE_BASE64_CHARS) {
    return jsonError(
      'La foto es demasiado grande. Recórtala o elige una más liviana.',
      413,
    )
  }

  const gatewayKey = Netlify.env.get('GEMINI_API_KEY')
  if (!gatewayKey) {
    return jsonError(
      'La IA del servidor aún no está lista. En Netlify: activa AI y publica un deploy de producción.',
      503,
    )
  }

  try {
    const ai = new GoogleGenAI({})
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { text: ANALYZE_PROMPT },
        { inlineData: { mimeType, data } },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    })

    const text = response.text?.trim()
    if (!text) {
      return jsonError('Gemini no devolvió una respuesta usable.', 502)
    }

    const parsed = extractJson(text)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return jsonError('Respuesta no válida del modelo.', 502)
    }

    return Response.json(
      normalizeAnalyzeResult(parsed as Record<string, unknown>),
    )
  } catch (err) {
    const raw = err instanceof Error ? err.message : ''
    const missing = /api key|API_KEY|missing|not found/i.test(raw)
    return jsonError(
      missing
        ? 'La IA del servidor aún no está lista. En Netlify: activa AI y publica un deploy de producción.'
        : raw || 'No se pudo analizar la foto.',
      502,
    )
  }
}

export const config: Config = {
  path: '/api/analizar',
  method: 'POST',
}
