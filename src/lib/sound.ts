/** Pitido suave: se oye sin asustar en una sala compartida. */
export const MARKER_BEEP_GAIN = 0.028
export const GOAL_BEEP_GAIN = 0.04

function audioContext(): AudioContext | null {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    if (!Ctx) return null
    return new Ctx()
  } catch {
    return null
  }
}

export function playMarkerBeep(): void {
  const ctx = audioContext()
  if (!ctx) return
  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 740
    gain.gain.value = MARKER_BEEP_GAIN
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28)
    osc.stop(ctx.currentTime + 0.3)
    window.setTimeout(() => void ctx.close(), 450)
  } catch {
    // audio optional
  }
}

export function playGoalBeep(): void {
  const ctx = audioContext()
  if (!ctx) return
  try {
    const now = ctx.currentTime
    const gain = ctx.createGain()
    gain.gain.value = GOAL_BEEP_GAIN
    gain.connect(ctx.destination)
    const first = ctx.createOscillator()
    first.type = 'sine'
    first.frequency.value = 620
    first.connect(gain)
    first.start(now)
    first.stop(now + 0.18)
    const second = ctx.createOscillator()
    second.type = 'sine'
    second.frequency.value = 780
    second.connect(gain)
    second.start(now + 0.16)
    second.stop(now + 0.4)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42)
    window.setTimeout(() => void ctx.close(), 600)
  } catch {
    // audio optional
  }
}
