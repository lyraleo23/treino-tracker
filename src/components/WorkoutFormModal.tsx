import { useState } from 'react'
import type { Cycle, Workout } from '../db/db'
import { Modal } from './Modal'

type CycleMode = 'none' | 'date' | 'sessions'

interface Props {
  /** Treino em edição; ausente cria um novo. */
  workout?: Workout
  onSave: (data: { name: string; cycle?: Cycle }) => void
  onClose: () => void
}

/** Data local em YYYY-MM-DD, formato que o input[type=date] espera. */
function toDateInput(ts: number): string {
  const date = new Date(ts)
  const offset = date.getTimezoneOffset() * 60000
  return new Date(ts - offset).toISOString().slice(0, 10)
}

function defaultUntil(): string {
  return toDateInput(Date.now() + 56 * 86400000) // 8 semanas
}

export function WorkoutFormModal({ workout, onSave, onClose }: Props) {
  const [name, setName] = useState(workout?.name ?? '')
  const [mode, setMode] = useState<CycleMode>(workout?.cycle?.kind ?? 'none')
  const [until, setUntil] = useState(
    workout?.cycle?.kind === 'date' ? toDateInput(workout.cycle.until) : defaultUntil(),
  )
  const [target, setTarget] = useState(
    workout?.cycle?.kind === 'sessions' ? workout.cycle.target : 12,
  )

  function buildCycle(): Cycle | undefined {
    if (mode === 'date') {
      // Fim do dia escolhido, senão o ciclo "vence" já pela manhã.
      const until23h59 = new Date(`${until}T23:59:59`).getTime()
      return Number.isFinite(until23h59) ? { kind: 'date', until: until23h59 } : undefined
    }
    if (mode === 'sessions') return { kind: 'sessions', target: Math.max(1, target) }
    return undefined
  }

  return (
    <Modal
      title={workout ? 'Editar treino' : 'Novo treino'}
      onClose={onClose}
      actions={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!name.trim()}
            onClick={() => onSave({ name, cycle: buildCycle() })}
          >
            Salvar
          </button>
        </>
      }
    >
      <div className="stack">
        <div className="field">
          <label className="field__label" htmlFor="workout-name">
            Nome
          </label>
          <input
            id="workout-name"
            className="input"
            value={name}
            autoFocus={!workout}
            placeholder="A · Upper Body 1"
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="field">
          <span className="field__label">Duração do ciclo</span>
          <div className="segmented">
            <button type="button" aria-pressed={mode === 'none'} onClick={() => setMode('none')}>
              Sem fim
            </button>
            <button
              type="button"
              aria-pressed={mode === 'sessions'}
              onClick={() => setMode('sessions')}
            >
              Sessões
            </button>
            <button type="button" aria-pressed={mode === 'date'} onClick={() => setMode('date')}>
              Data
            </button>
          </div>
          <span className="hint">
            O app avisa quando o ciclo termina, mas nunca impede de treinar.
          </span>
        </div>

        {mode === 'sessions' && (
          <div className="field">
            <label className="field__label" htmlFor="workout-target">
              Quantas sessões deste treino
            </label>
            <input
              id="workout-target"
              className="input input--center"
              inputMode="numeric"
              value={target}
              onChange={(event) => setTarget(Number(event.target.value) || 0)}
            />
          </div>
        )}

        {mode === 'date' && (
          <div className="field">
            <label className="field__label" htmlFor="workout-until">
              Válido até
            </label>
            <input
              id="workout-until"
              className="input"
              type="date"
              value={until}
              onChange={(event) => setUntil(event.target.value)}
            />
          </div>
        )}
      </div>
    </Modal>
  )
}
