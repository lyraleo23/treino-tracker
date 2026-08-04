import { useCountdown } from '../hooks/useCountdown'
import { useWakeLock } from '../hooks/useWakeLock'
import { beep, primeAudio, vibrate } from '../lib/feedback'
import { formatClock } from '../lib/format'
import { PauseIcon, PlayIcon, ResetIcon } from './icons'

interface Props {
  targetSeconds: number
  /** Segundos executados, como texto (o mesmo estado dos outros campos). */
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

/**
 * Campo de tempo com cronômetro embutido: enquanto parado é um input comum;
 * ao iniciar vira contagem regressiva e devolve o tempo real executado.
 */
export function TimerCell({ targetSeconds, value, onChange, disabled }: Props) {
  const countdown = useCountdown(targetSeconds, () => {
    beep()
    vibrate()
    onChange(String(targetSeconds))
    countdown.reset()
  })

  useWakeLock(countdown.running)

  const started = countdown.running || countdown.remaining < targetSeconds - 0.05

  if (!started) {
    return (
      <div className="timer">
        <input
          className="input input--center"
          inputMode="numeric"
          value={value}
          disabled={disabled}
          aria-label="Segundos executados"
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className="btn btn--icon"
          aria-label="Iniciar cronômetro"
          disabled={disabled}
          onClick={() => {
            primeAudio()
            countdown.start()
          }}
        >
          <PlayIcon />
        </button>
      </div>
    )
  }

  return (
    <div className="timer">
      {/* Rodando mostra o que falta; pausado mostra o que já foi feito, que é
          exatamente o valor que o ✓ vai registrar. */}
      <div
        className={countdown.running ? 'timer__display is-running' : 'timer__display is-done'}
        aria-label={countdown.running ? 'Tempo restante' : 'Tempo executado'}
      >
        {countdown.running
          ? formatClock(countdown.remaining)
          : `${formatClock(Math.round(countdown.elapsed))} feito`}
      </div>
      <button
        type="button"
        className="btn btn--icon"
        aria-label={countdown.running ? 'Pausar' : 'Retomar'}
        onClick={() => {
          if (countdown.running) {
            countdown.pause()
            onChange(String(Math.round(countdown.elapsed)))
          } else {
            primeAudio()
            countdown.start()
          }
        }}
      >
        {countdown.running ? <PauseIcon /> : <PlayIcon />}
      </button>
      <button
        type="button"
        className="btn btn--icon btn--ghost"
        aria-label="Zerar cronômetro"
        onClick={() => {
          countdown.reset()
          onChange(String(targetSeconds))
        }}
      >
        <ResetIcon />
      </button>
    </div>
  )
}
