import { useCallback, useEffect, useRef, useState } from 'react'

interface Countdown {
  /** Segundos restantes, já arredondados para exibição. */
  remaining: number
  running: boolean
  finished: boolean
  start: () => void
  pause: () => void
  reset: (seconds?: number) => void
  /** Segundos efetivamente decorridos desde o início. */
  elapsed: number
}

/**
 * Contagem regressiva ancorada em timestamp em vez de acumular ticks:
 * o iOS congela os timers com a tela apagada, e a âncora garante que o
 * tempo real decorrido continue correto ao voltar.
 */
export function useCountdown(totalSeconds: number, onFinish?: () => void): Countdown {
  const [target, setTarget] = useState(totalSeconds)
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [pausedMs, setPausedMs] = useState(totalSeconds * 1000)
  const [now, setNow] = useState(() => Date.now())
  const finishedRef = useRef(false)
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish

  // O alvo pode mudar se o usuário editar o exercício durante a sessão.
  useEffect(() => {
    setTarget(totalSeconds)
    setEndsAt(null)
    setPausedMs(totalSeconds * 1000)
    finishedRef.current = false
  }, [totalSeconds])

  useEffect(() => {
    if (endsAt === null) return

    const tick = () => setNow(Date.now())
    tick()
    const id = window.setInterval(tick, 200)
    return () => window.clearInterval(id)
  }, [endsAt])

  const remainingMs = endsAt === null ? pausedMs : Math.max(0, endsAt - now)

  useEffect(() => {
    if (endsAt === null || remainingMs > 0 || finishedRef.current) return
    finishedRef.current = true
    setEndsAt(null)
    setPausedMs(0)
    onFinishRef.current?.()
  }, [endsAt, remainingMs])

  const start = useCallback(() => {
    setNow(Date.now())
    setEndsAt(Date.now() + (pausedMs > 0 ? pausedMs : target * 1000))
    if (pausedMs <= 0) finishedRef.current = false
  }, [pausedMs, target])

  const pause = useCallback(() => {
    setPausedMs(remainingMs)
    setEndsAt(null)
  }, [remainingMs])

  const reset = useCallback(
    (seconds?: number) => {
      const next = seconds ?? target
      setTarget(next)
      setEndsAt(null)
      setPausedMs(next * 1000)
      finishedRef.current = false
    },
    [target],
  )

  return {
    remaining: remainingMs / 1000,
    running: endsAt !== null,
    finished: finishedRef.current,
    elapsed: Math.max(0, target - remainingMs / 1000),
    start,
    pause,
    reset,
  }
}
