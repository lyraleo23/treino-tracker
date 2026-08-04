import { useEffect } from 'react'

/**
 * Mantém a tela ligada enquanto o cronômetro roda (Safari iOS 16.4+).
 * O bloqueio cai quando o app vai para segundo plano, então é repedido ao voltar.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return

    let sentinel: WakeLockSentinel | null = null
    let released = false

    const request = async () => {
      try {
        const lock = await navigator.wakeLock.request('screen')
        if (released) {
          void lock.release()
          return
        }
        sentinel = lock
      } catch {
        // Bateria baixa ou permissão negada: seguir sem manter a tela ligada.
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !released) void request()
    }

    void request()
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      released = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      void sentinel?.release().catch(() => {})
    }
  }, [active])
}
