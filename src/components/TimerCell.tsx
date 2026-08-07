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
  /**
   * Mostra o tempo parado como minutos e segundos em vez de um campo só de
   * segundos. Num trecho de esteira "4 : 00" é o que se lê no painel; num
   * bloco de prancha, "60 s" é o que se pensa.
   */
  splitMinutes?: boolean
}

/** 263 → { min: '4', sec: '23' }; vazio devolve campos vazios. */
function toMinSec(value: string): { min: string; sec: string } {
  const total = Number(value)
  if (!value.trim() || !Number.isFinite(total)) return { min: '', sec: '' }
  const rounded = Math.max(0, Math.round(total))
  return {
    min: String(Math.floor(rounded / 60)),
    sec: String(rounded % 60).padStart(2, '0'),
  }
}

function fromMinSec(min: string, sec: string): string {
  const minutes = Number(min.replace(',', '.')) || 0
  const seconds = Number(sec.replace(',', '.')) || 0
  const total = Math.round(minutes * 60 + seconds)
  return total > 0 ? String(total) : ''
}

/**
 * Campo de tempo com cronômetro embutido: enquanto parado é um input comum;
 * ao iniciar vira contagem regressiva e devolve o tempo real executado.
 */
export function TimerCell({
  targetSeconds,
  value,
  onChange,
  disabled,
  splitMinutes,
}: Props) {
  const countdown = useCountdown(targetSeconds, () => {
    beep()
    vibrate()
    onChange(String(targetSeconds))
    countdown.reset()
  })

  useWakeLock(countdown.running)

  const started = countdown.running || countdown.remaining < targetSeconds - 0.05

  if (!started) {
    const { min, sec } = toMinSec(value)

    return (
      <div className="timer">
        {splitMinutes ? (
          <div className="timer__minsec">
            <input
              className="input input--center"
              inputMode="numeric"
              value={min}
              disabled={disabled}
              aria-label="Minutos executados"
              onChange={(event) => onChange(fromMinSec(event.target.value, sec))}
            />
            <span className="timer__colon">:</span>
            <input
              className="input input--center"
              inputMode="numeric"
              value={sec}
              disabled={disabled}
              aria-label="Segundos executados"
              onChange={(event) => onChange(fromMinSec(min, event.target.value))}
            />
          </div>
        ) : (
          <input
            className="input input--center"
            inputMode="numeric"
            value={value}
            disabled={disabled}
            aria-label="Segundos executados"
            onChange={(event) => onChange(event.target.value)}
          />
        )}
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
