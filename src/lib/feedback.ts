let audioContext: AudioContext | null = null

/**
 * O iOS só libera áudio depois de um gesto do usuário, então o contexto é
 * criado/retomado no toque que inicia o cronômetro.
 */
export function primeAudio(): void {
  try {
    audioContext ??= new AudioContext()
    if (audioContext.state === 'suspended') void audioContext.resume()
  } catch {
    audioContext = null
  }
}

/** Bipe curto ao terminar a contagem. Silencioso se o navegador não deixar. */
export function beep(times = 2): void {
  if (!audioContext) return

  const ctx = audioContext
  for (let i = 0; i < times; i += 1) {
    const start = ctx.currentTime + i * 0.28
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22)

    oscillator.connect(gain).connect(ctx.destination)
    oscillator.start(start)
    oscillator.stop(start + 0.24)
  }
}

/** Vibração onde houver suporte (Android); no iOS é um no-op silencioso. */
export function vibrate(pattern: number | number[] = [120, 60, 120]): void {
  if ('vibrate' in navigator) navigator.vibrate(pattern)
}
