import { useEffect, useState } from 'react'

/**
 * Tempo decorrido desde uma âncora, em ms. Recalcula a partir do timestamp em
 * vez de acumular ticks, pelo mesmo motivo do `useCountdown`: o iOS congela os
 * timers com a tela apagada, e só a âncora mantém o número certo ao voltar.
 *
 * O intervalo padrão é de 30s de propósito — o valor é lido em minutos, e um
 * tick por segundo só gastaria bateria e disputaria atenção com o cronômetro de
 * descanso entre séries.
 */
export function useElapsed(since: number | undefined, everyMs = 30000): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (since === undefined) return

    const tick = () => setNow(Date.now())
    tick()
    const id = window.setInterval(tick, everyMs)

    // Voltar do bloqueio de tela precisa do acerto na hora, não do próximo tick.
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [since, everyMs])

  if (since === undefined) return 0
  return Math.max(0, now - since)
}
