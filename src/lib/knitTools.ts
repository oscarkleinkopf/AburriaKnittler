/** Herramientas de cálculo para tejer (muestra, aumentos y disminuciones). */

export type ShapeKind = 'increase' | 'decrease'

export type ShapePlan = {
  kind: ShapeKind
  from: number
  to: number
  change: number
  instruction: string
}

/** Reparte `plainCount` puntos liso en `actionCount + 1` huecos (antes, entre y después). */
export function evenSpacing(
  plainCount: number,
  actionCount: number,
): number[] {
  const plain = Math.max(0, Math.round(plainCount))
  const actions = Math.max(0, Math.round(actionCount))
  if (actions === 0) return [plain]
  const buckets = actions + 1
  const sizes: number[] = []
  let used = 0
  for (let i = 0; i < buckets; i += 1) {
    const target = Math.round(((i + 1) * plain) / buckets)
    sizes.push(target - used)
    used = target
  }
  return sizes
}

function derechoPhrase(n: number): string {
  if (n === 1) return '1 derecho'
  return `${n} derechos`
}

function formatParts(
  buckets: number[],
  actionCount: number,
  actionPhrase: string,
): string {
  const bits: string[] = []
  for (let i = 0; i < buckets.length; i += 1) {
    if (buckets[i] > 0) bits.push(derechoPhrase(buckets[i]))
    if (i < actionCount) bits.push(actionPhrase)
  }
  return bits.join(', ')
}

export function planEvenShaping(
  fromStitches: number,
  change: number,
): ShapePlan | { error: string } {
  const from = Math.round(fromStitches)
  const delta = Math.round(change)
  if (!Number.isFinite(from) || from < 2) {
    return { error: 'Indica cuántos puntos tienes ahora (al menos 2).' }
  }
  if (!Number.isFinite(delta) || delta === 0) {
    return { error: 'Indica cuántos puntos aumentar o disminuir (no 0).' }
  }
  if (delta > 0) {
    if (delta > from * 3) {
      return { error: 'Demasiados aumentos para esa cantidad de puntos.' }
    }
    const buckets = evenSpacing(from, delta)
    const instruction = [
      `Aumenta ${delta}: de ${from} a ${from + delta} puntos.`,
      formatParts(buckets, delta, 'aumenta 1'),
    ].join(' ')
    return {
      kind: 'increase',
      from,
      to: from + delta,
      change: delta,
      instruction,
    }
  }
  const dec = -delta
  if (from - dec < 1) {
    return { error: 'No puedes dejar menos de 1 punto.' }
  }
  const plain = from - 2 * dec
  if (plain < 0) {
    return {
      error:
        'Tantas disminuciones no caben en 2 juntos. Baja el número o parte la vuelta.',
    }
  }
  const buckets = evenSpacing(plain, dec)
  const instruction = [
    `Disminuye ${dec}: de ${from} a ${from - dec} puntos.`,
    formatParts(buckets, dec, '2 juntos'),
  ].join(' ')
  return {
    kind: 'decrease',
    from,
    to: from - dec,
    change: -dec,
    instruction,
  }
}

export function countFromGauge(
  countInSwatch: number,
  swatchCm: number,
  targetCm: number,
): number | null {
  if (
    !(countInSwatch > 0) ||
    !(swatchCm > 0) ||
    !(targetCm > 0) ||
    !Number.isFinite(countInSwatch) ||
    !Number.isFinite(swatchCm) ||
    !Number.isFinite(targetCm)
  ) {
    return null
  }
  return Math.max(1, Math.round((countInSwatch / swatchCm) * targetCm))
}
