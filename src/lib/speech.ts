export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function stopSpeaking(): void {
  if (!canSpeak()) return
  window.speechSynthesis.cancel()
}

export function speakText(text: string, lang = 'es-ES'): void {
  if (!canSpeak() || !text.trim()) return
  stopSpeaking()
  const utter = new SpeechSynthesisUtterance(text.trim())
  utter.lang = lang
  utter.rate = 0.95
  // Prefer a Spanish voice when available
  const voices = window.speechSynthesis.getVoices()
  const es =
    voices.find((v) => v.lang.toLowerCase().startsWith('es')) ??
    voices.find((v) => v.lang.toLowerCase().includes('es'))
  if (es) utter.voice = es
  window.speechSynthesis.speak(utter)
}

export function analysisToSpeech(result: {
  estimatedStitches: number | null
  estimatedRows: number | null
  stitchType: string
  patternStructure: string
  confidence: string
  notes: string
}): string {
  const stitches =
    result.estimatedStitches == null
      ? 'puntos no determinados'
      : `${result.estimatedStitches} puntos aproximados`
  const rows =
    result.estimatedRows == null
      ? 'filas no determinadas'
      : `${result.estimatedRows} filas aproximadas`
  const parts = [
    'Resultado del análisis.',
    stitches + '.',
    rows + '.',
    `Tipo de puntada: ${result.stitchType}.`,
    `Estructura: ${result.patternStructure}.`,
    `Confianza: ${result.confidence}.`,
  ]
  if (result.notes.trim()) parts.push(`Notas: ${result.notes}.`)
  return parts.join(' ')
}
