/** Herramientas de cálculo para tejer (muestra, aumentos y disminuciones). */

export type ShapeKind = 'increase' | 'decrease'

export type IncreaseStitch = 'm1' | 'yo' | 'kfb'
export type DecreaseStitch = 'k2tog' | 'ssk'
export type ShapeStitch = IncreaseStitch | DecreaseStitch

export const INCREASE_STITCHES: Array<{ id: IncreaseStitch; label: string }> = [
  { id: 'm1', label: 'Aumenta 1 (M1)' },
  { id: 'yo', label: 'Lazada' },
  { id: 'kfb', label: 'Por delante y por detrás' },
]

export const DECREASE_STITCHES: Array<{ id: DecreaseStitch; label: string }> = [
  { id: 'k2tog', label: '2 juntos derecho' },
  { id: 'ssk', label: '2 juntos revés (SSK)' },
]

export type ShapePlan = {
  kind: ShapeKind
  from: number
  to: number
  change: number
  stitch: ShapeStitch
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

function increasePhrase(stitch: IncreaseStitch): string {
  if (stitch === 'yo') return 'lazada'
  if (stitch === 'kfb') return 'punto por delante y detrás'
  return 'aumenta 1 (M1)'
}

function decreasePhrase(stitch: DecreaseStitch): string {
  if (stitch === 'ssk') return '2 juntos revés (SSK)'
  return '2 juntos derecho'
}

function resolveIncrease(stitch: ShapeStitch | undefined): IncreaseStitch {
  if (stitch === 'yo' || stitch === 'kfb' || stitch === 'm1') return stitch
  return 'm1'
}

function resolveDecrease(stitch: ShapeStitch | undefined): DecreaseStitch {
  if (stitch === 'ssk' || stitch === 'k2tog') return stitch
  return 'k2tog'
}

export function planEvenShaping(
  fromStitches: number,
  change: number,
  stitch?: ShapeStitch,
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
    const inc = resolveIncrease(stitch)
    if (inc === 'kfb' && delta > from) {
      return {
        error:
          'Hace falta un punto por cada aumento por delante y por detrás.',
      }
    }
    if (inc !== 'kfb' && delta > from * 3) {
      return { error: 'Demasiados aumentos para esa cantidad de puntos.' }
    }
    const plain = inc === 'kfb' ? from - delta : from
    const buckets = evenSpacing(plain, delta)
    const instruction = [
      `Aumenta ${delta}: de ${from} a ${from + delta} puntos.`,
      formatParts(buckets, delta, increasePhrase(inc)),
    ].join(' ')
    return {
      kind: 'increase',
      from,
      to: from + delta,
      change: delta,
      stitch: inc,
      instruction,
    }
  }
  const decStitch = resolveDecrease(stitch)
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
    formatParts(buckets, dec, decreasePhrase(decStitch)),
  ].join(' ')
  return {
    kind: 'decrease',
    from,
    to: from - dec,
    change: -dec,
    stitch: decStitch,
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

/** Metros de lana para un rectángulo, a partir de los metros de la muestra. */
export function estimateYarnMeters(
  swatchMeters: number,
  swatchCm: number,
  widthCm: number,
  lengthCm: number,
): number | null {
  if (
    !(swatchMeters > 0) ||
    !(swatchCm > 0) ||
    !(widthCm > 0) ||
    !(lengthCm > 0) ||
    !Number.isFinite(swatchMeters) ||
    !Number.isFinite(swatchCm) ||
    !Number.isFinite(widthCm) ||
    !Number.isFinite(lengthCm)
  ) {
    return null
  }
  const meters =
    (swatchMeters * widthCm * lengthCm) / (swatchCm * swatchCm)
  return Math.max(0.1, Math.round(meters * 10) / 10)
}

export function formatMeters(n: number): string {
  const rounded = Math.round(n * 10) / 10
  const text = Number.isInteger(rounded)
    ? String(rounded)
    : String(rounded).replace('.', ',')
  return `${text} m`
}
