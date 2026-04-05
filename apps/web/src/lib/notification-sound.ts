/**
 * Synthesized notification chime using the Web Audio API.
 * No external audio files needed — generates a two-note crystal ping.
 */

function playTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  peakGain: number,
) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  // Add a subtle harmonic for richness
  const osc2 = ctx.createOscillator()
  const gain2 = ctx.createGain()

  osc.connect(gain)
  osc2.connect(gain2)
  gain.connect(ctx.destination)
  gain2.connect(ctx.destination)

  osc.type = 'sine'
  osc.frequency.value = freq

  osc2.type = 'sine'
  osc2.frequency.value = freq * 2 // octave harmonic

  // Attack → sustain → release envelope
  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.012)
  gain.gain.exponentialRampToValueAtTime(peakGain * 0.4, startTime + duration * 0.4)
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)

  gain2.gain.setValueAtTime(0, startTime)
  gain2.gain.linearRampToValueAtTime(peakGain * 0.18, startTime + 0.012)
  gain2.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.6)

  osc.start(startTime)
  osc.stop(startTime + duration)
  osc2.start(startTime)
  osc2.stop(startTime + duration * 0.6)
}

export function playNotificationSound(volume = 0.45) {
  if (typeof window === 'undefined') { return }
  try {
    const ctx = new AudioContext()
    const t = ctx.currentTime

    // Two-note ascending chime: E5 → B5 (a bright, friendly sound)
    playTone(ctx, 659.25, t,        0.45, volume)        // E5
    playTone(ctx, 987.77, t + 0.12, 0.38, volume * 0.85) // B5

    // Clean up after both notes finish
    setTimeout(() => ctx.close().catch(() => null), 1200)
  } catch {
    // AudioContext not available (e.g. SSR / headless test env)
  }
}

export function playMentionSound(volume = 0.5) {
  if (typeof window === 'undefined') { return }
  try {
    const ctx = new AudioContext()
    const t = ctx.currentTime

    // Three ascending notes for mentions: C5 → E5 → G5
    playTone(ctx, 523.25, t,        0.35, volume)
    playTone(ctx, 659.25, t + 0.10, 0.32, volume * 0.9)
    playTone(ctx, 783.99, t + 0.20, 0.28, volume * 0.8)

    setTimeout(() => ctx.close().catch(() => null), 1500)
  } catch {
    // ignore
  }
}
